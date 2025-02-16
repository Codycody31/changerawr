import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { generateTokens } from '@/lib/auth/tokens'
import { LoginCredentials, LoginResponse } from '@/lib/types/auth'
import { z } from 'zod'

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
}) satisfies z.Schema<LoginCredentials>

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, password } = loginSchema.parse(body)

        const user = await db.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                password: true,
                name: true,
                role: true,
                lastLoginAt: true,
            },
        })

        if (!user) {
            // Simulate password check to prevent timing attacks
            await verifyPassword(password, '$2b$10$invalidHashToPreventTimingAttack')

            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            )
        }

        const isValidPassword = await verifyPassword(password, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            )
        }

        // Update last login timestamp
        await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        })

        // Clean up old refresh tokens
        await db.refreshToken.deleteMany({
            where: {
                userId: user.id,
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { invalidated: true },
                ],
            },
        })

        // Generate new tokens
        const tokens = await generateTokens(user.id)

        const response: LoginResponse = {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                lastLoginAt: user.lastLoginAt,
            },
            ...tokens,
        }

        // Create a response with the user data and set cookies
        const nextResponse = NextResponse.json(response)

        // Set access token as an HTTP-only cookie
        nextResponse.cookies.set('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60, // 1 hour
        })

        // Set refresh token as an HTTP-only cookie
        nextResponse.cookies.set('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        })

        return nextResponse
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                },
                { status: 400 }
            )
        }

        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'An unexpected error occurred during login' },
            { status: 500 }
        )
    }
}

// Optional: Add rate limiting middleware or additional security checks
export async function GET() {
    return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
    )
}