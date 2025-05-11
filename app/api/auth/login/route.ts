import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { generateTokens } from '@/lib/auth/tokens'
import { createAuditLog } from '@/lib/utils/auditLog' // Add this import
import { z } from 'zod'

/**
 * Schema for validating login request body.
 */
const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
})

/**
 * Handles user authentication and returns access tokens
 * @method POST
 * @description Authenticates a user with email and password, returning JWT tokens and user data
 * @body {
 *   "type": "object",
 *   "required": ["email", "password"],
 *   "properties": {
 *     "email": {
 *       "type": "string",
 *       "format": "email",
 *       "description": "User's email address"
 *     },
 *     "password": {
 *       "type": "string",
 *       "minLength": 8,
 *       "description": "User's password"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "user": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "email": { "type": "string" },
 *         "name": { "type": "string" },
 *         "role": { "type": "string" },
 *         "lastLoginAt": { "type": "string", "format": "date-time" }
 *       }
 *     },
 *     "accessToken": { "type": "string" },
 *     "refreshToken": { "type": "string" }
 *   }
 * }
 * @response 403 {
 *   "type": "object",
 *   "properties": {
 *     "requiresSecondFactor": { "type": "boolean" },
 *     "secondFactorType": { "type": "string", "enum": ["passkey", "password"] },
 *     "message": { "type": "string" }
 *   }
 * }
 * @error 400 Validation failed - Invalid email or password format
 * @error 401 Invalid credentials
 * @error 500 An unexpected error occurred during login
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        // Log login attempt before validation
        let attemptLogId: string | null = null;
        try {
            // Use a placeholder ID for the login attempt since we don't know the user yet
            const placeholderId = 'login-attempt-' + Date.now().toString()

            const attemptLog = await db.auditLog.create({
                data: {
                    action: 'LOGIN_ATTEMPT',
                    userId: placeholderId,
                    targetUserId: placeholderId, // Using placeholder to avoid FK constraint
                    details: JSON.stringify({
                        email: body.email,
                        ipAddress,
                        userAgent,
                        timestamp: new Date().toISOString()
                    })
                }
            });
            attemptLogId = attemptLog.id;
        } catch (auditLogError) {
            console.error('Failed to create login attempt audit log:', auditLogError);
            // Continue with login process even if audit logging fails
        }

        try {
            const { email, password } = loginSchema.parse(body)

            // Find user and include necessary fields
            const user = await db.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    email: true,
                    password: true,
                    name: true,
                    role: true,
                    lastLoginAt: true,
                    twoFactorMode: true,
                },
            })

            if (!user) {
                // User not found - log the failed login attempt
                try {
                    await createAuditLog(
                        'LOGIN_FAILURE',
                        'system',  // No user ID available
                        'system',  // No user ID available
                        {
                            reason: 'USER_NOT_FOUND',
                            email,
                            ipAddress,
                            userAgent,
                            timestamp: new Date().toISOString(),
                            attemptLogId
                        }
                    );
                } catch (auditLogError) {
                    console.error('Failed to create login failure audit log:', auditLogError);
                }

                // Simulate password check to prevent timing attacks
                await verifyPassword(password, '$2b$10$invalidHashToPreventTimingAttack')
                return NextResponse.json(
                    { error: 'Invalid credentials' },
                    { status: 401 }
                )
            }

            // Update the original login attempt log with the correct user ID
            if (attemptLogId) {
                try {
                    await db.auditLog.update({
                        where: { id: attemptLogId },
                        data: {
                            userId: user.id,
                            targetUserId: user.id
                        }
                    });
                } catch (updateError) {
                    console.error('Failed to update login attempt audit log:', updateError);
                }
            }

            const isValidPassword = await verifyPassword(password, user.password)
            if (!isValidPassword) {
                // Invalid password - log the failed login attempt
                try {
                    await createAuditLog(
                        'LOGIN_FAILURE',
                        user.id,
                        user.id,
                        {
                            reason: 'INVALID_PASSWORD',
                            email: user.email,
                            ipAddress,
                            userAgent,
                            timestamp: new Date().toISOString(),
                            attemptLogId
                        }
                    );
                } catch (auditLogError) {
                    console.error('Failed to create invalid password audit log:', auditLogError);
                }

                return NextResponse.json(
                    { error: 'Invalid credentials' },
                    { status: 401 }
                )
            }

            // Check if user requires second factor
            if (user.twoFactorMode === 'PASSWORD_PLUS_PASSKEY') {
                // Create a temporary token to track the first factor completion
                const firstFactorToken = await db.twoFactorSession.create({
                    data: {
                        userId: user.id,
                        type: 'PASSWORD_PLUS_PASSKEY',
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
                    },
                })

                // Log the successful first factor auth
                try {
                    await createAuditLog(
                        'LOGIN_FIRST_FACTOR_SUCCESS',
                        user.id,
                        user.id,
                        {
                            email: user.email,
                            twoFactorMode: user.twoFactorMode,
                            sessionToken: firstFactorToken.id,
                            ipAddress,
                            userAgent,
                            timestamp: new Date().toISOString(),
                            attemptLogId
                        }
                    );
                } catch (auditLogError) {
                    console.error('Failed to create first factor success audit log:', auditLogError);
                }

                return NextResponse.json(
                    {
                        requiresSecondFactor: true,
                        secondFactorType: 'passkey',
                        sessionToken: firstFactorToken.id,
                        message: 'Additional verification required'
                    },
                    { status: 403 }
                )
            }

            // Regular login flow (no 2FA or passkey-first login)
            return await completeLogin(user.id, email, ipAddress, userAgent, attemptLogId)
        } catch (validationError) {
            if (validationError instanceof z.ZodError) {
                // Log validation error
                try {
                    await createAuditLog(
                        'LOGIN_VALIDATION_ERROR',
                        'system',  // No user ID available
                        'system',  // No user ID available
                        {
                            errors: validationError.errors.map(e => ({
                                path: e.path.join('.'),
                                message: e.message
                            })),
                            email: body.email,
                            ipAddress,
                            userAgent,
                            timestamp: new Date().toISOString(),
                            attemptLogId
                        }
                    );
                } catch (auditLogError) {
                    console.error('Failed to create validation error audit log:', auditLogError);
                }

                return NextResponse.json(
                    {
                        error: 'Validation failed',
                        details: validationError.errors.map(e => ({
                            path: e.path.join('.'),
                            message: e.message
                        }))
                    },
                    { status: 400 }
                )
            }
            throw validationError; // Re-throw if it's not a ZodError
        }
    } catch (error) {
        console.error('Login error:', error)

        // Log unexpected login error
        try {
            await createAuditLog(
                'LOGIN_ERROR',
                'system',  // No user ID available
                'system',  // No user ID available
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create login error audit log:', auditLogError);
        }

        return NextResponse.json(
            { error: 'An unexpected error occurred during login' },
            { status: 500 }
        )
    }
}

// Helper function to complete login and set tokens
async function completeLogin(
    userId: string,
    email?: string,
    ipAddress?: string,
    userAgent?: string,
    attemptLogId?: string | null
) {
    try {
        // Update last login timestamp and clean up old refresh tokens
        await db.$transaction([
            db.user.update({
                where: { id: userId },
                data: { lastLoginAt: new Date() }
            }),
            db.refreshToken.deleteMany({
                where: {
                    userId: userId,
                    OR: [
                        { expiresAt: { lt: new Date() } },
                        { invalidated: true },
                    ],
                },
            })
        ])

        // Generate new tokens
        const tokens = await generateTokens(userId)

        // Get user data for response
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                lastLoginAt: true,
            }
        })

        if (!user) {
            throw new Error('User not found after successful authentication');
        }

        // Log successful login
        try {
            await createAuditLog(
                'LOGIN_SUCCESS',
                userId,
                userId,
                {
                    email: user.email,
                    role: user.role,
                    ipAddress,
                    userAgent,
                    timestamp: new Date().toISOString(),
                    tokenGenerated: true,
                    lastLoginAt: user.lastLoginAt?.toISOString(),
                    attemptLogId
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create login success audit log:', auditLogError);
        }

        // Create response with user data
        const response = {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                lastLoginAt: user.lastLoginAt,
            },
            ...tokens,
        }

        // Create response and set cookies
        const nextResponse = NextResponse.json(response)

        // Set access token as HTTP-only cookie
        nextResponse.cookies.set('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60, // 15 minutes
        })

        // Set refresh token as HTTP-only cookie
        nextResponse.cookies.set('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        })

        return nextResponse
    } catch (error) {
        // Log token generation or login completion error
        try {
            await createAuditLog(
                'LOGIN_COMPLETION_ERROR',
                userId,
                userId,
                {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    email,
                    ipAddress,
                    userAgent,
                    timestamp: new Date().toISOString(),
                    attemptLogId
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create login completion error audit log:', auditLogError);
        }

        throw error; // Re-throw to be caught by the main try-catch
    }
}

/**
 * @method GET
 * @description Method not allowed - Login endpoint only accepts POST requests
 * @response 405 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Method not allowed"
 *     }
 *   }
 * }
 */
export async function GET(request: Request) {
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Log invalid method attempt
    try {
        await createAuditLog(
            'LOGIN_INVALID_METHOD',
            'system',
            'system',
            {
                method: 'GET',
                ipAddress,
                userAgent,
                timestamp: new Date().toISOString()
            }
        );
    } catch (auditLogError) {
        console.error('Failed to create invalid method audit log:', auditLogError);
    }

    return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
    )
}