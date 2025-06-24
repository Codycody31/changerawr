/**
 * Extracts the hostname from NEXT_PUBLIC_APP_URL
 * Handles both localhost and production URLs
 */
export function getAppDomain(): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    // Fallback to environment variable override
    const appDomainOverride = process.env.NEXT_PUBLIC_APP_DOMAIN
    if (appDomainOverride) {
        return appDomainOverride
    }

    if (!appUrl) {
        throw new Error('NEXT_PUBLIC_APP_URL environment variable is not set')
    }

    try {
        const url = new URL(appUrl)
        return url.host // includes port if present (e.g., localhost:3000)
    } catch {
        throw new Error(`Invalid NEXT_PUBLIC_APP_URL: ${appUrl}`)
    }
}

/**
 * Checks if we're in development mode (localhost)
 */
export function isDevelopment(): boolean {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    return appUrl.includes('localhost') || appUrl.includes('127.0.0.1')
}

/**
 * Gets the full app URL for redirects and canonical URLs
 */
export function getAppUrl(): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
        throw new Error('NEXT_PUBLIC_APP_URL environment variable is not set')
    }
    return appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
}