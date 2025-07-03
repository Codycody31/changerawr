import {NextRequest, NextResponse} from 'next/server';
import {verifyAccessToken} from '@/lib/auth/tokens';
import {db} from '@/lib/db';

/**
 * @method GET
 * @description Validate JWT access token and return user information
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "valid": {
 *       "type": "boolean",
 *       "example": true
 *     },
 *     "user": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "email": { "type": "string" },
 *         "name": { "type": "string" },
 *         "role": { "type": "string" }
 *       }
 *     },
 *     "expires_in": {
 *       "type": "number",
 *       "description": "Seconds until token expires"
 *     }
 *   }
 * }
 * @error 401 Invalid or expired token
 * @error 404 User not found
 * @error 500 Internal server error
 * @secure bearerAuth
 */
export async function GET(request: NextRequest) {
    try {
        // Extract Bearer token from Authorization header
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                {
                    valid: false,
                    error: 'Missing or invalid Authorization header'
                },
                {status: 401}
            );
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify the access token
        const userId = await verifyAccessToken(token);

        if (!userId) {
            return NextResponse.json(
                {
                    valid: false,
                    error: 'Invalid or expired token'
                },
                {status: 401}
            );
        }

        // Fetch user data
        const user = await db.user.findUnique({
            where: {id: userId},
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                {
                    valid: false,
                    error: 'User not found'
                },
                {status: 404}
            );
        }

        // Calculate token expiration (tokens are valid for 15 minutes)
        // This is an approximation since we don't have exact expiration from JWT
        const expiresIn = 15 * 60; // 15 minutes in seconds

        return NextResponse.json({
            valid: true,
            user,
            expires_in: expiresIn,
        });

    } catch (error) {
        console.error('Token validation error:', error);

        return NextResponse.json(
            {
                valid: false,
                error: 'Token validation failed'
            },
            {status: 500}
        );
    }
}