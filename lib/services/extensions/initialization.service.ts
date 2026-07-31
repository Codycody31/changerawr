/**
 * Extension Initialization Service
 *
 * Handles extension discovery and validation during app startup
 * Provides deployment stats for maintenance page
 */

import { getAvailableExtensions, clearExtensionCache } from '@/lib/services/core/markdown/extensionLoader';
import { ExtensionWithMetadata } from '@/lib/services/core/markdown/extensions';

interface ExtensionStats {
  total: number;
  builtIn: number;
  optional: number;
  categories: Record<string, number>;
  extensions: Array<{
    name: string;
    displayName: string;
    version: string;
    isBuiltIn: boolean;
    category?: string;
  }>;
}

let cachedStats: ExtensionStats | null = null;
let initializationTime: number | null = null;



/**
 * Initialize extensions during app startup
 * This is called from app/startup.ts
 */
export async function initializeExtensions(): Promise<ExtensionStats> {
  const startTime = Date.now();

  try {
    console.log('Initializing markdown extensions...');

    // Clear any cached extensions from previous runs
    clearExtensionCache();

    // Discover all available extensions
    const extensions = await getAvailableExtensions();

    console.log(`Found ${extensions.length} extensions`);

    // Build stats
    const stats: ExtensionStats = {
      total: extensions.length,
      builtIn: extensions.filter(e => e.metadata.isBuiltIn).length,
      optional: extensions.filter(e => !e.metadata.isBuiltIn).length,
      categories: {},
      extensions: extensions.map(e => ({
        name: e.metadata.name,
        displayName: e.metadata.displayName,
        version: e.metadata.version,
        isBuiltIn: e.metadata.isBuiltIn || false,
        category: e.metadata.category,
      })),
    };

    // Count by category
    extensions.forEach(ext => {
      const category = ext.metadata.category || 'other';
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    });

    // Cache stats
    cachedStats = stats;
    initializationTime = Date.now() - startTime;

    console.log(
      `Loaded ${stats.total} markdown extensions (${stats.builtIn} built-in, ${stats.optional} optional) in ${initializationTime}ms`
    );

    return stats;

  } catch (error) {
    console.error('Failed to initialize extensions:', error);
    throw error;
  }
}

/**
 * Get extension stats (cached)
 * Used by maintenance page and health checks
 */
export function getExtensionStats(): ExtensionStats {
  if (!cachedStats) {
    return {
      total: 0,
      builtIn: 0,
      optional: 0,
      categories: {},
      extensions: [],
    };
  }
  return cachedStats;
}

/**
 * Get initialization time in milliseconds
 */
export function getInitializationTime(): number {
  return initializationTime || 0;
}

/**
 * Validate extensions (for health checks)
 * Returns true if all extensions are valid
 */
export async function validateExtensions(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    const extensions = await getAvailableExtensions();

    // Validate each extension
    extensions.forEach(ext => {
      // Check required metadata
      if (!ext.metadata.name) {
        errors.push(`Extension missing name: ${JSON.stringify(ext.metadata)}`);
      }
      if (!ext.metadata.displayName) {
        errors.push(`Extension ${ext.metadata.name} missing displayName`);
      }
      if (!ext.metadata.version) {
        errors.push(`Extension ${ext.metadata.name} missing version`);
      }

      // Check extension structure
      if (!ext.extension.name) {
        errors.push(`Extension ${ext.metadata.name} missing extension.name`);
      }
      if (!ext.extension.parseRules || ext.extension.parseRules.length === 0) {
        errors.push(`Extension ${ext.metadata.name} missing parseRules`);
      }
      if (!ext.extension.renderRules || ext.extension.renderRules.length === 0) {
        errors.push(`Extension ${ext.metadata.name} missing renderRules`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };

  } catch (error) {
    errors.push(`Failed to validate extensions: ${error}`);
    return {
      valid: false,
      errors,
    };
  }
}

/**
 * Get detailed deployment info
 * Used by maintenance page
 */
export interface DeploymentInfo {
  extensions: ExtensionStats;
  initTime: number;
  environment: {
    nodeVersion: string;
    platform: string;
    isDocker: boolean;
    isDevelopment: boolean;
  };
}

export function getDeploymentInfo(): DeploymentInfo {
  return {
    extensions: getExtensionStats(),
    initTime: getInitializationTime(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      isDocker: process.env.DOCKER_BUILD === '1' || !!process.env.DOCKER_CONTAINER,
      isDevelopment: process.env.NODE_ENV === 'development',
    },
  };
}
