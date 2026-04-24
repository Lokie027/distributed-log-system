const Redis = require('ioredis');
const config = require('./config');

let client = null;
let subscriber = null;
let publisher = null;

/**
 * Get or create the main Redis client (for streams, general commands).
 * @returns {import('ioredis').Redis}
 */
function getRedisClient() {
  if (!client) {
    client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      lazyConnect: false,
    });

    client.on('error', (err) => {
      console.error('[Redis] Client error:', err.message);
    });

    client.on('connect', () => {
      console.log('[Redis] Connected');
    });
  }
  return client;
}

/**
 * Get a dedicated Redis client for Pub/Sub subscribing.
 * Pub/Sub subscribers cannot run other commands, so we need a separate connection.
 * @returns {import('ioredis').Redis}
 */
function getSubscriber() {
  if (!subscriber) {
    subscriber = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
    });
    subscriber.on('error', (err) => {
      console.error('[Redis Subscriber] Error:', err.message);
    });
  }
  return subscriber;
}

/**
 * Get a dedicated Redis client for Pub/Sub publishing.
 * @returns {import('ioredis').Redis}
 */
function getPublisher() {
  if (!publisher) {
    publisher = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
    });
    publisher.on('error', (err) => {
      console.error('[Redis Publisher] Error:', err.message);
    });
  }
  return publisher;
}

/**
 * Gracefully close all Redis connections.
 */
async function closeAllRedis() {
  const connections = [client, subscriber, publisher].filter(Boolean);
  await Promise.all(connections.map((c) => c.quit()));
  client = null;
  subscriber = null;
  publisher = null;
}

module.exports = {
  getRedisClient,
  getSubscriber,
  getPublisher,
  closeAllRedis,
};
