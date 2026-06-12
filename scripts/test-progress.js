/**
 * Test Progress Updates
 *
 * Simulates deployment progress for testing the maintenance page
 * Run with: node scripts/test-progress.js
 */

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendProgress(phase, progress, message) {
  try {
    const response = await fetch('http://localhost:3010/startup/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phase, progress, message }),
    });

    if (response.ok) {
      console.log(`✓ ${progress}% - ${message}`);
    } else {
      console.error(`✗ Failed to update progress: ${response.status}`);
    }
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
  }
}

async function simulateDeployment() {
  console.log('🦖 Starting simulated deployment...\n');

  // Reset progress
  await fetch('http://localhost:3010/startup/reset', { method: 'POST' });
  await sleep(500);

  // Simulate deployment steps
  await sendProgress('maintenance', 5, 'Maintenance server started');
  await sleep(2000);

  await sendProgress('prisma-generate', 10, 'Generating Prisma client');
  await sleep(3000);

  await sendProgress('migrations', 25, 'Running database migrations');
  await sleep(2000);

  await sendProgress('widget', 40, 'Building widget components');
  await sleep(3000);

  await sendProgress('swagger', 55, 'Generating API documentation');
  await sleep(2000);

  await sendProgress('extensions', 70, 'Generating extension imports');
  await sleep(2000);

  await sendProgress('build', 78, 'Rebuilding application with installed extensions');
  await sleep(1000);
  await sendProgress('build', 79, 'Creating an optimized production build');
  await sleep(2000);
  await sendProgress('build', 81, 'Build compiled successfully');
  await sleep(1000);
  await sendProgress('build', 82, 'Collecting page data');
  await sleep(1000);
  await sendProgress('build', 83, 'Generating static pages');
  await sleep(2000);
  await sendProgress('build', 84, 'Finalizing page optimization');
  await sleep(1000);

  await sendProgress('starting-app', 85, 'Starting Next.js application');
  await sleep(3000);

  await sendProgress('ready', 100, 'Application ready');

  // Mark as complete
  await fetch('http://localhost:3010/startup/complete', { method: 'POST' });

  console.log('\n✅ Simulated deployment complete!');
  console.log('Visit http://localhost:3000 to see the maintenance page\n');
}

simulateDeployment().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
