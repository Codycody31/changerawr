import { NextResponse } from 'next/server'
import { refreshAccessToken } from '@/lib/auth/tokens'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { Role } from "@prisma/client"

// Improved type definitions with strict null checks
interface User {
    id: string
    email: string
    name: string | null
    role: Role
}

interface RefreshTokenResponse {
    accessToken: string
    refreshToken: string
    user: User
}

interface ErrorResponse {
    error: string
    details?: Record<string, unknown>
}

// Enhanced validation schema
const refreshSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
})

export async function POST(request: Request) {
    try {
        let refreshToken: string | undefined

        // First try to get refresh token from cookies
        const cookieStore = await cookies()
        const refreshTokenCookie = cookieStore.get('refreshToken')

        if (refreshTokenCookie?.value) {
            refreshToken = refreshTokenCookie.value
        } else {
            // If no cookie, try to get from request body
            try {
                const body = await request.json()
                const { refreshToken: bodyToken } = refreshSchema.parse(body)
                refreshToken = bodyToken
            } catch (error) {
                const response: ErrorResponse = {
                    error: 'Invalid refresh token request',
                    details: error instanceof z.ZodError
                        ? { validation: error.errors }
                        : { message: 'Failed to parse request body' }
                }
                return NextResponse.json(response, { status: 400 })
            }
        }

        // Ensure we have a refresh token
        if (!refreshToken) {
            return NextResponse.json({
                error: 'No refresh token provided'
            }, { status: 401 })
        }

        // Attempt to refresh the token
        const result = await refreshAccessToken(refreshToken)

        if (!result) {
            // Clear invalid refresh token cookie
            const response = NextResponse.json({
                error: 'Invalid or expired refresh token'
            }, { status: 401 })

            response.cookies.delete('refreshToken')
            response.cookies.delete('accessToken')

            return response
        }

        // Type guard to ensure result matches expected shape
        if (!isValidRefreshResponse(result)) {
            // Create error response and clear cookies
            const response = NextResponse.json({
                error: 'Invalid refresh token response format'
            }, { status: 500 })

            response.cookies.delete('refreshToken')
            response.cookies.delete('accessToken')

            return response
        }

        // Create response with new tokens
        const response = NextResponse.json(result)

        // Set new access token cookie
        response.cookies.set('accessToken', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60, // 15 minutes
            path: '/'
        })

        // Set new refresh token cookie
        response.cookies.set('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/'
        })

        return response
    } catch (error) {
        console.error('Token refresh error:', error)

        // Clear cookies on error
        const response = NextResponse.json({
            error: 'Failed to refresh token',
            details: process.env.NODE_ENV === 'development'
                ? { message: error instanceof Error ? error.message : 'Unknown error' }
                : undefined
        }, { status: 500 })

        response.cookies.delete('refreshToken')
        response.cookies.delete('accessToken')

        return response
    }
}

// Runtime type validation helper
function isValidRefreshResponse(response: unknown): response is RefreshTokenResponse {
    return !!(
        response &&
        typeof response === 'object' &&
        'accessToken' in response &&
        'refreshToken' in response &&
        'user' in response &&
        response.user &&
        typeof response.user === 'object' &&
        'id' in response.user &&
        'email' in response.user &&
        'role' in response.user &&
        ('name' in response.user && (response.user.name === null || typeof response.user.name === 'string'))
    )
}

// Block other HTTP methods
export async function GET() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}