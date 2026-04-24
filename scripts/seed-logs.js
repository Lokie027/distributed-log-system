/**
 * seed-logs.js — Generate sample log data for testing.
 * Run: node scripts/seed-logs.js
 */

const INGESTION_URL = 'http://localhost:3001/api/logs/batch';

const sources = ['auth-service', 'payment-service', 'user-service', 'api-gateway', 'notification-service'];
const levels = ['debug', 'info', 'info', 'info', 'warn', 'warn', 'error', 'fatal']; // weighted towards info
const environments = ['development', 'staging', 'production'];

const messages = {
  debug: [
    'Cache lookup for key user:session:abc123',
    'Database query executed in 12ms',
    'Request headers parsed successfully',
    'Middleware chain completed',
  ],
  info: [
    'User login successful',
    'Order placed successfully',
    'Payment processed for $49.99',
    'Email notification sent',
    'API request completed',
    'Health check passed',
    'New user registered',
    'Session created',
  ],
  warn: [
    'Rate limit threshold approaching (80%)',
    'Slow database query detected (>2s)',
    'Deprecated API endpoint called',
    'High memory usage detected (75%)',
    'Certificate expiry in 30 days',
  ],
  error: [
    'Failed to connect to database',
    'Payment gateway timeout',
    'Authentication token expired',
    'File upload failed: disk space low',
    'External API returned 500',
  ],
  fatal: [
    'Database connection pool exhausted',
    'Out of memory — process terminating',
    'Unrecoverable data corruption detected',
  ],
};

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLog() {
  const level = randomItem(levels);
  const source = randomItem(sources);

  return {
    level,
    source,
    message: randomItem(messages[level]),
    environment: randomItem(environments),
    tags: [source.split('-')[0], level],
    metadata: {
      requestId: `req-${Math.random().toString(36).substring(2, 10)}`,
      userId: `user-${Math.floor(Math.random() * 1000)}`,
      responseTime: Math.floor(Math.random() * 2000),
    },
    timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
  };
}

async function seedLogs(totalLogs = 5000, batchSize = 100) {
  console.log(`\n🌱 Seeding ${totalLogs} logs in batches of ${batchSize}...\n`);

  let sent = 0;
  const startTime = Date.now();

  while (sent < totalLogs) {
    const count = Math.min(batchSize, totalLogs - sent);
    const logs = Array.from({ length: count }, generateLog);

    try {
      const res = await fetch(INGESTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`  ✗ Batch failed (HTTP ${res.status}): ${err}`);
      } else {
        sent += count;
        const pct = ((sent / totalLogs) * 100).toFixed(0);
        process.stdout.write(`\r  ✓ ${sent}/${totalLogs} logs sent (${pct}%)`);
      }
    } catch (err) {
      console.error(`\n  ✗ Network error: ${err.message}`);
      console.error('    Make sure the ingestion service is running on port 3001');
      process.exit(1);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ Done! Seeded ${sent} logs in ${elapsed}s`);
  console.log('   Logs should appear in the dashboard within a few seconds.\n');
}

// Parse CLI args
const count = parseInt(process.argv[2], 10) || 5000;
seedLogs(count);
