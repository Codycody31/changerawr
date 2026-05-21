import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';
import { getAvailableExtensions } from '@/lib/services/core/markdown/extensionLoader';

const EXTENSIONS_DIR = path.join(process.cwd(), 'extensions');

// Helper to compare version strings (semver-like)
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

export async function GET(request: NextRequest) {
  try {
    // Fetch all extensions from database
    const extensions = await db.editorExtension.findMany({
      orderBy: [
        { isBuiltIn: 'desc' }, // Built-in first
        { installedAt: 'desc' }, // Then by install date
      ],
    });

    // Load extension metadata (including icons) from extensionLoader
    let extensionMetadataMap = new Map<string, { icon?: string; invertIcon?: boolean; readme?: string }>();
    try {
      const availableExtensions = await getAvailableExtensions();
      availableExtensions.forEach(ext => {
        extensionMetadataMap.set(ext.metadata.name, {
          icon: ext.metadata.icon,
          invertIcon: ext.metadata.invertIcon,
          readme: ext.metadata.readme,
        });
      });
    } catch (metadataError) {
      console.error('Failed to load extension metadata:', metadataError);
    }

    // Fetch store extensions to check for updates
    let storeExtensions: any[] = [];
    try {
      const stores = await db.extensionStore.findMany({
        where: { isEnabled: true },
        orderBy: { priority: 'desc' },
      });

      for (const store of stores) {
        try {
          const cacheBustUrl = new URL(store.url);
          cacheBustUrl.searchParams.set('_t', Date.now().toString());

          const response = await fetch(cacheBustUrl.toString(), {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
          });

          if (response.ok) {
            const data = await response.json();
            const extensions = data.extensions || [];
            storeExtensions.push(...extensions);
          }
        } catch (storeError) {
          console.error(`Failed to fetch from store ${store.name}:`, storeError);
        }
      }
    } catch (storeError) {
      console.error('Failed to fetch store extensions:', storeError);
    }

    // Check if extension files exist and check for updates
    const extensionsWithStatus = await Promise.all(
      extensions.map(async (ext) => {
        let isBroken = false;

        // Skip file check for built-in extensions
        if (!ext.isBuiltIn) {
          // Try author/name path first, then fallback to legacy name-only path
          const extDirWithAuthor = ext.author
            ? path.join(EXTENSIONS_DIR, ext.author, ext.name)
            : null;
          const extDirLegacy = path.join(EXTENSIONS_DIR, ext.name);

          let indexPath = extDirWithAuthor
            ? path.join(extDirWithAuthor, 'index.ts')
            : path.join(extDirLegacy, 'index.ts');

          try {
            await fs.access(indexPath);
            // File exists
            isBroken = false;
          } catch {
            // Try legacy path if author path failed
            if (extDirWithAuthor) {
              try {
                await fs.access(path.join(extDirLegacy, 'index.ts'));
                isBroken = false;
              } catch {
                isBroken = true;
              }
            } else {
              isBroken = true;
            }
          }
        }

        // Check for updates from store
        let updateAvailable = false;
        let latestVersion = ext.version;

        if (ext.sourceType === 'STORE' && ext.sourceUrl) {
          const storeExt = storeExtensions.find(s => s.name === ext.name);
          if (storeExt && storeExt.version) {
            latestVersion = storeExt.version;
            updateAvailable = compareVersions(storeExt.version, ext.version) > 0;
          }
        }

        // Get icon from metadata
        const metadata = extensionMetadataMap.get(ext.name);

        // Check if icon.png file exists in extension directory
        let iconUrl = metadata?.icon;
        if (!ext.isBuiltIn) {
          const extDirWithAuthor = ext.author
            ? path.join(EXTENSIONS_DIR, ext.author, ext.name)
            : null;
          const extDirLegacy = path.join(EXTENSIONS_DIR, ext.name);

          let hasIconFile = false;
          if (extDirWithAuthor) {
            try {
              await fs.access(path.join(extDirWithAuthor, 'icon.png'));
              hasIconFile = true;
            } catch {
              try {
                await fs.access(path.join(extDirLegacy, 'icon.png'));
                hasIconFile = true;
              } catch {
                // No icon file
              }
            }
          } else {
            try {
              await fs.access(path.join(extDirLegacy, 'icon.png'));
              hasIconFile = true;
            } catch {
              // No icon file
            }
          }

          // If icon.png exists, use the API endpoint URL
          if (hasIconFile) {
            iconUrl = `/api/extensions/${ext.id}/icon`;
          }
        }

        return {
          ...ext,
          isBroken,
          updateAvailable,
          latestVersion,
          icon: iconUrl,
          invertIcon: metadata?.invertIcon,
          readme: metadata?.readme,
        };
      })
    );

    return NextResponse.json(extensionsWithStatus);

  } catch (error: any) {
    console.error('Failed to list extensions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list extensions' },
      { status: 500 }
    );
  }
}
