const express = require('express');
const { getStats } = require('../services/log-query');

const router = express.Router();

/**
 * GET /api/stats
 * Aggregated log statistics.
 */
router.get('/', async (req, res, next) => {
  try {
    const stats = await getStats();
    return res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
