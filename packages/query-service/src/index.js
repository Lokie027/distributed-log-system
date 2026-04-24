const express = require('express');
const cors = require('cors');
const http = require('http');
const {
  createLogger,
  getDb,
  closeDb,
  closeAllRedis,
  config,
} = require('@dls/common');

const searchRouter = require('./routes/search');
const statsRouter = require('./routes/stats');
const { setupWebSocket } = require('./routes/stream');

const logger = createLogger('query-service');
const app = express();
const PORT = config.ports.query;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// --- Routes ---
app.use('/api/search', searchRouter);
app.use('/api/stats', statsRouter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const db = getDb();
    await db.raw('SELECT 1');
    res.json({
      status: 'healthy',
      service: 'query-service',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      error: err.message,
    });
  }
});

// Error handler
app.use((err, req, res, _next) => {
  logger.error({ err, url: req.originalUrl }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    message: config.env === 'development' ? err.message : undefined,
  });
});

// --- Server with WebSocket ---
const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  logger.info(`Query service running on http://localhost:${PORT}`);
  logger.info(`WebSocket live tail on ws://localhost:${PORT}/api/stream`);
});

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await closeAllRedis();
    await closeDb();
    logger.info('Query service stopped.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
