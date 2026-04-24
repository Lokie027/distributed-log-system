const { z } = require('zod');

/**
 * Zod schema for validating incoming log events.
 */
const LogEventSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']),
  source: z
    .string()
    .min(1, 'Source is required')
    .max(255, 'Source must be 255 characters or less'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(10000, 'Message must be 10,000 characters or less'),
  metadata: z.record(z.any()).optional().default({}),
  tags: z.array(z.string().max(50)).optional().default([]),
  environment: z
    .enum(['development', 'staging', 'production'])
    .optional()
    .default('development'),
  timestamp: z
    .string()
    .datetime()
    .optional()
    .default(() => new Date().toISOString()),
});

/**
 * Schema for batch log ingestion.
 */
const BatchLogSchema = z.object({
  logs: z
    .array(LogEventSchema)
    .min(1, 'At least one log entry is required')
    .max(100, 'Maximum 100 logs per batch'),
});

/**
 * Schema for search query parameters.
 */
const SearchQuerySchema = z.object({
  q: z.string().optional().default(''),
  level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).optional(),
  source: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  tags: z.string().optional(), // comma-separated
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

module.exports = {
  LogEventSchema,
  BatchLogSchema,
  SearchQuerySchema,
};
