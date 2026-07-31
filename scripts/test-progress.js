/**
 * Test Progress Updates
 *
 * Simulates docker-entrypoint.sh's step log so the maintenance page can be
 * exercised without a full Docker build. Writes the same
 * "step|state|message|timestamp" lines to /tmp/changerawr-status-log that
 * docker-entrypoint.sh's write_step() does - scripts/maintenance/server.js
 * reads this file directly.
 *
 * Usage:
 *   1. npm run maintenance   (in one terminal)
 *   2. node scripts/test-progress.js   (in another)
 *   3. Open http://localhost:3000
 */

const fs = require('fs');
const path = require('path');

const STATUS_LOG = '/tmp/changerawr-status-log';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeStep(id, state, message) {
  const line = `${id}|${state}|${message}|${Math.floor(Date.now() / 1000)}\n`;
  fs.appendFileSync(STATUS_LOG, line);
  console.log(`✓ [${id}] ${state} - ${message}`);
}

async function simulateDeployment() {
  console.log('🦖 Simulating deployment steps...\n');

  fs.mkdirSync(path.dirname(STATUS_LOG), { recursive: true });
  fs.writeFileSync(STATUS_LOG, '');

  writeStep('prisma-generate', 'running', 'Generating Prisma client');
  await sleep(2000);
  writeStep('prisma-generate', 'done', 'Prisma client generated');

  writeStep('migrations', 'running', 'Running database migrations');
  await sleep(2000);
  writeStep('migrations', 'done', 'Database migrations complete');

  writeStep('widget', 'running', 'Building widget');
  await sleep(2000);
  writeStep('widget', 'done', 'Widget built');

  writeStep('swagger', 'running', 'Generating API documentation');
  await sleep(2000);
  writeStep('swagger', 'done', 'API documentation generated');

  writeStep('extensions-generate', 'running', 'Preparing installed extensions');
  await sleep(2000);
  writeStep('extensions-generate', 'done', 'Extension imports regenerated');

  writeStep('rebuild', 'running', 'Rebuilding application with extensions (this can take several minutes)');
  await sleep(3000);
  writeStep('rebuild', 'done', 'Rebuild complete');

  writeStep('starting-app', 'running', 'Starting application services');
  await sleep(1000);
  writeStep('starting-app', 'done', 'Application services started');

  writeStep('ready', 'done', 'Application ready');

  console.log('\n✅ Simulated deployment complete!');
  console.log('Visit http://localhost:3000 to see the maintenance page\n');
}

simulateDeployment().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
