const knex = require('knex');
const config = require('./config');

let db = null;

/**
 * Get or create the Knex database connection.
 * @returns {import('knex').Knex}
 */
function getDb() {
  if (!db) {
    db = knex({
      client: 'pg',
      connection: {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
      },
      pool: {
        min: 2,
        max: 10,
      },
      acquireConnectionTimeout: 10000,
    });
  }
  return db;
}

/**
 * Gracefully close the database connection.
 */
async function closeDb() {
  if (db) {
    await db.destroy();
    db = null;
  }
}

module.exports = { getDb, closeDb };
