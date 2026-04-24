const os = require('os');
const {
  createLogger,
  getPublisher,
  closeAllRedis,
  closeDb,
  config,
} = require('@dls/common');
const {
  ensureConsumerGroup,
  readMessages,
  acknowledgeMessages,
  claimStaleMessages,
} = require('./consumer');
const { enrich } = require('./processors/enricher');
const { classify } = require('./processors/classifier');
const { batchInsert } = require('./storage/pg-writer');

const logger = createLogger('processing-service');
const consumerName = `processor-${os.hostname()}-${process.pid}`;

let running = true;
let messageBuffer = [];
let flushTimer = null;

const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 2000;
const CLAIM_INTERVAL_MS = 30000;

/**
 * Flush the message buffer to PostgreSQL and publish to live channel.
 */
async function flushBuffer() {
  if (messageBuffer.length === 0) return;

  const batch = messageBuffer.splice(0);
  const entryIds = batch.map((m) => m.entryId);

  try {
    // Batch insert into PostgreSQL
    const inserted = await batchInsert(batch, logger);
    logger.info(`Flushed ${inserted} logs to PostgreSQL`);

    // Acknowledge in Redis
    await acknowledgeMessages(entryIds);

    // Publish to live channel for real-time streaming
    const publisher = getPublisher();
    for (const log of batch) {
      await publisher.publish(
        config.pubsub.liveChannel,
        JSON.stringify({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level,
          source: log.source,
          message: log.message,
          metadata: log.metadata,
          tags: log.tags,
          environment: log.environment,
        })
      );
    }
  } catch (err) {
    logger.error({ err }, 'Failed to flush buffer');
    // Put messages back into buffer for retry
    messageBuffer.unshift(...batch);
  }
}

/**
 * Process a batch of messages through the enrichment pipeline.
 */
function processMessages(messages) {
  const processed = [];

  for (const msg of messages) {
    try {
      // Step 1: Enrich
      const enriched = enrich(msg);

      // Step 2: Classify
      const classification = classify(enriched);

      if (classification.isError) {
        logger.warn(
          { source: enriched.source, level: enriched.level },
          `Error-level log from ${enriched.source}: ${enriched.message.substring(0, 100)}`
        );
      }

      if (classification.requiresAlert) {
        logger.error(
          { source: enriched.source },
          `FATAL log detected from ${enriched.source} — alerting needed`
        );
      }

      processed.push(enriched);
    } catch (err) {
      logger.error({ err, entryId: msg.entryId }, 'Failed to process message');
    }
  }

  return processed;
}

/**
 * Main consumer loop.
 */
async function runConsumerLoop() {
  logger.info(`Starting consumer: ${consumerName}`);

  await ensureConsumerGroup(logger);

  // Set up periodic flush timer
  flushTimer = setInterval(async () => {
    if (messageBuffer.length > 0) {
      logger.debug(`Timer flush: ${messageBuffer.length} messages in buffer`);
      await flushBuffer();
    }
  }, FLUSH_INTERVAL_MS);

  // Set up periodic stale message claiming
  const claimTimer = setInterval(async () => {
    try {
      const stale = await claimStaleMessages(consumerName);
      if (stale && stale.length > 0) {
        logger.info(`Claimed ${stale.length} stale messages`);
        const processed = processMessages(stale);
        messageBuffer.push(...processed);
      }
    } catch (err) {
      logger.error({ err }, 'Error claiming stale messages');
    }
  }, CLAIM_INTERVAL_MS);

  // Main read loop
  while (running) {
    try {
      const messages = await readMessages(consumerName, BATCH_SIZE, 5000);

      if (messages && messages.length > 0) {
        logger.debug(`Read ${messages.length} messages from stream`);
        const processed = processMessages(messages);
        messageBuffer.push(...processed);

        // Flush if buffer exceeds batch size
        if (messageBuffer.length >= BATCH_SIZE) {
          await flushBuffer();
        }
      }
    } catch (err) {
      if (running) {
        logger.error({ err }, 'Error in consumer loop');
        // Backoff on error
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  // Cleanup
  clearInterval(flushTimer);
  clearInterval(claimTimer);

  // Final flush
  if (messageBuffer.length > 0) {
    logger.info(`Final flush: ${messageBuffer.length} messages`);
    await flushBuffer();
  }
}

// --- Start ---
runConsumerLoop().catch((err) => {
  logger.fatal({ err }, 'Consumer loop crashed');
  process.exit(1);
});

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  running = false;

  // Give time for current read to complete
  await new Promise((resolve) => setTimeout(resolve, 6000));

  await closeAllRedis();
  await closeDb();
  logger.info('Processing service stopped.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
