/**
 * Auto-generate extension imports
 *
 * This script scans the /extensions directory and automatically generates
 * the import statements for extensionLoader.ts
 *
 * Workaround for Next.js/Turbopack static import requirement
 */

import { readdir, readFile, writeFile, lstat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const EXTENSIONS_DIR = join(PROJECT_ROOT, 'extensions');
const LOADER_FILE = join(PROJECT_ROOT, 'lib', 'services', 'core', 'markdown', 'extensionLoader.ts');

// Report progress to Extension Builder Service
async function reportProgress(phase, progress, message) {
  try {
    const response = await fetch('http://localhost:3010/startup/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase, progress, message }),
    });
    if (!response.ok) {
      console.log(`[Warning] Failed to report progress: ${response.status}`);
    }
  } catch (error) {
    // Extension builder might not be running, that's okay
  }
}

async function scanExtensions() {
  const extensions = [];

  try {
    const authors = await readdir(EXTENSIONS_DIR);

    for (const author of authors) {
      const authorPath = join(EXTENSIONS_DIR, author);

      try {
        const stat = await readdir(authorPath);

        for (const extName of stat) {
          const extPath = join(authorPath, extName);

          // Skip Windows junctions / symlinks — Turbopack resolves them to their
          // canonical (physical) path, which is outside the project root, causing
          // "needs to be on project filesystem" panics or "module not found" errors.
          try {
            const extLstat = await lstat(extPath);
            if (extLstat.isSymbolicLink()) {
              console.log(`⏭  Skipping linked extension (junction): ${author}/${extName}`);
              continue;
            }
          } catch {
            // If lstat fails, just try to proceed normally
          }

          const indexPath = join(extPath, 'index.ts');
          const metadataPath = join(extPath, 'extension.json');
          const readmePath = join(extPath, 'README.md');
          const iconPath = join(extPath, 'icon.png');

          try {
            // Check if extension.json exists
            const metadataContent = await readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(metadataContent);

            // Try to load README
            let readme = null;
            try {
              readme = await readFile(readmePath, 'utf-8');
            } catch (err) {
              // No README, that's okay
            }

            // Try to load icon from extension.json or icon.png file
            let icon = null;

            // First check if icon is specified in extension.json (Lucide icon name or data URI)
            if (metadata.icon) {
              icon = metadata.icon;
            }

            // If no icon in extension.json, try to load icon.png and base64 encode it
            if (!icon) {
              try {
                const iconBuffer = await readFile(iconPath);
                icon = `data:image/png;base64,${iconBuffer.toString('base64')}`;
              } catch (err) {
                // No icon.png, that's okay
              }
            }

            extensions.push({
              author,
              name: extName,
              displayName: metadata.displayName,
              importPath: `@/extensions/${author}/${extName}`,
              variableName: `${author}_${extName}`.replace(/[^a-zA-Z0-9_]/g, '_'),
              readme,
              icon,
              settings: metadata.settings || null,
            });

            console.log(`✓ Found extension: ${author}/${extName}${readme ? ' [README]' : ''}${icon ? ' [ICON]' : ''}`);
          } catch (err) {
            // Skip if no extension.json
          }
        }
      } catch (err) {
        // Skip if not a directory
      }
    }
  } catch (err) {
    console.log('⚠️  No extensions directory found (this is fine for fresh install)');
  }

  return extensions;
}

async function generateLoaderFile(extensions) {
  // Generate dynamic imports with try-catch for each extension
  const loadersCode = extensions.map(ext => `
async function load_${ext.variableName}() {
  try {
    const module = await import('${ext.importPath}');
    return {
      extension: module.${ext.name}Extension,
      metadata: {
        ...module.metadata,
        ${ext.readme ? `readme: ${JSON.stringify(ext.readme)},` : ''}
        ${ext.icon ? `icon: ${JSON.stringify(ext.icon)},` : ''}
        ${ext.settings ? `settings: ${JSON.stringify(ext.settings)},` : ''}
      },
    };
  } catch (err) {
    console.error('[Extension Loader] Failed to load ${ext.author}/${ext.name}:', err instanceof Error ? err.message : err);
    console.error('[Extension Loader] Triggering extension regeneration...');

    // Trigger regeneration
    if (typeof window === 'undefined') {
      // Server-side: call extension builder
      fetch('http://localhost:3010/extensions/generate-imports', { method: 'POST' })
        .then(() => console.log('[Extension Loader] Regeneration triggered, please restart'))
        .catch(() => console.error('[Extension Loader] Failed to trigger regeneration'));
    }

    return null;
  }
}`).join('\n');

  const fileContent = `/**
 * Extension Loader - Auto-generated imports
 *
 * This file is AUTO-GENERATED by scripts/generate-extension-imports.js
 * DO NOT EDIT MANUALLY - your changes will be overwritten
 *
 * To add extensions:
 * 1. Install via the UI or manually add to /extensions/
 * 2. Run: npm run extensions:generate
 * 3. Restart the dev server
 */

import { Extension } from '@changerawr/markdown';
import { builtInExtensions, ExtensionMetadata, ExtensionWithMetadata } from './extensions';

/**
 * Extension loaders with error handling
 * Each loader wraps the import in try-catch to handle missing extensions
 */
${loadersCode || '// No installed extensions yet'}

/**
 * Cache for all extensions
 */
let discoveredExtensionsCache: ExtensionWithMetadata[] | null = null;
let isLoadingExtensions = false;

/**
 * Get all available extensions (built-in + optional)
 * Dynamically loads installed extensions with error handling
 */
export async function discoverExtensions(): Promise<ExtensionWithMetadata[]> {
  // Prevent concurrent loading
  if (isLoadingExtensions) {
    while (isLoadingExtensions) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return discoveredExtensionsCache || [...builtInExtensions];
  }

  isLoadingExtensions = true;

  try {
    // Load all optional extensions with error handling
    const loadPromises = [
      ${extensions.map(ext => `load_${ext.variableName}()`).join(',\n      ')}
    ];

    const loadedExtensions = await Promise.all(loadPromises);
    const validExtensions = loadedExtensions.filter(ext => ext !== null);

    const all = [...builtInExtensions, ...validExtensions];

    // Log discovered extensions (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('\\n=== Markdown Extensions Loaded ===');
      all.forEach(ext => {
        console.log(
          \`\${ext.metadata.isBuiltIn ? '🔧' : '⚡'} \${ext.metadata.displayName} v\${ext.metadata.version} \${
            ext.metadata.isBuiltIn ? '(built-in)' : '(optional)'
          }\`
        );
      });
      console.log('==================================\\n');
    }

    return all;
  } finally {
    isLoadingExtensions = false;
  }
}

/**
 * Get all available extensions (cached)
 * Call this to get the list of extensions for the admin UI
 */
export async function getAvailableExtensions(): Promise<ExtensionWithMetadata[]> {
  if (!discoveredExtensionsCache) {
    discoveredExtensionsCache = await discoverExtensions();
  }
  return discoveredExtensionsCache;
}

/**
 * Clear cache and re-discover extensions
 * Call this when a new extension file is added
 */
export function clearExtensionCache(): void {
  discoveredExtensionsCache = null;
}

/**
 * Get extension by name
 */
export async function getExtension(name: string): Promise<ExtensionWithMetadata | undefined> {
  const extensions = await getAvailableExtensions();
  return extensions.find(e => e.metadata.name === name);
}

/**
 * Get extensions by category
 */
export async function getExtensionsByCategory(category: string): Promise<ExtensionWithMetadata[]> {
  const extensions = await getAvailableExtensions();
  return extensions.filter(e => e.metadata.category === category);
}
`;

  await writeFile(LOADER_FILE, fileContent, 'utf-8');
  console.log(`\n✅ Generated ${LOADER_FILE}`);
  console.log(`   ${extensions.length} extension(s) imported\n`);
}

async function cleanupBrokenLinks() {
  console.log('🔍 Checking for broken symlinks...\n');

  try {
    // Check if we have access to database (production might not)
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Get all linked extensions from database
    const linkedExtensions = await prisma.editorExtension.findMany({
      where: { isLinked: true },
    });

    if (linkedExtensions.length === 0) {
      console.log('   No linked extensions found in database');
      await prisma.$disconnect();
      return;
    }

    console.log(`   Found ${linkedExtensions.length} linked extension(s) in database`);

    // Check each one to see if symlink still exists
    const { stat, access } = await import('fs/promises');
    const brokenLinks = [];

    for (const ext of linkedExtensions) {
      // Use the stored author to find the symlink; also check the legacy 'changerawr' path
      const authorDir = ext.author?.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'community';
      const symlinkPath = join(PROJECT_ROOT, 'extensions', authorDir, ext.name);
      const legacyPath = join(PROJECT_ROOT, 'extensions', 'changerawr', ext.name);

      // Check that the proxy directory (or legacy junction) exists
      let proxyExists = false;
      try {
        await access(symlinkPath);
        proxyExists = true;
      } catch {
        try {
          await access(legacyPath);
          proxyExists = true;
        } catch { /* neither path exists */ }
      }

      if (!proxyExists) {
        brokenLinks.push(ext);
        console.log(`   ⚠️  Broken link: ${ext.name} (proxy directory doesn't exist)`);
        continue;
      }

      // Check that the source directory is still accessible
      if (ext.sourceUrl) {
        try {
          const stats = await stat(ext.sourceUrl);
          if (!stats.isDirectory()) {
            brokenLinks.push(ext);
            console.log(`   ⚠️  Broken link: ${ext.name} (source is not a directory)`);
          }
        } catch {
          brokenLinks.push(ext);
          console.log(`   ⚠️  Broken link: ${ext.name} (source not accessible: ${ext.sourceUrl})`);
        }
      }
    }

    // Remove broken links from database
    if (brokenLinks.length > 0) {
      console.log(`\n🗑️  Removing ${brokenLinks.length} broken link(s) from database...`);

      for (const ext of brokenLinks) {
        await prisma.editorExtension.delete({
          where: { id: ext.id },
        });
        console.log(`   ✓ Removed ${ext.name} from database`);
      }

      console.log('');
    } else {
      console.log('   ✓ All linked extensions are valid\n');
    }

    await prisma.$disconnect();
  } catch (err) {
    // Database might not be available in some contexts, that's okay
    console.log('   ⚠️  Could not check database (this is normal during build)\n');
  }
}

async function main() {
  await reportProgress('extensions', 0, 'Scanning for installed extensions');
  console.log('🔍 Scanning for installed extensions...\n');

  // Clean up broken symlinks first
  await cleanupBrokenLinks();

  const extensions = await scanExtensions();

  console.log(`\n📦 Found ${extensions.length} installed extension(s)`);
  await reportProgress('extensions', 50, `Found ${extensions.length} extension(s)`);

  await generateLoaderFile(extensions);
  await reportProgress('extensions', 100, `Generated imports for ${extensions.length} extension(s)`);

  console.log('✨ Done! Restart your dev server to load the extensions.\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
