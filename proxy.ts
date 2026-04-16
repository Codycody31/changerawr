import {NextResponse} from 'next/server'
import type {NextRequest} from 'next/server'
import {verifyAccessToken} from '@/lib/auth/tokens'
import {getAppDomain} from '@/lib/custom-domains/utils'
import {db} from '@/lib/db'

// ─── IP Whitelist ────────────────────────────────────────────────────────────

interface IpConfig { enabled: boolean; whitelist: string[] }
let cachedIpConfig: IpConfig = { enabled: false, whitelist: [] }
let ipCacheExpiry = 0
const IP_CACHE_TTL_MS = 30_000

async function getIpConfig(baseUrl: string): Promise<IpConfig> {
    const now = Date.now()
    if (now < ipCacheExpiry) return cachedIpConfig
    const secret = process.env.INTERNAL_API_SECRET
    if (!secret) return { enabled: false, whitelist: [] }
    try {
        const res = await fetch(`${baseUrl}/api/internal/ip-config`, {
            headers: { 'x-internal-secret': secret },
            signal: AbortSignal.timeout(3000),
        })
        if (res.ok) {
            cachedIpConfig = await res.json() as IpConfig
            ipCacheExpiry = now + IP_CACHE_TTL_MS
        }
    } catch { /* fail open */ }
    return cachedIpConfig
}

function getClientIp(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        ?? req.headers.get('x-real-ip')
        ?? '127.0.0.1'
}

function ipMatchesCidr(ip: string, cidr: string): boolean {
    const entry = cidr.trim()
    if (!entry) return false
    if (!entry.includes('/')) return ip === entry
    if (!ip.includes('.')) return false
    const [network, prefixStr] = entry.split('/')
    const prefix = parseInt(prefixStr, 10)
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return false
    const ipToU32 = (s: string) => s.split('.').reduce((a, p) => (a * 256 + parseInt(p, 10)), 0) >>> 0
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
    return (ipToU32(ip) & mask) === (ipToU32(network) & mask)
}

const IP_WHITELIST_PUBLIC_PREFIXES = [
    '/api/internal/', '/api/health', '/api/check-setup', '/api/system/version',
    '/api/config/', '/api/setup/', '/api/auth/', '/api/changelog/',
    '/api/integrations/widget/', '/api/avatar/', '/api/analytics/track',
    '/_next/', '/favicon.ico',
]

function isIpProtectedPath(pathname: string): boolean {
    for (const p of IP_WHITELIST_PUBLIC_PREFIXES) {
        if (pathname.startsWith(p)) return false
    }
    return pathname.startsWith('/dashboard') || pathname.startsWith('/api/')
}

const ALWAYS_PUBLIC_PATHS = [
    '/_next/',
    '/favicon.ico',
    '/public/',
    '/static/',
    '/_chrverify/',
    '/changerawr-domain-verification/',
    '/widget.css',
    '/widget-bundle.js'
]

// Server action honeypot tracking
const attemptTracker = new Map<string, number>()
const FUCK_OFF_THRESHOLD = 5 // I love this variable, sorry professionalists!

// Default allowed external domains for CDN resources
const DEFAULT_ALLOWED_EXTERNAL_DOMAINS = [
    'cloudflareinsights.com',
    'static.cloudflareinsights.com',
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'cdn.jsdelivr.net',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
]

// Get additional allowed domains from environment variable
function getAllowedExternalDomains(): string[] {
    const envDomains = process.env.ALLOWED_EXTERNAL_DOMAINS || ''
    const additionalDomains = envDomains.split(',').map(d => d.trim()).filter(Boolean)
    return [...DEFAULT_ALLOWED_EXTERNAL_DOMAINS, ...additionalDomains]
}

// Domain security config cache (60 second TTL)
interface DomainSecurityConfig {
    forceHttps: boolean
    fetchedAt: number
}

const domainSecurityCache = new Map<string, DomainSecurityConfig>()
const CACHE_TTL_MS = 60_000 // 60 seconds

async function getDomainSecurityConfig(hostname: string): Promise<DomainSecurityConfig | null> {
    // Check cache first
    const cached = domainSecurityCache.get(hostname)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached
    }

    try {
        const domain = await db.customDomain.findUnique({
            where: { domain: hostname },
            select: {
                forceHttps: true,
            },
        })

        if (!domain) {
            return null
        }

        const config: DomainSecurityConfig = {
            forceHttps: domain.forceHttps,
            fetchedAt: Date.now(),
        }

        domainSecurityCache.set(hostname, config)
        return config
    } catch (error) {
        console.error('[proxy] Error fetching domain security config:', error)
        return null
    }
}

const PUBLIC_API_PATHS = [
    '/api/auth/',
    '/api/setup/',
    '/api/check-setup',
    '/api/auth/oauth/',
]

const AUTH_ROUTES = ['/login', '/register', '/setup']

const PUBLIC_CONTENT_PATHS = [
    '/reset-password/',
    '/changelog/',
    '/unsubscribed',
    '/experiments/',
    '/forgot-password',
    '/two-factor',
    '/cli/auth',
]

function isAlwaysPublicPath(pathname: string): boolean {
    return ALWAYS_PUBLIC_PATHS.some(path => pathname.startsWith(path)) ||
        pathname.includes('.')
}

function isPublicApiPath(pathname: string): boolean {
    return PUBLIC_API_PATHS.some(path => pathname.startsWith(path))
}

function isPublicContentPath(pathname: string): boolean {
    return PUBLIC_CONTENT_PATHS.some(path => pathname.startsWith(path))
}

function isAllowedExternalDomain(hostname: string): boolean {
    const allowedDomains = getAllowedExternalDomains()
    return allowedDomains.some(domain =>
        hostname === domain || hostname.endsWith(`.${domain}`)
    )
}

function isCustomDomain(hostname: string): boolean {
    try {
        const appDomain = normalizeHostname(getAppDomain())

        if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
            return false
        }

        return hostname !== appDomain && !hostname.endsWith(`.${appDomain}`)
    } catch {
        return false
    }
}


function normalizeHostname(rawHost: string): string {
    const firstHost = rawHost.split(',')[0]?.trim().toLowerCase() || ''
    return firstHost.replace(/:\d+$/, '')
}

function handleCustomDomain(request: NextRequest, hostname: string, pathname: string): NextResponse {
    const url = request.nextUrl.clone()
    url.pathname = `/changelog/custom-domain/${encodeURIComponent(hostname)}${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
}

async function isSetupComplete(): Promise<boolean> {
    // Check environment variable first to avoid excessive API calls
    // Set SETUP_COMPLETE=true in your .env after initial setup is done
    if (process.env.SETUP_COMPLETE === 'true') {
        return true
    }

    const headers = new Headers({'x-middleware-check': 'true'})
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        // Support both HTTP and HTTPS URLs
        if (!baseUrl) return false

        const response = await fetch(`${baseUrl}/api/check-setup`, {headers})
        if (!response.ok) return false
        const data = await response.json()
        return !!data.isComplete
    } catch {
        return false
    }
}

export async function proxy(request: NextRequest) {
    const {pathname} = request.nextUrl
    const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
    const hostname = normalizeHostname(rawHost)

    // 🍯 HONEYPOT: Catch server action exploit attempts
    const nextAction = request.headers.get('next-action')
    if (nextAction) {
        const ip = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        // Track attempts per IP
        const currentAttempts = (attemptTracker.get(ip) || 0) + 1
        attemptTracker.set(ip, currentAttempts)

        // Log the attempt
        console.warn('🔒 [SECURITY] Server action exploit attempt:', {
            action: nextAction,
            ip,
            userAgent,
            attempts: currentAttempts,
            path: pathname,
            timestamp: new Date().toISOString(),
        })

        // If they've tried too many times, tell them to fuck off
        if (currentAttempts >= FUCK_OFF_THRESHOLD) {
            console.error(`🚫 [SECURITY] IP ${ip} exceeded attempt threshold (${currentAttempts} attempts)`)
            return new NextResponse(
                JSON.stringify({ error: 'Access denied. Stop trying to exploit this server, fuck off.' }),
                { status: 403, headers: { 'content-type': 'application/json' } }
            )
        }

        // Return a realistic unauthorized error
        return new NextResponse(
            JSON.stringify({ error: 'Unauthorized: Insufficient permissions' }),
            { status: 401, headers: { 'content-type': 'application/json' } }
        )
    }

    // ACME HTTP-01 challenge passthrough — MUST be first, before ANY redirects or auth checks.
    // Let's Encrypt validates challenges over both HTTP and HTTPS.
    if (pathname.startsWith('/.well-known/acme-challenge/')) {
        console.log(`[proxy] 🔐 ACME challenge request: ${hostname}${pathname}`)
        console.log(`[proxy]    Protocol: ${request.headers.get('x-forwarded-proto') || 'unknown'}`)
        return NextResponse.next()
    }

    // IP whitelist check — only applies to dashboard + API paths, never custom domains
    if (!isCustomDomain(hostname) && isIpProtectedPath(pathname)) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
        const ipConfig = await getIpConfig(baseUrl)
        if (ipConfig.enabled) {
            const clientIp = getClientIp(request)
            const allowed = ipConfig.whitelist.length === 0
                || ipConfig.whitelist.some(entry => ipMatchesCidr(clientIp, entry))
            if (!allowed) {
                return new NextResponse('Access denied', {
                    status: 403,
                    headers: { 'Content-Type': 'text/plain' },
                })
            }
        }
    }

    // Force HTTPS redirect for custom domains (production only)
    if (isCustomDomain(hostname) && process.env.NODE_ENV === 'production') {
        const securityConfig = await getDomainSecurityConfig(hostname)

        if (securityConfig?.forceHttps) {
            const proto = request.headers.get('x-forwarded-proto')

            // Redirect HTTP to HTTPS with 308 (preserves POST method)
            if (proto === 'http') {
                const url = request.nextUrl.clone()
                url.protocol = 'https:'
                // Ensure we redirect to the external custom hostname without internal app ports.
                url.host = hostname
                url.port = ''
                return NextResponse.redirect(url, 308)
            }
        }
    }

    // Allow requests to allowed external domains (CDNs, Cloudflare, etc.)
    // This fixes CORS issues with external scripts and resources
    if (isAllowedExternalDomain(hostname)) {
        const response = NextResponse.next()
        response.headers.set('Access-Control-Allow-Origin', '*')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isApiRequest = pathname.startsWith('/api/')

    if (isCustomDomain(hostname) && pathname === '/rss.xml') {
        const url = request.nextUrl.clone()
        url.pathname = `/changelog/custom-domain/${encodeURIComponent(hostname)}/rss.xml`
        return NextResponse.rewrite(url)
    }

    if (isAlwaysPublicPath(pathname)) {
        return NextResponse.next()
    }

    if (isCustomDomain(hostname)) {
        const encodedHostname = encodeURIComponent(hostname)

        // Prevent rewrite loops when middleware sees an already-rewritten internal pathname.
        if (pathname.startsWith(`/changelog/custom-domain/${encodedHostname}`)) {
            return NextResponse.next()
        }

        // ACME challenges must pass through for ALL domains (already handled above, but double-check)
        if (pathname.startsWith('/.well-known/acme-challenge/')) {
            return NextResponse.next()
        }

        if (pathname.startsWith('/api/')) {
            if (pathname.startsWith('/api/changelog/')) {
                return NextResponse.next()
            }
            return new NextResponse(null, {status: 404})
        }

        if (pathname === '/rss.xml') {
            const url = request.nextUrl.clone()
            url.pathname = `/changelog/custom-domain/${encodedHostname}/rss.xml`
            return NextResponse.rewrite(url)
        }

        return handleCustomDomain(request, hostname, pathname)
    }

    if (pathname === '/api/check-setup') {
        return NextResponse.next()
    }

    if (isPublicApiPath(pathname)) {
        return NextResponse.next()
    }

    if (pathname.startsWith('/api/')) {
        return NextResponse.next()
    }

    if (isPublicContentPath(pathname)) {
        return NextResponse.next()
    }

    if (pathname === '/setup') {
        const setupComplete = await isSetupComplete()
        if (setupComplete) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        return NextResponse.next()
    }

    const setupComplete = await isSetupComplete()
    if (!setupComplete) {
        return NextResponse.redirect(new URL('/setup', request.url))
    }

    const accessToken = request.cookies.get('accessToken')?.value
    const refreshToken = request.cookies.get('refreshToken')?.value

    if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
        if (accessToken) {
            try {
                const userId = await verifyAccessToken(accessToken)
                if (userId) {
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                }
            } catch {
            }
        }
        return NextResponse.next()
    }

    if (!accessToken) {
        if (refreshToken) {
            return NextResponse.next()
        }
        const url = new URL('/login', request.url)
        url.searchParams.set('from', pathname)
        return NextResponse.redirect(url)
    }

    try {
        const userId = await verifyAccessToken(accessToken)
        if (!userId) {
            if (refreshToken) {
                return NextResponse.next()
            }
            const url = new URL('/login', request.url)
            url.searchParams.set('from', pathname)
            return NextResponse.redirect(url)
        }

        const response = NextResponse.next()
        response.headers.set('x-user-id', userId)
        return response
    } catch {
        if (refreshToken) {
            return NextResponse.next()
        }
        const url = new URL('/login', request.url)
        url.searchParams.set('from', pathname)
        return NextResponse.redirect(url)
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
