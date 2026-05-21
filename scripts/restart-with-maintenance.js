/**
 * Restart with Maintenance Mode
 *
 * This script triggers a graceful restart with maintenance mode
 * Used after installing/uninstalling extensions to regenerate imports
 */

import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const RESTART_FLAG = join(PROJECT_ROOT, '.restart-pending');

async function createRestartFlag() {
  // Create a flag file that the app can check
  await writeFile(RESTART_FLAG, JSON.stringify({
    reason: 'extension-update',
    timestamp: Date.now(),
  }), 'utf-8');

  console.log('✅ Restart flag created');
}

async function triggerRestart() {
  console.log('🔄 Triggering graceful restart...\n');

  // Create restart flag
  await createRestartFlag();

  // In development, we'll use a different approach
  // In production/Docker, this would be handled by the process manager

  if (process.env.NODE_ENV === 'production') {
    console.log('📦 Production mode: Process manager will handle restart');
    console.log('   Sending SIGUSR2 signal for graceful reload...');

    // Send signal to parent process (PM2, Docker, etc.)
    process.kill(process.ppid, 'SIGUSR2');
  } else {
    console.log('🛠️  Development mode: Manual restart required');
    console.log('   Please restart your dev server to load extensions:');
    console.log('   npm run dev\n');
  }
}

async function main() {
  console.log('🦖 Changerawr Extension Restart\n');

  // First, regenerate imports
  console.log('📦 Regenerating extension imports...');

  await new Promise((resolve, reject) => {
    const generateProcess = spawn('node', ['scripts/generate-extension-imports.js'], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });

    generateProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Import generation failed with code ${code}`));
      }
    });

    generateProcess.on('error', reject);
  });

  console.log('\n✅ Imports regenerated\n');

  // Trigger restart
  await triggerRestart();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
