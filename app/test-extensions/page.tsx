/**
 * Test page for extension discovery and loading
 * Visit /test-extensions to see if highlight extension is discovered
 */

import {getAvailableExtensions} from '@/lib/services/core/markdown/extensionLoader';
import {renderMarkdownWithExtensions} from '@/lib/services/core/markdown/useCustomExtensions';
import {InstallExtensionButton} from './InstallExtensionButton';
import {BuilderServiceStatus} from './BuilderServiceStatus';
import {ExtensionCard} from './ExtensionCard';

export default async function TestExtensionsPage() {
    // Discover all available extensions
    const extensions = await getAvailableExtensions();

    // DEBUG: Log all extensions with their structure
    console.log('\n🔍 DEBUG: Discovered Extensions');
    extensions.forEach(ext => {
        console.log(`\n📦 ${ext.metadata.displayName} (${ext.metadata.name})`);
        console.log(`   Built-in: ${ext.metadata.isBuiltIn}`);
        console.log(`   Author: ${ext.metadata.author}`);
        console.log(`   Parse Rules:`, ext.extension.parseRules?.length || 0);
        console.log(`   Render Rules:`, ext.extension.renderRules?.length || 0);

        // Log spoiler extension in detail
        if (ext.metadata.name === 'spoiler') {
            console.log('   🚨 SPOILER EXTENSION DETAILS:');
            console.log('   Parse Rules:', JSON.stringify(ext.extension.parseRules, null, 2));
            console.log('   Render Rules:', JSON.stringify(ext.extension.renderRules, null, 2));
        }
    });

    // Extract only metadata for client components (can't pass RegExp or React components to client)
    const extensionMetadata = extensions.map(ext => ({
        metadata: {
            name: ext.metadata.name,
            displayName: ext.metadata.displayName,
            version: ext.metadata.version,
            author: ext.metadata.author,
            description: ext.metadata.description,
            category: ext.metadata.category,
            isBuiltIn: ext.metadata.isBuiltIn,
            // Don't pass toolbar (contains React components)
        }
    }));

    // Test markdown with all extension syntaxes
    const testMarkdown = `
# Extension Test

This page tests all installed extensions.

## Spoiler Block Extension

The spoiler block hides content until the user clicks to reveal it.

:::spoiler
This is hidden spoiler content! 🎉

You can put **any markdown** here including:
- Lists
- **Bold text**
- Links like [this one](https://example.com)
- And even code: \`console.log('Hello')\`
:::

Use spoilers to hide plot details, quiz answers, or sensitive information.

## Highlight Extension

The highlight extension uses ==double equals== to highlight text.

Examples:
- This ==should be highlighted== in yellow
- Multiple ==highlights== work ==just fine==

## Built-in Extensions

| Feature | Status |
|---------|--------|
| Tables  | ✓ Working |
| Subtext | ✓ Working |

-# This is subtext (smaller text below headings)
`;

    // Render with specific extensions
    const extensionNames = extensions.map(e => e.metadata.name);
    console.log('\n🎯 Rendering with extensions:', extensionNames);

    const html = await renderMarkdownWithExtensions(testMarkdown, extensionNames);

    // DEBUG: Show raw HTML for spoiler section
    const spoilerMatch = html.match(/<details[\s\S]*?<\/details>/);
    if (spoilerMatch) {
        console.log('\n✅ Found <details> in HTML:', spoilerMatch[0].substring(0, 200));
    } else {
        console.log('\n❌ No <details> found in HTML');
        // Check if there's an alert-like structure instead
        const alertMatch = html.match(/<div[^>]*role="alert"[\s\S]*?<\/div>/);
        if (alertMatch) {
            console.log('🚨 Found alert structure instead:', alertMatch[0].substring(0, 200));
        }
    }

    return (
        <div className="container mx-auto p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Extension Discovery Test</h1>
                <InstallExtensionButton/>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Left: Discovered Extensions */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Discovered Extensions</h2>
                    <div className="space-y-2">
                        {extensionMetadata.map(ext => (
                            <ExtensionCard
                                key={ext.metadata.name}
                                extension={ext}
                            />
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-muted rounded">
                        <h3 className="font-semibold mb-2">Total Extensions</h3>
                        <p className="text-2xl font-bold">{extensions.length}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {extensions.filter(e => e.metadata.isBuiltIn).length} built-in,{' '}
                            {extensions.filter(e => !e.metadata.isBuiltIn).length} external
                        </p>
                    </div>

                    <div className="mt-6">
                        <BuilderServiceStatus />
                    </div>
                </div>

                {/* Right: Rendered Output */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Rendered Output</h2>
                    <div
                        className="prose max-w-none p-4 border rounded bg-card"
                        dangerouslySetInnerHTML={{__html: html}}
                    />

                    <div className="mt-6 p-4 bg-muted rounded">
                        <h3 className="font-semibold mb-2">Test Status</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                {extensions.some(e => e.metadata.name === 'highlight') ? (
                                    <>
                                        <span className="text-green-600">✓</span>
                                        <span>Highlight extension discovered</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-red-600">✗</span>
                                        <span>Highlight extension NOT found</span>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {extensions.some(e => e.metadata.name === 'spoiler') ? (
                                    <>
                                        <span className="text-green-600">✓</span>
                                        <span>Spoiler extension discovered</span>
                                        <span className="text-xs text-muted-foreground">
                                            ({extensions.find(e => e.metadata.name === 'spoiler')?.metadata.isBuiltIn ? 'built-in' : 'external'})
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-red-600">✗</span>
                                        <span>Spoiler extension NOT found</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Debug Panel */}
                    <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded">
                        <h3 className="font-semibold mb-2 text-yellow-900 dark:text-yellow-100">🔍 Debug Info</h3>
                        <div className="space-y-2 text-xs">
                            <div>
                                <strong>Spoiler Extensions Found:</strong>{' '}
                                {extensions.filter(e => e.metadata.name === 'spoiler').length}
                            </div>
                            {extensions.filter(e => e.metadata.name === 'spoiler').map((ext, idx) => (
                                <div key={idx} className="ml-4 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                                    <div><strong>#{idx + 1}:</strong> {ext.metadata.displayName}</div>
                                    <div>Author: {ext.metadata.author}</div>
                                    <div>Built-in: {ext.metadata.isBuiltIn ? 'Yes' : 'No'}</div>
                                    <div>Parse Rules: {ext.extension.parseRules?.length || 0}</div>
                                    <div>Render Rules: {Array.isArray(ext.extension.renderRules) ? ext.extension.renderRules.length : 'Object (old API)'}</div>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-yellow-300 dark:border-yellow-700">
                                <strong>HTML Check:</strong>
                                {html.includes('<details') ? (
                                    <span className="text-green-600"> ✓ Contains &lt;details&gt;</span>
                                ) : (
                                    <span className="text-red-600"> ✗ No &lt;details&gt; found</span>
                                )}
                            </div>
                            <div>
                                {html.match(/role="alert"/i) && (
                                    <span className="text-red-600">⚠️ Contains alert role</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
