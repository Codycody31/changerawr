import {NextRequest, NextResponse} from 'next/server';
import {getAvailableExtensions} from '@/lib/services/core/markdown/extensionLoader';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/extensions/metadata/[name]
 * Get extension metadata including settings schema, README, and CHANGELOG
 */
export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ name: string }> }
) {
    try {
        const {name} = await params;

        if (!name) {
            return NextResponse.json(
                {error: 'Extension name is required'},
                {status: 400}
            );
        }

        // Get all available extensions (includes both built-in and installed)
        const extensions = await getAvailableExtensions();

        // Find the extension by name
        const extension = extensions.find(ext => ext.metadata.name === name);

        if (!extension) {
            return NextResponse.json(
                {error: 'Extension not found'},
                {status: 404}
            );
        }

        const metadata = {...extension.metadata};

        // Try to read README.md and CHANGELOG.md from extension directory
        // Extensions can be nested (e.g., extensions/changerawr/highlight)
        // So we need to search for the directory recursively
        const extensionsDir = path.join(process.cwd(), 'extensions');

        // Function to find extension directory recursively
        const findExtensionDir = (baseDir: string, targetName: string): string | null => {
            try {
                const entries = fs.readdirSync(baseDir, { withFileTypes: true });

                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        const fullPath = path.join(baseDir, entry.name);

                        // Check if this directory contains extension.json with matching name
                        const extensionJsonPath = path.join(fullPath, 'extension.json');
                        if (fs.existsSync(extensionJsonPath)) {
                            try {
                                const extensionJson = JSON.parse(fs.readFileSync(extensionJsonPath, 'utf-8'));
                                if (extensionJson.name === targetName) {
                                    return fullPath;
                                }
                            } catch (e) {
                                // Invalid JSON, continue searching
                            }
                        }

                        // Recursively search subdirectories
                        const found = findExtensionDir(fullPath, targetName);
                        if (found) return found;
                    }
                }
            } catch (err) {
                // Directory read error, skip
            }
            return null;
        };

        const extensionDir = findExtensionDir(extensionsDir, name);

        if (extensionDir) {
            // Try to read README.md
            const readmePath = path.join(extensionDir, 'README.md');
            if (fs.existsSync(readmePath)) {
                try {
                    (metadata as any).readme = fs.readFileSync(readmePath, 'utf-8');
                } catch (err) {
                    console.log(`Failed to read README for ${name}:`, err);
                }
            }

            // Try to read CHANGELOG.md
            const changelogPath = path.join(extensionDir, 'CHANGELOG.md');
            if (fs.existsSync(changelogPath)) {
                try {
                    (metadata as any).changelog = fs.readFileSync(changelogPath, 'utf-8');
                } catch (err) {
                    console.log(`Failed to read CHANGELOG for ${name}:`, err);
                }
            }
        }

        // Return the metadata with README and CHANGELOG if found
        return NextResponse.json(metadata);

    } catch (error: any) {
        console.error('Failed to get extension metadata:', error);
        return NextResponse.json(
            {error: error.message || 'Failed to get extension metadata'},
            {status: 500}
        );
    }
}
