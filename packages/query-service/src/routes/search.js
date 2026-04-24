const express = require('express');
const { SearchQuerySchema } = require('@dls/common');
const { searchLogs, getLogById } = require('../services/log-query');

const router = express.Router();

/**
 * GET /api/search
 * Full-text search with filters and pagination.
 */
router.get('/', async (req, res, next) => {
  try {
    const parsed = SearchQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const results = await searchLogs(parsed.data);
    return res.json(results);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/search/:id
 * Get a single log by ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const log = await getLogById(req.params.id);

    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    return res.json(log);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
