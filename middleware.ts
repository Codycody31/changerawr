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
    '/_next',
    '/favicon.ico',
    '/public'
]

// Routes that should redirect to /dashboard if authenticated
const AUTH_ROUTES = ['/login', '/register']

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Always allow API routes
    if (pathname.startsWith('/api/')) {
        return NextResponse.next()
    }

    // Check if the path is public
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
        return NextResponse.next()
    }

    // Check for authentication token in cookies
    const accessToken = request.cookies.get('accessToken')?.value
    const refreshToken = request.cookies.get('refreshToken')?.value

    // Logging for debugging
    console.log('Middleware Debug:')
    console.log('Path:', pathname)
    console.log('Access Token Present:', !!accessToken)
    console.log('Refresh Token Present:', !!refreshToken)

    // Handle authentication routes
    if (AUTH_ROUTES.includes(pathname)) {
        if (accessToken) {
            try {
                const userId = await verifyAccessToken(accessToken)
                if (userId) {
                    console.log('Already authenticated, would redirect to dashboard')
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                }
            } catch (error) {
                console.log('Access Token verification failed:', error)
                // Continue to login if token is invalid
            }
        }
        return NextResponse.next()
    }

    // Protect other routes
    if (!accessToken) {
        console.log('No access token found')

        // If refresh token exists, allow continuation to potentially refresh
        if (refreshToken) {
            console.log('Refresh token present, allowing request to potentially refresh')
            return NextResponse.next()
        }

        // Redirect to login with original path
        console.log('Redirecting to login')
        const url = new URL('/login', request.url)
        url.searchParams.set('from', pathname)
        return NextResponse.redirect(url)
    }

    // Verify access token
    try {
        const userId = await verifyAccessToken(accessToken)
        if (!userId) {
            console.log('Invalid access token')

            // If refresh token exists, allow request to potentially refresh
            if (refreshToken) {
                console.log('Refresh token present, allowing request to potentially refresh')
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
    } catch (error) {
        console.log('Token verification error:', error)

        // If refresh token exists, allow request to potentially refresh
        if (refreshToken) {
            console.log('Refresh token present, allowing request to potentially refresh')
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