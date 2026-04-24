const { v4: uuidv4 } = require('uuid');
const { getRedisClient } = require('@dls/common');
const config = require('@dls/common/src/config');

/**
 * Produces a log event to the Redis Stream.
 * Uses XADD with MAXLEN ~ to auto-trim the stream.
 *
 * @param {object} logEvent - Validated log event object
 * @returns {string} Redis stream entry ID
 */
async function produceLog(logEvent) {
  const redis = getRedisClient();
  const streamName = config.stream.name;
  const maxLen = config.stream.maxLen;

  const id = uuidv4();

  const entryId = await redis.xadd(
    streamName,
    'MAXLEN',
    '~',
    maxLen,
    '*',
    'id', id,
    'timestamp', logEvent.timestamp,
    'level', logEvent.level,
    'source', logEvent.source,
    'message', logEvent.message,
    'metadata', JSON.stringify(logEvent.metadata),
    'tags', JSON.stringify(logEvent.tags),
    'environment', logEvent.environment
  );

  return { id, entryId };
}

/**
 * Produces multiple log events to the Redis Stream using a pipeline.
 *
 * @param {object[]} logEvents - Array of validated log event objects
 * @returns {object[]} Array of { id, entryId }
 */
async function produceLogBatch(logEvents) {
  const redis = getRedisClient();
  const streamName = config.stream.name;
  const maxLen = config.stream.maxLen;

  const pipeline = redis.pipeline();
  const ids = [];

  for (const logEvent of logEvents) {
    const id = uuidv4();
    ids.push(id);

    pipeline.xadd(
      streamName,
      'MAXLEN',
      '~',
      maxLen,
      '*',
      'id', id,
      'timestamp', logEvent.timestamp,
      'level', logEvent.level,
      'source', logEvent.source,
      'message', logEvent.message,
      'metadata', JSON.stringify(logEvent.metadata),
      'tags', JSON.stringify(logEvent.tags),
      'environment', logEvent.environment
    );
  }

  const results = await pipeline.exec();

  return results.map((result, index) => ({
    id: ids[index],
    entryId: result[1],
  }));
}

module.exports = { produceLog, produceLogBatch };
