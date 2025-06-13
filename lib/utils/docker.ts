// lib/utils/docker.ts (Updated with debug mode)

export interface DockerImageConfig {
    registry: string;
    namespace: string;
    repository: string;
    defaultTag: string;
}

export const DEFAULT_DOCKER_CONFIG: DockerImageConfig = {
    registry: 'ghcr.io',
    namespace: 'supernova3339',
    repository: 'changerawr',
    defaultTag: 'latest',
};

// Debug configuration
const DEBUG_MODE = true; // Set to false for production
const DEBUG_IMAGE = 'traefik/whoami';

/**
 * Generate Docker image name with tag
 */
export function generateDockerImage(
    version: string,
    config: DockerImageConfig = DEFAULT_DOCKER_CONFIG
): string {
    // Debug mode override
    if (DEBUG_MODE) {
        console.log(`🐛 DEBUG MODE: Using debug image '${DEBUG_IMAGE}' instead of version ${version}`);
        return DEBUG_IMAGE;
    }

    const { registry, namespace, repository } = config;
    const tag = version.startsWith('v') ? version : `v${version}`;

    return `${registry}/${namespace}/${repository}:${tag}`;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
    return DEBUG_MODE;
}

/**
 * Get the debug image being used
 */
export function getDebugImage(): string {
    return DEBUG_IMAGE;
}

/**
 * Generate Docker image name with debug info
 */
export function generateDockerImageWithDebugInfo(
    version: string,
    config: DockerImageConfig = DEFAULT_DOCKER_CONFIG
): {
    image: string;
    isDebug: boolean;
    originalImage?: string;
} {
    if (DEBUG_MODE) {
        const originalImage = `${config.registry}/${config.namespace}/${config.repository}:${version.startsWith('v') ? version : `v${version}`}`;
        return {
            image: DEBUG_IMAGE,
            isDebug: true,
            originalImage,
        };
    }

    const image = generateDockerImage(version, config);
    return {
        image,
        isDebug: false,
    };
}

/**
 * Parse Docker image string into components
 */
export function parseDockerImage(imageString: string): {
    registry?: string;
    namespace?: string;
    repository: string;
    tag?: string;
} {
    // Handle formats like:
    // - changerawr:v1.0.0
    // - supernova3339/changerawr:v1.0.0
    // - ghcr.io/supernova3339/changerawr:v1.0.0

    const parts = imageString.split(':');
    const tag = parts.length > 1 ? parts[parts.length - 1] : undefined;
    const imagePart = parts[0];

    const pathParts = imagePart.split('/');

    if (pathParts.length === 1) {
        // Just repository name
        return {
            repository: pathParts[0],
            tag,
        };
    } else if (pathParts.length === 2) {
        // namespace/repository
        return {
            namespace: pathParts[0],
            repository: pathParts[1],
            tag,
        };
    } else if (pathParts.length >= 3) {
        // registry/namespace/repository
        return {
            registry: pathParts[0],
            namespace: pathParts[1],
            repository: pathParts.slice(2).join('/'),
            tag,
        };
    }

    return {
        repository: imageString,
        tag,
    };
}

/**
 * Validate Docker image format
 */
export function validateDockerImage(imageString: string): {
    valid: boolean;
    error?: string;
} {
    if (!imageString || typeof imageString !== 'string') {
        return {
            valid: false,
            error: 'Image string is required and must be a string',
        };
    }

    // Debug mode: allow traefik/whoami specifically
    if (DEBUG_MODE && imageString === DEBUG_IMAGE) {
        return { valid: true };
    }

    // Basic validation - check for invalid characters
    const invalidChars = /[^a-zA-Z0-9.\-_/:]/;
    if (invalidChars.test(imageString)) {
        return {
            valid: false,
            error: 'Image string contains invalid characters',
        };
    }

    // Check if it has a reasonable format
    const parsed = parseDockerImage(imageString);
    if (!parsed.repository) {
        return {
            valid: false,
            error: 'Invalid image format - repository name is required',
        };
    }

    return { valid: true };
}

/**
 * Get available image variants for a version
 */
export function getImageVariants(
    version: string,
    config: DockerImageConfig = DEFAULT_DOCKER_CONFIG
): string[] {
    // Debug mode: return debug image only
    if (DEBUG_MODE) {
        return [DEBUG_IMAGE];
    }

    const variants = [
        generateDockerImage(version, config),
        generateDockerImage(`${version}-alpine`, config),
    ];

    // Add latest tag if this is a stable version (no pre-release identifiers)
    if (!version.includes('-') && !version.includes('alpha') && !version.includes('beta')) {
        variants.push(`${config.registry}/${config.namespace}/${config.repository}:latest`);
    }

    return variants;
}

/**
 * Log debug information about image generation
 */
export function logDockerDebugInfo(version: string): void {
    if (DEBUG_MODE) {
        console.log('🐛 Docker Debug Mode Active');
        console.log(`   Requested version: ${version}`);
        console.log(`   Debug image: ${DEBUG_IMAGE}`);
        console.log(`   Original image would be: ${DEFAULT_DOCKER_CONFIG.registry}/${DEFAULT_DOCKER_CONFIG.namespace}/${DEFAULT_DOCKER_CONFIG.repository}:v${version}`);
        console.log('   This will deploy a simple service that shows browser/request information');
        console.log('   To disable debug mode, set DEBUG_MODE = false in lib/utils/docker.ts');
    }
}