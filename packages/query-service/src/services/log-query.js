const { getDb } = require('@dls/common');

/**
 * Search logs with full-text search and filters.
 *
 * @param {object} params - Search parameters
 * @returns {object} { logs, total, page, limit }
 */
async function searchLogs(params) {
  const db = getDb();
  const { q, level, source, environment, from, to, tags, page, limit } = params;

  let query = db('logs').select('*');
  let countQuery = db('logs').count('* as total');

  // Full-text search on message
  if (q && q.trim()) {
    const searchCondition = "to_tsvector('english', message) @@ plainto_tsquery('english', ?)";
    query = query.whereRaw(searchCondition, [q]);
    countQuery = countQuery.whereRaw(searchCondition, [q]);
  }

  // Filters
  if (level) {
    query = query.where('level', level);
    countQuery = countQuery.where('level', level);
  }

  if (source) {
    query = query.where('source', source);
    countQuery = countQuery.where('source', source);
  }

  if (environment) {
    query = query.where('environment', environment);
    countQuery = countQuery.where('environment', environment);
  }

  if (from) {
    query = query.where('timestamp', '>=', from);
    countQuery = countQuery.where('timestamp', '>=', from);
  }

  if (to) {
    query = query.where('timestamp', '<=', to);
    countQuery = countQuery.where('timestamp', '<=', to);
  }

  if (tags) {
    const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagArray.length > 0) {
      query = query.whereRaw('tags && ?', [tagArray]);
      countQuery = countQuery.whereRaw('tags && ?', [tagArray]);
    }
  }

  // Pagination
  const offset = (page - 1) * limit;
  query = query.orderBy('timestamp', 'desc').limit(limit).offset(offset);

  // Execute both queries
  const [logs, [{ total }]] = await Promise.all([query, countQuery]);

  return {
    logs,
    total: parseInt(total, 10),
    page,
    limit,
    totalPages: Math.ceil(parseInt(total, 10) / limit),
  };
}

/**
 * Get a single log by ID.
 *
 * @param {string} id - Log UUID
 * @returns {object|null}
 */
async function getLogById(id) {
  const db = getDb();
  return db('logs').where('id', id).first();
}

/**
 * Get aggregated statistics.
 *
 * @returns {object} Stats object
 */
async function getStats() {
  const db = getDb();

  const [totalResult] = await db('logs').count('* as total');
  const total = parseInt(totalResult.total, 10);

  // Counts by level
  const levelCounts = await db('logs')
    .select('level')
    .count('* as count')
    .groupBy('level')
    .orderBy('count', 'desc');

  // Top sources
  const topSources = await db('logs')
    .select('source')
    .count('* as count')
    .groupBy('source')
    .orderBy('count', 'desc')
    .limit(10);

  // Logs per hour (last 24 hours)
  const logsPerHour = await db.raw(`
    SELECT
      date_trunc('hour', timestamp) as hour,
      COUNT(*) as count
    FROM logs
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
    GROUP BY date_trunc('hour', timestamp)
    ORDER BY hour ASC
  `);

  // Error rate
  const errorCount = levelCounts
    .filter((l) => ['error', 'fatal'].includes(l.level))
    .reduce((sum, l) => sum + parseInt(l.count, 10), 0);
  const errorRate = total > 0 ? ((errorCount / total) * 100).toFixed(2) : 0;

  // Recent activity (logs in last minute)
  const [recentResult] = await db('logs')
    .count('* as count')
    .where('timestamp', '>=', db.raw("NOW() - INTERVAL '1 minute'"));

  return {
    total,
    errorRate: parseFloat(errorRate),
    logsPerMinute: parseInt(recentResult.count, 10),
    activeSources: topSources.length,
    levelCounts: levelCounts.map((l) => ({
      level: l.level,
      count: parseInt(l.count, 10),
    })),
    topSources: topSources.map((s) => ({
      source: s.source,
      count: parseInt(s.count, 10),
    })),
    logsPerHour: logsPerHour.rows.map((r) => ({
      hour: r.hour,
      count: parseInt(r.count, 10),
    })),
  };
}

module.exports = { searchLogs, getLogById, getStats };
