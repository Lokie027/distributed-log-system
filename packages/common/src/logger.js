const pino = require('pino');
const config = require('./config');

/**
 * Creates a structured JSON logger using pino.
 * @param {string} serviceName - Name of the service (e.g., 'ingestion-service')
 * @returns {import('pino').Logger}
 */
function createLogger(serviceName) {
  return pino({
    name: serviceName,
    level: config.env === 'production' ? 'info' : 'debug',
    transport:
      config.env === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  });
}

module.exports = { createLogger };
