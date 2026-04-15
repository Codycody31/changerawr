/**
 * Simple in-memory rate limiter suitable for single-instance deployments.
 * For multi-instance setups, replace the store with a shared cache (Redis, etc.).
 */

interface RateLimitEntry {
    count: number
    resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Purge expired entries every 5 minutes to avoid unbounded memory growth
setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
        if (entry.resetAt <= now) store.delete(key)
    }
}, 5 * 60 * 1000)

export interface RateLimitResult {
    allowed: boolean
    remaining: number
    resetAt: number
}

/**
 * Check and increment the rate limit counter for a given key.
 *
 * @param key    Unique identifier (e.g. `"login:${ip}"`)
 * @param limit  Maximum number of requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
): RateLimitResult {
    const now = Date.now()
    const existing = store.get(key)

    if (!existing || existing.resetAt <= now) {
        // First request in this window
        const resetAt = now + windowMs
        store.set(key, { count: 1, resetAt })
        return { allowed: true, remaining: limit - 1, resetAt }
    }

    existing.count++
    const allowed = existing.count <= limit
    return {
        allowed,
        remaining: Math.max(0, limit - existing.count),
        resetAt: existing.resetAt,
    }
}

/**
 * Extract a best-effort client IP from request headers.
 * Trusts x-forwarded-for (set by nginx/caddy in front of the app).
 */
export function getClientIp(request: Request): string {
    const forwarded = (request as { headers: Headers }).headers.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0].trim()
    return 'unknown'
}
