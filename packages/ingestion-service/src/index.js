const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createLogger, getRedisClient, closeAllRedis, config } = require('@dls/common');

const logsRouter = require('./routes/logs');

const logger = createLogger('ingestion-service');
const app = express();
const PORT = config.ports.ingestion;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rate limiting: 200 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

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
app.use('/api/logs', logsRouter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const redis = getRedisClient();
    await redis.ping();
    res.json({
      status: 'healthy',
      service: 'ingestion-service',
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

// --- Server ---
const server = app.listen(PORT, () => {
  logger.info(`Ingestion service running on http://localhost:${PORT}`);
});

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await closeAllRedis();
    logger.info('Ingestion service stopped.');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
