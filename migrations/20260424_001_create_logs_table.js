/**
 * Migration: Create the logs table with full-text search indexes.
 */
exports.up = async function (knex) {
  // Enable the uuid-ossp extension for gen_random_uuid()
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable('logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.string('level', 10).notNullable();
    table.string('source', 255).notNullable();
    table.text('message').notNullable();
    table.jsonb('metadata').defaultTo('{}');
    table.specificType('tags', 'text[]').defaultTo('{}');
    table.string('environment', 20).defaultTo('development');
    table.timestamp('processed_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    // Indexes for fast querying
    table.index('timestamp', 'idx_logs_timestamp');
    table.index('level', 'idx_logs_level');
    table.index('source', 'idx_logs_source');
    table.index('environment', 'idx_logs_environment');
  });

  // GIN indexes for JSONB, array, and full-text search
  await knex.raw('CREATE INDEX idx_logs_tags ON logs USING GIN (tags)');
  await knex.raw('CREATE INDEX idx_logs_metadata ON logs USING GIN (metadata)');
  await knex.raw(
    "CREATE INDEX idx_logs_message_search ON logs USING GIN (to_tsvector('english', message))"
  );
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('logs');
};
