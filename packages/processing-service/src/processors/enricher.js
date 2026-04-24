/**
 * Enriches a log entry with additional metadata.
 * Normalizes fields and adds processing timestamp.
 *
 * @param {object} logEntry - Raw log entry from Redis Stream
 * @returns {object} Enriched log entry
 */
function enrich(logEntry) {
  return {
    ...logEntry,
    // Normalize level to lowercase
    level: (logEntry.level || 'info').toLowerCase(),
    // Normalize source
    source: (logEntry.source || 'unknown').trim().toLowerCase(),
    // Ensure timestamp is valid ISO string
    timestamp: logEntry.timestamp || new Date().toISOString(),
    // Add processing timestamp
    processed_at: new Date().toISOString(),
    // Trim message
    message: (logEntry.message || '').trim(),
    // Ensure environment is valid
    environment: ['development', 'staging', 'production'].includes(logEntry.environment)
      ? logEntry.environment
      : 'development',
  };
}

module.exports = { enrich };
