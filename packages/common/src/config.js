const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // PostgreSQL
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'dlsuser',
    password: process.env.DB_PASSWORD || 'dlspassword',
    database: process.env.DB_NAME || 'distributed_logs',
    connectionString: process.env.DATABASE_URL || 'postgresql://dlsuser:dlspassword@localhost:5432/distributed_logs',
  },

  // Service Ports
  ports: {
    ingestion: parseInt(process.env.INGESTION_PORT, 10) || 3001,
    query: parseInt(process.env.QUERY_PORT, 10) || 3003,
    dashboard: parseInt(process.env.DASHBOARD_PORT, 10) || 3000,
  },

  // Redis Streams
  stream: {
    name: process.env.STREAM_NAME || 'stream:raw-logs',
    consumerGroup: process.env.CONSUMER_GROUP || 'log-processors',
    maxLen: parseInt(process.env.STREAM_MAX_LEN, 10) || 100000,
  },

  // Pub/Sub
  pubsub: {
    liveChannel: 'channel:live-logs',
  },

  // Retention
  retention: {
    days: parseInt(process.env.LOG_RETENTION_DAYS, 10) || 30,
  },
};

module.exports = config;
