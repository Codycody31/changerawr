/**
 * Generate Tailwind Safelist from Extensions
 *
 * This script scans extension files for Tailwind classes and adds them to the safelist
 * to ensure they're included in the production build.
 */

import { readdir, readFile, writeFile, lstat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, '..');
const EXTENSIONS_DIR = join(PROJECT_ROOT, 'extensions');
const TAILWIND_CONFIG = join(PROJECT_ROOT, 'tailwind.config.ts');

// Base safelist that should always be included
const BASE_SAFELIST = [
    "text-3xl", "text-2xl", "text-xl", "text-lg", "text-base", "text-sm",
    "font-bold", "font-semibold", "font-medium", "font-mono",
    "italic", "underline", "line-through", "leading-7", "leading-relaxed",
    "mt-8", "mt-6", "mt-5", "mt-4", "mt-3", "mt-2",
    "mb-6", "mb-4", "mb-3", "mb-2", "my-6", "my-4", "my-2",
    "p-4", "p-6", "p-2", "px-1.5", "px-2", "px-3", "px-4", "px-6",
    "py-0.5", "py-1", "py-2", "pl-4", "pl-6",
    "flex", "inline-flex", "items-center", "justify-center", "gap-2", "space-y-1",
    "relative", "group", "list-disc", "list-decimal", "list-inside", "ml-4",
    "border-l-2", "border-l-4", "border-t", "border-border", "border-muted-foreground",
    "rounded", "rounded-lg", "rounded-md", "bg-muted", "max-w-full", "h-auto",
    "overflow-x-auto", "hover:underline", "hover:opacity-100", "opacity-0",
    "group-hover:opacity-100", "transition-opacity", "transition-colors", "transition-all", "duration-200",
    "text-muted-foreground", "text-primary",
    "bg-blue-500/10", "border-blue-500/30", "text-blue-600", "border-l-blue-500",
    "bg-amber-500/10", "border-amber-500/30", "text-amber-600", "border-l-amber-500",
    "bg-red-500/10", "border-red-500/30", "text-red-600", "border-l-red-500",
    "bg-green-500/10", "border-green-500/30", "text-green-600", "border-l-green-500",
    "bg-blue-600", "text-white", "hover:bg-blue-700",
    "bg-gray-200", "text-gray-900", "hover:bg-gray-300",
    "dark:text-blue-400", "dark:text-amber-400", "dark:text-red-400", "dark:text-green-400",
    "dark:bg-gray-800", "dark:text-gray-100",
];

/**
 * Extract Tailwind classes from a string
 * Matches className="...", class="...", and any Tailwind-looking classes in strings
 */
function extractTailwindClasses(content) {
    const classes = new Set();

    // Match className="..." or class="..."
    const classNameRegex = /(?:className|class)=["']([^"']+)["']/g;
    let match;

    while ((match = classNameRegex.exec(content)) !== null) {
        const classString = match[1];

        // Split by whitespace and filter out template literals, expressions, etc.
        const classNames = classString.split(/\s+/).filter(cls => {
            // Filter out empty strings and things that look like template expressions
            return cls && !cls.includes('${') && !cls.includes('{') && !cls.includes('}');
        });

        classNames.forEach(cls => {
            // Only add valid-looking Tailwind classes
            if (cls && !cls.startsWith('$') && !cls.includes('(')) {
                classes.add(cls);
            }
        });
    }

    // Also match template literal classes like `text-${color}`
    // We need to extract the static parts
    const templateRegex = /className=[\s\S]*?`([^`]+)`/g;
    while ((match = templateRegex.exec(content)) !== null) {
        const templateString = match[1];

        // Extract static parts (not template expressions)
        const staticParts = templateString.split(/\$\{[^}]+\}/);
        staticParts.forEach(part => {
            const classNames = part.split(/\s+/).filter(cls => cls && cls.trim());
            classNames.forEach(cls => {
                const trimmed = cls.trim();
                if (trimmed && !trimmed.includes('${')) {
                    classes.add(trimmed);
                }
            });
        });
    }

    // Match classes in string literals (for render functions that return HTML strings)
    // Look for strings containing Tailwind patterns like "bg-{color}-{shade}"
    const stringLiteralRegex = /['"`]([^'"`]*(?:bg-|text-|border-|hover:|dark:|group-)[^'"`]*)['"`]/g;
    while ((match = stringLiteralRegex.exec(content)) !== null) {
        const stringContent = match[1];

        // Extract all class-like patterns
        const classNames = stringContent.split(/\s+/).filter(cls => {
            // Must look like a Tailwind class and not contain template expressions
            return cls &&
                   !cls.includes('${') &&
                   !cls.includes('(') &&
                   !cls.includes(')') &&
                   !cls.includes('<') &&
                   !cls.includes('>') &&
                   /^[a-z-]+(?:\/\d+)?(?::[\w-]+)*$/.test(cls);
        });

        classNames.forEach(cls => classes.add(cls));
    }

    return Array.from(classes);
}

/**
 * Scan all extension files for Tailwind classes
 */
async function scanExtensions() {
    const extensionClasses = new Set();

    try {
        const authors = await readdir(EXTENSIONS_DIR);

        for (const author of authors) {
            const authorPath = join(EXTENSIONS_DIR, author);

            try {
                const extensions = await readdir(authorPath);

                for (const extName of extensions) {
                    const extPath = join(authorPath, extName);

                    // Skip Windows junctions / symlinks - "linked" extensions point
                    // outside the project root (often a whole dev checkout with
                    // node_modules etc.), so a recursive readdir on them can take
                    // forever and hang the "extensions" deploy step.
                    try {
                        const extLstat = await lstat(extPath);
                        if (extLstat.isSymbolicLink()) {
                            console.log(`  Skipping linked extension (junction): ${author}/${extName}`);
                            continue;
                        }
                    } catch {
                        // If lstat fails, just try to proceed normally
                    }

                    try {
                        // Read all .ts, .tsx, .js, .jsx files in the extension
                        const files = await readdir(extPath, { recursive: true });

                        for (const file of files) {
                            if (/\.(ts|tsx|js|jsx)$/.test(file)) {
                                const filePath = join(extPath, file);
                                try {
                                    const content = await readFile(filePath, 'utf-8');
                                    const classes = extractTailwindClasses(content);

                                    classes.forEach(cls => extensionClasses.add(cls));

                                    if (classes.length > 0) {
                                        console.log(`  Found ${classes.length} classes in ${author}/${extName}/${file}`);
                                    }
                                } catch (err) {
                                    // Skip files that can't be read
                                }
                            }
                        }
                    } catch (err) {
                        // Skip if not a directory
                    }
                }
            } catch (err) {
                // Skip if not a directory
            }
        }
    } catch (err) {
        console.log('⚠️  No extensions directory found');
    }

    return Array.from(extensionClasses);
}

/**
 * Update tailwind.config.ts with the new safelist
 */
async function updateTailwindConfig(safelist) {
    const configContent = await readFile(TAILWIND_CONFIG, 'utf-8');

    // Find the safelist array and replace it
    // Format as proper JSON array with 4-space indentation for each item
    const safelistItems = safelist.map(cls => `        "${cls}"`).join(',\n');
    const safelistStr = `[\n${safelistItems}\n    ]`;

    // Use a more robust regex that matches ONLY the safelist array
    // Match from "safelist:" to the closing bracket + comma that ends the property
    // Look for the pattern: safelist: [ ... ],
    const safelistRegex = /safelist:\s*\[\s*[\s\S]*?\n    \],/m;

    if (!safelistRegex.test(configContent)) {
        throw new Error('Could not find safelist array in tailwind.config.ts');
    }

    const newConfig = configContent.replace(
        safelistRegex,
        `safelist: ${safelistStr},`
    );

    await writeFile(TAILWIND_CONFIG, newConfig, 'utf-8');
    console.log(`✅ Updated ${TAILWIND_CONFIG}`);
}

async function main() {
    console.log('🔍 Scanning extensions for Tailwind classes...\n');

    const extensionClasses = await scanExtensions();

    console.log(`\n📦 Found ${extensionClasses.length} classes from extensions`);

    // Merge base safelist with extension classes (deduplicate)
    const allClasses = [...new Set([...BASE_SAFELIST, ...extensionClasses])];

    // Sort for better readability
    allClasses.sort();

    console.log(`✨ Total safelist classes: ${allClasses.length}\n`);

    await updateTailwindConfig(allClasses);

    console.log('\n✨ Done! Tailwind safelist updated with extension classes.\n');
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
