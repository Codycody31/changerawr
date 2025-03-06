// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/tokens'

// Routes that don't require authentication
const PUBLIC_PATHS = [
    '/login',
    '/register',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/preview',
    '/api/auth/oauth/providers',
    '/api/auth/oauth/authorize',
    '/api/auth/oauth/callback',
    '/api/setup/status',
    '/api/check-setup', // Dedicated route for setup checks
    '/_next',
    '/favicon.ico',
    '/public',
    '/widget.css',
    '/widget-bundle.js'
]

// Routes that should redirect to /dashboard if authenticated
const AUTH_ROUTES = ['/login', '/register', '/setup']

// Separate setup check function
async function isSetupComplete(request: NextRequest): Promise<boolean> {
    // Use a special header to prevent circular requests
    const headers = new Headers({
        'x-middleware-check': 'true'
    });

    try {
        // Use absolute URL to ensure we're hitting the correct endpoint
        const baseUrl = request.nextUrl.origin;
        const response = await fetch(`${baseUrl}/api/check-setup`, { headers });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        return !!data.isComplete;
    } catch (error) {
        console.error('Setup check failed:', error);
        return false; // Default to showing setup page on error
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Skip middleware for the setup check endpoint to avoid recursion
    if (pathname === '/api/check-setup') {
        return NextResponse.next();
    }

    // Always allow API routes
    if (pathname.startsWith('/api/')) {
        return NextResponse.next()
    }

    // Always allow public changelog routes
    if (pathname.startsWith('/changelog/')) {
        return NextResponse.next()
    }

    // Always allow public experiment routes
    if (pathname.startsWith('/experiments/')) {
        return NextResponse.next()
    }

    // Check if the path is public
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
        return NextResponse.next()
    }

    // Special handling for setup route
    if (pathname === '/setup') {
        const setupComplete = await isSetupComplete(request);

        if (setupComplete) {
            // If setup is complete, redirect to login
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // Allow access to setup if not complete
        return NextResponse.next()
    }

    // Check for authentication token in cookies
    const accessToken = request.cookies.get('accessToken')?.value
    const refreshToken = request.cookies.get('refreshToken')?.value

    // Handle authentication routes
    if (AUTH_ROUTES.includes(pathname)) {
        if (accessToken) {
            try {
                const userId = await verifyAccessToken(accessToken)
                if (userId) {
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                }
            } catch (error) {
                console.error('Access Token verification failed:', error)
            }
        }
        return NextResponse.next()
    }

    // For non-setup routes, check if setup is complete
    if (pathname !== '/setup') {
        const setupComplete = await isSetupComplete(request);

        if (!setupComplete) {
            // Redirect to setup if system is not initialized
            return NextResponse.redirect(new URL('/setup', request.url))
        }
    }

    // Protect other routes
    if (!accessToken) {
        // If refresh token exists, allow continuation to potentially refresh
        if (refreshToken) {
            return NextResponse.next()
        }

        // Redirect to login with original path
        const url = new URL('/login', request.url)
        url.searchParams.set('from', pathname)
        return NextResponse.redirect(url)
    }

    // Verify access token
    try {
        const userId = await verifyAccessToken(accessToken)
        if (!userId) {
            // If refresh token exists, allow request to potentially refresh
            if (refreshToken) {
                return NextResponse.next()
            }

            // Redirect to login
            const url = new URL('/login', request.url)
            url.searchParams.set('from', pathname)
            return NextResponse.redirect(url)
        }

        // Add user ID to request for downstream use
        const response = NextResponse.next()
        response.headers.set('x-user-id', userId)
        return response
    } catch (error: unknown) {
        console.error((error as Error).stack);
        // If refresh token exists, allow request to potentially refresh
        if (refreshToken) {
            return NextResponse.next()
        }

        // Redirect to login
        const url = new URL('/login', request.url)
        url.searchParams.set('from', pathname)
        return NextResponse.redirect(url)
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}