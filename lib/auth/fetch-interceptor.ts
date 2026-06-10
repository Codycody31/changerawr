'use client'

// Wraps the global `fetch` so that any request which comes back 401 due to
// an expired access token cookie transparently refreshes the cookie (via
// /api/auth/refresh) and retries once. This covers every fetch in the app
// (React Query, plain fetches, etc.) without each call site needing to know
// about token refresh - the scheduled refresh in AuthProvider handles the
// common case, but background tab throttling can delay it past the access
// token's lifetime, so this is the fallback that self-heals on next request.

let refreshPromise: Promise<boolean> | null = null

function refreshAccessToken(): Promise<boolean> {
    if (!refreshPromise) {
        refreshPromise = fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        })
            .then((res) => res.ok)
            .catch(() => false)
            .finally(() => {
                refreshPromise = null
            })
    }

    return refreshPromise
}

function getRequestUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input
    if (input instanceof URL) return input.toString()
    return input.url
}

export function installFetchInterceptor(): void {
    if (typeof window === 'undefined') return
    if ((window as unknown as { __fetchInterceptorInstalled?: boolean }).__fetchInterceptorInstalled) return
    ;(window as unknown as { __fetchInterceptorInstalled?: boolean }).__fetchInterceptorInstalled = true

    const originalFetch = window.fetch.bind(window)

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const response = await originalFetch(input, init)

        if (response.status !== 401) {
            return response
        }

        const url = getRequestUrl(input)
        if (url.includes('/api/auth/refresh') || url.includes('/api/auth/login')) {
            return response
        }

        const refreshed = await refreshAccessToken()
        if (!refreshed) {
            return response
        }

        return originalFetch(input, init)
    }
}
