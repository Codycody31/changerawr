const fs = require('fs');
const path = require('path');

const INDEX_PATH = 'screenshots/gallery/index.json';
const CURSOR_PATH = 'screenshots/gallery/.cursor';
const README_PATH = 'README.md';
const SLOTS = 8;
const START = '<!-- GALLERY:START -->';
const END = '<!-- GALLERY:END -->';

const pool = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));

let cursor = 0;
if (fs.existsSync(CURSOR_PATH)) {
  cursor = parseInt(fs.readFileSync(CURSOR_PATH, 'utf8').trim(), 10) || 0;
}

const picked = [];
for (let i = 0; i < Math.min(SLOTS, pool.length); i++) {
  picked.push(pool[(cursor + i) % pool.length]);
}

const rows = [];
for (let i = 0; i < picked.length; i += 4) {
  const cells = picked
    .slice(i, i + 4)
    .map(({ src, alt }) => `    <td width="25%"><img src="${src}" width="100%" alt="${alt}" /></td>`)
    .join('\n');
  rows.push(`  <tr>\n${cells}\n  </tr>`);
}

const table = `<table align="center">\n${rows.join('\n')}\n</table>`;
const block = `${START}\n${table}\n${END}`;

const readme = fs.readFileSync(README_PATH, 'utf8');
const startIdx = readme.indexOf(START);
const endIdx = readme.indexOf(END);
if (startIdx === -1 || endIdx === -1) {
  console.error('Gallery markers not found in README.md');
  process.exit(1);
}

const updated = readme.slice(0, startIdx) + block + readme.slice(endIdx + END.length);
fs.writeFileSync(README_PATH, updated);

const nextCursor = (cursor + SLOTS) % pool.length;
fs.writeFileSync(CURSOR_PATH, String(nextCursor));

console.log(`Rotated gallery: cursor ${cursor} -> ${nextCursor}, showing ${picked.map(p => path.basename(p.src)).join(', ')}`);
