import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';

const DEFAULT_STORES = [
  {
    name: 'changerawr-official',
    displayName: 'Changerawr Official Store',
    url: 'https://github.com/Changerawr/extension-store/raw/refs/heads/main/extensions.json',
    isBuiltIn: true,
  },
];

/**
 * GET /api/extensions/store
 * Fetch extensions from all configured stores
 */
export async function GET(request: NextRequest) {
  try {
    const user = await validateAuthAndGetUser();
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get all extension stores from database
    const stores = await db.extensionStore.findMany({
      where: { isEnabled: true },
      orderBy: { priority: 'desc' },
    });

    // Check if ANY stores exist in DB (even if disabled)
    const totalStoresInDb = await db.extensionStore.count();

    // If no stores in DB at all, use defaults. Otherwise, respect the database state
    const activeStores = totalStoresInDb === 0 ? DEFAULT_STORES : stores;

    // Fetch extensions from all stores
    const allExtensions = [];

    for (const store of activeStores) {
      try {
        // Add cache-busting query parameter to force GitHub to serve fresh content
        const cacheBustUrl = new URL(store.url);
        cacheBustUrl.searchParams.set('_t', Date.now().toString());

        const response = await fetch(cacheBustUrl.toString(), {
          cache: 'no-store', // Don't cache, always get fresh data
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });

        if (!response.ok) {
          console.warn(`Failed to fetch from store: ${store.name}`);
          continue;
        }

        const data = await response.json();

        // Handle both array format and object format
        const extensions = Array.isArray(data) ? data : data.extensions || [];

        // Add store metadata to each extension and normalize field names
        // Also fetch README, CHANGELOG, and icon.png from GitHub
        const enriched = await Promise.all(extensions.map(async (ext: any) => {
          const githubUrl = ext.githubUrl || ext.installUrl;
          let readme = ext.readme;
          let changelog = ext.changelog;
          let icon = ext.icon; // Start with the Lucide icon name from extension.json

          // If githubUrl is provided, try to fetch missing resources
          if (githubUrl) {
            try {
              // Convert GitHub repo URL to raw content URL
              // e.g., https://github.com/user/repo/tree/main/path -> https://raw.githubusercontent.com/user/repo/main/path
              let rawBaseUrl = githubUrl
                .replace('github.com', 'raw.githubusercontent.com')
                .replace('/tree/main/', '/main/')
                .replace(/\/$/, ''); // Remove trailing slash if any

              // Add trailing slash for appending file names
              rawBaseUrl += '/';

              // Fetch README.md if not provided
              if (!readme) {
                try {
                  const readmeResponse = await fetch(rawBaseUrl + 'README.md', {
                    cache: 'no-store',
                  });
                  if (readmeResponse.ok) {
                    readme = await readmeResponse.text();
                  }
                } catch (e) {
                  // README not found, that's okay
                }
              }

              // Fetch CHANGELOG.md if not provided
              if (!changelog) {
                try {
                  const changelogResponse = await fetch(rawBaseUrl + 'CHANGELOG.md', {
                    cache: 'no-store',
                  });
                  if (changelogResponse.ok) {
                    changelog = await changelogResponse.text();
                  }
                } catch (e) {
                  // CHANGELOG not found, that's okay
                }
              }

              // Always check if icon.png exists - prefer PNG over Lucide icon
              try {
                const iconUrl = rawBaseUrl + 'icon.png';
                // console.log(`[Extension Store] Checking icon.png for ${ext.name}: ${iconUrl}`);
                const iconResponse = await fetch(iconUrl, {
                  method: 'HEAD', // Just check if it exists
                  cache: 'no-store',
                });
                // console.log(`[Extension Store] Icon response for ${ext.name}: ${iconResponse.status} ${iconResponse.ok ? 'OK' : 'NOT FOUND'}`);
                if (iconResponse.ok) {
                  icon = iconUrl; // Prefer the PNG icon over Lucide icon name
                  // console.log(`[Extension Store] Using icon URL for ${ext.name}: ${iconUrl}`);
                } else {
                  // console.log(`[Extension Store] Keeping Lucide icon for ${ext.name}: ${icon}`);
                }
              } catch (e) {
                // icon.png not found, keep the Lucide icon from ext.icon
                // console.log(`[Extension Store] Error fetching icon for ${ext.name}:`, e);
              }
            } catch (error) {
              // Silently fail for individual extension docs
            }
          }

          return {
            ...ext,
            githubUrl,
            author: ext.author || 'Unknown', // Provide default author
            storeName: store.name,
            storeDisplayName: store.displayName,
            readme,
            changelog,
            icon, // Now includes GitHub raw URL to icon.png if found, otherwise Lucide icon name
          };
        }));

        allExtensions.push(...enriched);
      } catch (error) {
        console.error(`Error fetching from store ${store.name}:`, error);
      }
    }

    return NextResponse.json(allExtensions);

  } catch (error: any) {
    console.error('Failed to fetch store extensions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch store extensions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/extensions/store
 * Add a new extension store
 */
export async function POST(request: NextRequest) {
  try {
    const user = await validateAuthAndGetUser();
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, displayName, url } = body;

    if (!name || !displayName || !url) {
      return NextResponse.json(
        { error: 'name, displayName, and url are required' },
        { status: 400 }
      );
    }

    // Validate the store URL by fetching it
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Store URL is not accessible');
      }

      const data = await response.json();
      const extensions = Array.isArray(data) ? data : data.extensions || [];

      if (!Array.isArray(extensions)) {
        throw new Error('Invalid store format');
      }
    } catch (err: any) {
      return NextResponse.json(
        { error: `Invalid store URL: ${err.message}` },
        { status: 400 }
      );
    }

    // Create store in database
    const store = await db.extensionStore.create({
      data: {
        name,
        displayName,
        url,
        isBuiltIn: false,
        isEnabled: true,
        priority: 0,
      },
    });

    return NextResponse.json(store);

  } catch (error: any) {
    console.error('Failed to add store:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add store' },
      { status: 500 }
    );
  }
}
