const { getRedisClient } = require('@dls/common');
const config = require('@dls/common/src/config');

/**
 * Ensures the consumer group exists for the stream.
 * Creates the stream and group if they don't exist.
 */
async function ensureConsumerGroup(logger) {
  const redis = getRedisClient();
  const { name: streamName, consumerGroup } = config.stream;

  try {
    await redis.xgroup('CREATE', streamName, consumerGroup, '0', 'MKSTREAM');
    logger.info(`Created consumer group "${consumerGroup}" on stream "${streamName}"`);
  } catch (err) {
    if (err.message.includes('BUSYGROUP')) {
      logger.debug(`Consumer group "${consumerGroup}" already exists`);
    } else {
      throw err;
    }
  }
}

/**
 * Reads new messages from the Redis Stream using XREADGROUP.
 *
 * @param {string} consumerName - Unique consumer name within the group
 * @param {number} count - Max messages to read per call
 * @param {number} blockMs - Block time in milliseconds (0 = don't block)
 * @returns {object[]|null} Array of parsed messages, or null if no messages
 */
async function readMessages(consumerName, count = 50, blockMs = 5000) {
  const redis = getRedisClient();
  const { name: streamName, consumerGroup } = config.stream;

  const results = await redis.xreadgroup(
    'GROUP',
    consumerGroup,
    consumerName,
    'COUNT',
    count,
    'BLOCK',
    blockMs,
    'STREAMS',
    streamName,
    '>' // Read only new messages not yet delivered to this group
  );

  if (!results || results.length === 0) {
    return null;
  }

  // Parse the Redis stream entries into objects
  const [, entries] = results[0];

  return entries.map(([entryId, fields]) => {
    const data = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }

    // Parse JSON fields back to objects
    try {
      data.metadata = JSON.parse(data.metadata || '{}');
    } catch {
      data.metadata = {};
    }
    try {
      data.tags = JSON.parse(data.tags || '[]');
    } catch {
      data.tags = [];
    }

    return {
      entryId,
      ...data,
    };
  });
}

/**
 * Acknowledge messages after successful processing.
 *
 * @param {string[]} entryIds - Array of Redis stream entry IDs to acknowledge
 */
async function acknowledgeMessages(entryIds) {
  if (entryIds.length === 0) return;

  const redis = getRedisClient();
  const { name: streamName, consumerGroup } = config.stream;

  await redis.xack(streamName, consumerGroup, ...entryIds);
}

/**
 * Claim stale pending messages that haven't been acknowledged.
 * This handles cases where a consumer crashed before ACKing.
 *
 * @param {string} consumerName - Consumer to assign the messages to
 * @param {number} minIdleMs - Minimum idle time before claiming (default 60s)
 * @param {number} count - Max messages to claim
 * @returns {object[]|null} Array of claimed messages
 */
async function claimStaleMessages(consumerName, minIdleMs = 60000, count = 20) {
  const redis = getRedisClient();
  const { name: streamName, consumerGroup } = config.stream;

  try {
    const results = await redis.xautoclaim(
      streamName,
      consumerGroup,
      consumerName,
      minIdleMs,
      '0-0',
      'COUNT',
      count
    );

    if (!results || !results[1] || results[1].length === 0) {
      return null;
    }

    return results[1].map(([entryId, fields]) => {
      const data = {};
      for (let i = 0; i < fields.length; i += 2) {
        data[fields[i]] = fields[i + 1];
      }

      try {
        data.metadata = JSON.parse(data.metadata || '{}');
      } catch {
        data.metadata = {};
      }
      try {
        data.tags = JSON.parse(data.tags || '[]');
      } catch {
        data.tags = [];
      }

      return { entryId, ...data };
    });
  } catch (err) {
    // XAUTOCLAIM may not be available in older Redis versions
    return null;
  }
}

module.exports = {
  ensureConsumerGroup,
  readMessages,
  acknowledgeMessages,
  claimStaleMessages,
};
