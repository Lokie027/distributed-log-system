const { getDb } = require('@dls/common');

/**
 * Batch insert processed log entries into PostgreSQL.
 *
 * @param {object[]} logs - Array of enriched log objects
 * @param {import('pino').Logger} logger
 * @returns {number} Number of rows inserted
 */
async function batchInsert(logs, logger) {
  if (logs.length === 0) return 0;

  const db = getDb();

  const rows = logs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp,
    level: log.level,
    source: log.source,
    message: log.message,
    metadata: JSON.stringify(log.metadata || {}),
    tags: log.tags || [],
    environment: log.environment || 'development',
    processed_at: log.processed_at || new Date().toISOString(),
  }));

  try {
    await db('logs').insert(rows);
    logger.debug(`Inserted ${rows.length} logs into PostgreSQL`);
    return rows.length;
  } catch (err) {
    // Handle duplicate key errors gracefully (idempotency)
    if (err.code === '23505') {
      logger.warn(`Duplicate log entries detected, inserting individually...`);
      let inserted = 0;
      for (const row of rows) {
        try {
          await db('logs').insert(row).onConflict('id').ignore();
          inserted++;
        } catch (innerErr) {
          logger.error({ err: innerErr, logId: row.id }, 'Failed to insert log');
        }
      }
      return inserted;
    }
    throw err;
  }
}

module.exports = { batchInsert };
