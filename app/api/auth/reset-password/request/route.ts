import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { createPasswordResetAndSendEmail } from '@/lib/services/auth/password-reset';

/**
 * @method POST
 * @description Initiates a password reset for the currently logged-in user
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "message": { "type": "string" }
 *   }
 * }
 * @error 401 Unauthorized - User not authenticated
 * @error 500 An unexpected error occurred while initiating password reset
 */
export async function POST() {
    try {
        const user = await validateAuthAndGetUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not authenticated' },
                { status: 401 }
            );
        }

        // Use the existing password reset service
        const result = await createPasswordResetAndSendEmail({
            email: user.email
        });

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Password reset email sent successfully'
        });
    } catch (error) {
        console.error('Failed to initiate password reset:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to initiate password reset' },
            { status: 500 }
        );
    }
}