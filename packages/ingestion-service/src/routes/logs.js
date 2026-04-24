const express = require('express');
const { LogEventSchema, BatchLogSchema } = require('@dls/common');
const { produceLog, produceLogBatch } = require('../producers/stream-producer');

const router = express.Router();

/**
 * POST /api/logs
 * Ingest a single log event.
 */
router.post('/', async (req, res, next) => {
  try {
    const parsed = LogEventSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await produceLog(parsed.data);

    return res.status(201).json({
      message: 'Log ingested successfully',
      id: result.id,
      streamEntryId: result.entryId,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/logs/batch
 * Ingest multiple log events (max 100).
 */
router.post('/batch', async (req, res, next) => {
  try {
    const parsed = BatchLogSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const results = await produceLogBatch(parsed.data.logs);

    return res.status(201).json({
      message: `${results.length} logs ingested successfully`,
      count: results.length,
      ids: results.map((r) => r.id),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
