/**
 * Hook/utility to register custom extensions with the markdown engine
 *
 * Usage:
 * import { renderMarkdown, parseMarkdown } from '@/lib/services/core/markdown/useCustomExtensions';
 *
 * const html = renderMarkdown(markdownContent);
 * const tokens = parseMarkdown(markdownContent);
 */

import { ChangerawrMarkdown, EngineConfig, Extension, createMinimalEngine, CoreExtensions } from '@changerawr/markdown';
import { customExtensions, ExtensionWithMetadata } from './extensions';
import { getAvailableExtensions } from './extensionLoader';
import { getDevTools } from './dev-tools-connector';

// Singleton instance with all custom extensions registered
let engineInstance: ChangerawrMarkdown | null = null;
let engineInstanceInitialized = false;

// Engine instances with specific extension sets
const engineCache = new Map<string, ChangerawrMarkdown>();

/**
 * Get or create the singleton markdown engine with all custom extensions
 * Now loads both built-in AND installed extensions automatically
 */
export async function getMarkdownEngineAsync(): Promise<ChangerawrMarkdown> {
  // Always recreate if not fully initialized to avoid partial registration
  if (!engineInstanceInitialized) {
    // Create minimal engine with no default extensions
    engineInstance = createMinimalEngine([]);

    // Manually register core extensions EXCEPT image and link (we'll use our own)
    const coreExtensionsToRegister = CoreExtensions.filter(ext =>
      ext.name !== 'image' && ext.name !== 'link'
    );

    coreExtensionsToRegister.forEach(extension => {
      const result = engineInstance!.registerExtension(extension);
      if (!result.success) {
        console.warn(`Failed to register core extension '${extension.name}':`, result.error);
      }
    });

    // Load all available extensions (built-in + installed)
    const allExtensions = await getAvailableExtensions();

    // Filter to only enabled extensions by checking the database
    const enabledExtensions = await getEnabledExtensions(allExtensions);

    // Register only enabled extensions (includes our custom image and link extensions)
    enabledExtensions.forEach(({ extension }) => {
      const result = engineInstance!.registerExtension(extension);
      if (!result.success) {
        console.warn(`Failed to register extension '${extension.name}':`, result.error);
      }
    });

    engineInstanceInitialized = true;
  }

  return engineInstance!;
}

/**
 * Filter extensions to only those that are enabled in the database
 */
async function getEnabledExtensions(allExtensions: ExtensionWithMetadata[]): Promise<ExtensionWithMetadata[]> {
  try {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      // Server-side: directly query database
      const { PrismaClient } = await import('@prisma/client');
      const db = new PrismaClient();

      try {
        const enabledExtensionsInDb = await db.editorExtension.findMany({
          where: { isEnabled: true },
          select: { name: true }
        });

        const enabledNames = new Set(enabledExtensionsInDb.map(e => e.name));

        // Always include built-in extensions, filter optional ones by enabled status
        return allExtensions.filter(ext =>
          ext.metadata.isBuiltIn || enabledNames.has(ext.metadata.name)
        );
      } finally {
        await db.$disconnect();
      }
    } else {
      // Client-side: fetch from API
      const response = await fetch('/api/extensions/enabled');
      if (!response.ok) {
        console.warn('Failed to fetch enabled extensions, loading all');
        return allExtensions;
      }

      const { enabledNames } = await response.json();
      const enabledSet = new Set(enabledNames);

      // Always include built-in extensions, filter optional ones by enabled status
      return allExtensions.filter(ext =>
        ext.metadata.isBuiltIn || enabledSet.has(ext.metadata.name)
      );
    }
  } catch (error) {
    console.error('Error filtering enabled extensions:', error);
    // On error, return all extensions (fail open)
    return allExtensions;
  }
}

/**
 * Synchronous fallback - uses only built-in extensions
 * @deprecated Use async functions instead for full extension support
 */
function getMarkdownEngine(): ChangerawrMarkdown {
  // If we already have a fully initialized engine, return it
  if (engineInstance && engineInstanceInitialized) {
    return engineInstance;
  }

  // Otherwise create a basic one with only built-in extensions
  if (!engineInstance) {
    // Create minimal engine with no default extensions
    engineInstance = createMinimalEngine([]);

    // Manually register core extensions EXCEPT image and link (we'll use our own)
    const coreExtensionsToRegister = CoreExtensions.filter(ext =>
      ext.name !== 'image' && ext.name !== 'link'
    );

    coreExtensionsToRegister.forEach(extension => {
      const result = engineInstance!.registerExtension(extension);
      if (!result.success) {
        console.warn(`Failed to register core extension '${extension.name}':`, result.error);
      }
    });

    // Register only built-in extensions (synchronous fallback)
    customExtensions.forEach(extension => {
      const result = engineInstance!.registerExtension(extension);
      if (!result.success) {
        console.warn(`Failed to register extension '${extension.name}':`, result.error);
      }
    });
  }

  return engineInstance;
}

/**
 * Create or get a cached engine with specific extensions (ASYNC)
 * @param extensions - Array of extension names to enable
 * @param config - Optional engine configuration
 */
async function getMarkdownEngineWithExtensions(
  extensions: string[] | Extension[],
  config?: EngineConfig
): Promise<ChangerawrMarkdown> {
  // Create cache key from extension names
  const extensionNames = extensions.map(ext =>
    typeof ext === 'string' ? ext : ext.name
  ).sort().join(',');

  const cacheKey = `${extensionNames}:${JSON.stringify(config || {})}`;

  if (engineCache.has(cacheKey)) {
    return engineCache.get(cacheKey)!;
  }

  // Create new engine with specified extensions
  const engine = new ChangerawrMarkdown(config);
  const allExtensionsWithMetadata = await getAvailableExtensions();

  // Register extensions
  extensions.forEach(ext => {
    let extension: Extension | undefined;

    if (typeof ext === 'string') {
      // Look up by name from discovered extensions
      const found = allExtensionsWithMetadata.find(e => e.metadata.name === ext);
      extension = found?.extension;
    } else {
      // Direct extension object
      extension = ext;
    }

    if (extension) {
      const result = engine.registerExtension(extension);
      if (!result.success) {
        console.warn(`Failed to register extension '${extension.name}':`, result.error);
      }
    } else {
      console.warn(`Extension '${ext}' not found`);
    }
  });

  engineCache.set(cacheKey, engine);
  return engine;
}

/**
 * Render markdown with all custom extensions (async - loads installed extensions)
 * This is the main function to use for rendering markdown throughout the app
 *
 * Note: The engine automatically caches rendered HTML internally using LRU caching.
 * No need for manual memoization - the engine handles it!
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const engine = await getMarkdownEngineAsync();
  const devTools = getDevTools();

  // Send render event to dev tools if connected
  if (devTools.isConnected()) {
    devTools.info(`Rendering ${markdown.length} characters of markdown`);
  }

  const html = engine.toHtml(markdown);

  // Send completion event
  if (devTools.isConnected()) {
    devTools.info(`Rendered ${html.length} characters of HTML`);
  }

  return html;
}

/**
 * Render markdown synchronously (only built-in extensions)
 * @deprecated Use renderMarkdown instead for full extension support
 */
export function renderMarkdownSync(markdown: string): string {
  const engine = getMarkdownEngine();
  return engine.toHtml(markdown);
}

/**
 * Render markdown with performance metrics (async - loads installed extensions)
 * Returns both HTML and detailed performance data
 */
export async function renderMarkdownWithMetrics(markdown: string): Promise<{ html: string; metrics: { parseTime: number; renderTime: number; totalTime: number; cacheHit: boolean } }> {
  const engine = await getMarkdownEngineAsync();
  return engine.toHtmlWithMetrics(markdown);
}

/**
 * Render markdown with streaming for large documents
 * Provides progress callbacks for UI updates
 */
export async function renderMarkdownStreamed(
  markdown: string,
  options?: {
    chunkSize?: number;
    onProgress?: (progress: { html: string; progress: number }) => void;
  }
): Promise<string> {
  const engine = getMarkdownEngine();
  return engine.toHtmlStreamed(markdown, {
    chunkSize: options?.chunkSize || 50,
    onChunk: options?.onProgress
  });
}

/**
 * Get cache statistics from the engine
 */
export async function getCacheStats() {
  const engine = await getMarkdownEngineAsync();
  return engine.getCacheStats();
}

/**
 * Clear all caches in the engine
 */
export async function clearCaches() {
  const engine = await getMarkdownEngineAsync();
  engine.clearCaches();
}

/**
 * Parse markdown with all custom extensions into tokens (async - loads installed extensions)
 */
export async function parseMarkdown(markdown: string) {
  const engine = await getMarkdownEngineAsync();
  return engine.parse(markdown);
}

/**
 * Create a fresh engine instance (useful for testing)
 */
export function createEngineWithExtensions(config?: EngineConfig): ChangerawrMarkdown {
  // Create minimal engine with no default extensions
  const engine = createMinimalEngine([]);

  // Manually register core extensions EXCEPT image and link (we'll use our own)
  const coreExtensionsToRegister = CoreExtensions.filter(ext =>
    ext.name !== 'image' && ext.name !== 'link'
  );

  coreExtensionsToRegister.forEach(extension => {
    const result = engine.registerExtension(extension);
    if (!result.success) {
      console.warn(`Failed to register core extension '${extension.name}':`, result.error);
    }
  });

  // Register all custom extensions
  customExtensions.forEach(extension => {
    const result = engine.registerExtension(extension);
    if (!result.success) {
      console.warn(`Failed to register extension '${extension.name}':`, result.error);
    }
  });

  return engine;
}

/**
 * Render markdown with specific extensions (ASYNC - auto-discovers extensions)
 * @param markdown - Markdown content to render
 * @param extensionNames - Array of extension names to use (e.g., ['table', 'highlight'])
 */
export async function renderMarkdownWithExtensions(
  markdown: string,
  extensionNames: string[]
): Promise<string> {
  const engine = await getMarkdownEngineWithExtensions(extensionNames);
  return engine.toHtml(markdown);
}

/**
 * Get all available extensions with metadata (auto-discovers from file system)
 * Useful for building UI to select extensions
 */
export { getAvailableExtensions } from './extensionLoader';

/**
 * Clear engine cache (when extensions change)
 */
export function clearEngineCache(): void {
  engineCache.clear();
  engineInstance = null;
  engineInstanceInitialized = false;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetEngineInstance(): void {
  engineInstance = null;
  engineInstanceInitialized = false;
  engineCache.clear();
}