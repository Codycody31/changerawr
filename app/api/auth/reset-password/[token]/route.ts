import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
    validatePasswordResetToken,
    resetPassword
} from '@/lib/services/auth/password-reset';

// Validation schema for password reset
const resetPasswordSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

/**
 * @method GET
 * @description Validates a password reset token
 * @path /api/auth/reset-password/[token]
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "valid": {
 *       "type": "boolean"
 *     },
 *     "email": {
 *       "type": "string"
 *     }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "valid": {
 *       "type": "boolean",
 *       "example": false
 *     },
 *     "message": {
 *       "type": "string",
 *       "example": "Invalid or expired reset token"
 *     }
 *   }
 * }
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ token: string }> }
) {
    const { token } = await context.params;

    const validation = await validatePasswordResetToken(token);

    if (!validation.valid) {
        return NextResponse.json(validation, { status: 400 });
    }

    return NextResponse.json({
        valid: true,
        email: validation.email,
    });
}

/**
 * @method POST
 * @description Resets a user's password using a valid token
 * @path /api/auth/reset-password/[token]
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "password": {
 *       "type": "string",
 *       "minLength": 8,
 *       "description": "New password"
 *     },
 *     "confirmPassword": {
 *       "type": "string",
 *       "description": "Confirm new password"
 *     }
 *   },
 *   "required": ["password", "confirmPassword"]
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": {
 *       "type": "boolean"
 *     },
 *     "message": {
 *       "type": "string"
 *     }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string"
 *     }
 *   }
 * }
 * @error 500 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string"
 *     }
 *   }
 * }
 */
export async function POST(
    request: Request,
    context: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await context.params;
        const body = await request.json();

        const { password } = resetPasswordSchema.parse(body);

        const result = await resetPassword(token, password);

        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Password reset error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.errors[0].message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to reset password' },
            { status: 500 }
        );
    }
}