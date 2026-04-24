/**
 * health-check.js — Verify all system components are running.
 * Run: node scripts/health-check.js
 */

const checks = [
  { name: 'Redis', url: null, check: checkRedis },
  { name: 'PostgreSQL', url: null, check: checkPostgres },
  { name: 'Ingestion Service', url: 'http://localhost:3001/health' },
  { name: 'Query Service', url: 'http://localhost:3003/health' },
  { name: 'Dashboard', url: 'http://localhost:3000' },
];

async function checkRedis() {
  const { getRedisClient, closeAllRedis } = require('@dls/common');
  try {
    const client = getRedisClient();
    const result = await client.ping();
    await closeAllRedis();
    return result === 'PONG';
  } catch {
    return false;
  }
}

async function checkPostgres() {
  const { getDb, closeDb } = require('@dls/common');
  try {
    const db = getDb();
    await db.raw('SELECT 1');
    await closeDb();
    return true;
  } catch {
    return false;
  }
}

async function checkUrl(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function runChecks() {
  console.log('\n🔍 System Health Check\n');
  console.log('  Component               Status');
  console.log('  ─────────────────────── ──────');

  let allHealthy = true;

  for (const c of checks) {
    let ok = false;

    if (c.check) {
      ok = await c.check();
    } else if (c.url) {
      ok = await checkUrl(c.url);
    }

    const status = ok ? '✅ Healthy' : '❌ Down';
    if (!ok) allHealthy = false;

    console.log(`  ${c.name.padEnd(25)} ${status}`);
  }

  console.log('\n' + (allHealthy ? '  ✅ All systems operational!\n' : '  ⚠️  Some services are down.\n'));
  process.exit(allHealthy ? 0 : 1);
}

runChecks();
