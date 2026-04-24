const express = require('express');
const path = require('path');
const { createLogger, config } = require('@dls/common');

const logger = createLogger('dashboard');
const app = express();
const PORT = config.ports.dashboard;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  logger.info(`Dashboard running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
