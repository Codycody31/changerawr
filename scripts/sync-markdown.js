/**
 * Rebuilds @changerawr/markdown from source and syncs the dist into node_modules.
 * Only runs in development — safe to call from postinstall.
 */
const { execSync } = require('child_process');
const { cpSync, existsSync } = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

if (process.env.NODE_ENV !== 'development') process.exit(0);

const src = path.resolve(__dirname, '../../changerawr-markdown');
const dest = path.resolve(__dirname, '../node_modules/@changerawr/markdown');

if (!existsSync(src)) {
  console.log('[sync-markdown] ../changerawr-markdown not found, skipping');
  process.exit(0);
}

if (!existsSync(dest)) {
  console.log('[sync-markdown] node_modules/@changerawr/markdown not found — run npm install first');
  process.exit(1);
}

console.log('[sync-markdown] Building @changerawr/markdown...');
execSync('npm run build', { cwd: src, stdio: 'inherit' });

console.log('[sync-markdown] Syncing dist...');
cpSync(path.join(src, 'dist'), path.join(dest, 'dist'), { recursive: true, force: true });

console.log('[sync-markdown] Done.');
