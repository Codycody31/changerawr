const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Pool of candidate screenshots for the README's rotating gallery.
// Curated to exclude empty/placeholder states (analytics with no data,
// "coming soon" theme page, empty bookmarks, etc).
const POOL = [
  { src: 'screenshots/dashboard.png', alt: 'Dashboard overview' },
  { src: 'screenshots/dashboard/projects.png', alt: 'Projects list' },
  { src: 'screenshots/dashboard/projects/projectId/changelog.png', alt: 'Changelog view' },
  { src: 'screenshots/dashboard/projects/projectId/changelog/new.png', alt: 'New changelog entry editor' },
  { src: 'screenshots/dashboard/admin/users.png', alt: 'Admin user management' },
  { src: 'screenshots/dashboard/admin/audit-logs.png', alt: 'Admin audit logs' },
  { src: 'screenshots/dashboard/admin/ai-settings.png', alt: 'AI settings' },
  { src: 'screenshots/dashboard/projects/projectId/settings/tags.png', alt: 'Tag management' },
  { src: 'screenshots/dashboard/admin/about.png', alt: 'About / system information' },
  { src: 'screenshots/dashboard/projects/projectId/catch-up.png', alt: 'Catch-up view' },
  { src: 'screenshots/dashboard/projects/projectId/import.png', alt: 'Changelog import' },
  { src: 'screenshots/changelog/projectId.png', alt: 'Public changelog page' },
];

const TARGET_W = 960;
const TARGET_H = 600;

const GALLERY_DIR = 'screenshots/gallery';
fs.mkdirSync(GALLERY_DIR, { recursive: true });

(async () => {
  const index = [];
  const keep = new Set(['index.json', '.cursor']);

  for (const { src, alt } of POOL) {
    const outName = src.replace(/\//g, '_');
    const outPath = path.join(GALLERY_DIR, outName);
    await sharp(src)
      .resize(TARGET_W, TARGET_H, { fit: 'cover', position: 'top' })
      .toFile(outPath);
    index.push({ src: `${GALLERY_DIR}/${outName}`, alt });
    keep.add(outName);
    console.log('wrote', outPath);
  }

  // Remove anything left over from a previous pool (renamed/removed
  // screenshots) so stale images never linger in the gallery folder.
  for (const entry of fs.readdirSync(GALLERY_DIR)) {
    if (!keep.has(entry)) {
      fs.unlinkSync(path.join(GALLERY_DIR, entry));
      console.log('removed stale', entry);
    }
  }

  fs.writeFileSync(path.join(GALLERY_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  console.log('wrote screenshots/gallery/index.json');
})().catch(e => { console.error(e); process.exit(1); });
