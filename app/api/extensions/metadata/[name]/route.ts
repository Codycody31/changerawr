import { NextRequest, NextResponse } from 'next/server';
import { getAvailableExtensions } from '@/lib/services/core/markdown/extensionLoader';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';

const EXTENSIONS_DIR = path.join(process.cwd(), 'extensions');

/**
 * GET /api/extensions/metadata/[name]
 *
 * Accepts two formats:
 *   /api/extensions/metadata/templatetest          — by extension name alone
 *   /api/extensions/metadata/supernova3339.templatetest — by author.name (canonical)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        const { name: rawParam } = await params;

        if (!rawParam) {
            return NextResponse.json({ error: 'Extension name is required' }, { status: 400 });
        }

        // Parse author.name or plain name
        let author: string | null = null;
        let extName: string = rawParam;

        if (rawParam.includes('.')) {
            const dotIdx = rawParam.indexOf('.');
            author  = rawParam.slice(0, dotIdx);
            extName = rawParam.slice(dotIdx + 1);
        }

        // ── 1. Try to get metadata from the loader (cached, includes README/icon) ──
        let metadata: Record<string, any> | null = null;

        try {
            const extensions = await getAvailableExtensions();
            const found = extensions.find(ext =>
                ext.metadata.name === extName &&
                (!author || ext.metadata.author?.toLowerCase() === author.toLowerCase())
            );
            if (found) {
                metadata = { ...found.metadata };
            }
        } catch {
            // Loader unavailable — fall through to DB
        }

        // ── 2. Fall back to DB for linked/newly-installed extensions not yet in loader ──
        if (!metadata) {
            const dbExt = await db.editorExtension.findFirst({
                where: {
                    name: extName,
                    ...(author ? { author: { equals: author, mode: 'insensitive' } } : {}),
                },
            });

            if (!dbExt) {
                return NextResponse.json({ error: 'Extension not found' }, { status: 404 });
            }

            metadata = {
                name:        dbExt.name,
                displayName: dbExt.displayName,
                version:     dbExt.version,
                author:      dbExt.author,
                description: dbExt.description,
                category:    dbExt.category,
                isBuiltIn:   dbExt.isBuiltIn,
                settings:    (dbExt.settings as any)?.schema ?? null,
            };
        }

        // ── 3. Read README / CHANGELOG from the extension directory ─────────────────
        const extDir = findExtensionDir(EXTENSIONS_DIR, extName, author);

        if (extDir) {
            const readmePath    = path.join(extDir, 'README.md');
            const changelogPath = path.join(extDir, 'CHANGELOG.md');
            const extJsonPath   = path.join(extDir, 'extension.json');

            if (fs.existsSync(readmePath)) {
                metadata.readme = fs.readFileSync(readmePath, 'utf-8');
            }
            if (fs.existsSync(changelogPath)) {
                metadata.changelog = fs.readFileSync(changelogPath, 'utf-8');
            }
            // Merge settings schema from extension.json if not already present
            if (!metadata.settings && fs.existsSync(extJsonPath)) {
                try {
                    const json = JSON.parse(fs.readFileSync(extJsonPath, 'utf-8'));
                    if (json.settings) metadata.settings = json.settings;
                } catch { /* ignore */ }
            }
        }

        return NextResponse.json(metadata);

    } catch (error: any) {
        console.error('Failed to get extension metadata:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get extension metadata' },
            { status: 500 }
        );
    }
}

/**
 * Find an extension directory by name (and optionally author) under the
 * extensions root. Checks the direct author/name path first before falling
 * back to a full recursive search.
 */
function findExtensionDir(baseDir: string, name: string, author: string | null): string | null {
    // Fast path: extensions/{author}/{name}
    if (author) {
        const direct = path.join(baseDir, author, name);
        if (fs.existsSync(path.join(direct, 'extension.json'))) return direct;
    }

    // Scan one level of author directories, then check {author}/{name}
    try {
        const authorDirs = fs.readdirSync(baseDir, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => e.name);

        for (const a of authorDirs) {
            const candidate = path.join(baseDir, a, name);
            if (fs.existsSync(path.join(candidate, 'extension.json'))) {
                try {
                    const json = JSON.parse(fs.readFileSync(path.join(candidate, 'extension.json'), 'utf-8'));
                    if (json.name === name) return candidate;
                } catch { /* skip */ }
            }
        }
    } catch { /* skip */ }

    // Deep recursive fallback (legacy flat layout or unusual nesting)
    return findExtensionDirRecursive(baseDir, name);
}

function findExtensionDirRecursive(baseDir: string, name: string): string | null {
    try {
        for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const full = path.join(baseDir, entry.name);
            const extJson = path.join(full, 'extension.json');
            if (fs.existsSync(extJson)) {
                try {
                    const json = JSON.parse(fs.readFileSync(extJson, 'utf-8'));
                    if (json.name === name) return full;
                } catch { /* skip */ }
            }
            const found = findExtensionDirRecursive(full, name);
            if (found) return found;
        }
    } catch { /* skip */ }
    return null;
}
