import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {generateTokens} from '@/lib/auth/tokens';

const tokenExchangeSchema = z.object({
    code: z.string().min(1, 'Authorization code is required'),
    expires: z.string().min(1, 'Expiration timestamp is required'),
});

/**
 * @method POST
 * @description Exchange CLI authorization code for JWT tokens
 * @body {
 *   "type": "object",
 *   "required": ["code", "expires"],
 *   "properties": {
 *     "code": {
 *       "type": "string",
 *       "description": "Temporary authorization code from CLI auth flow"
 *     },
 *     "expires": {
 *       "type": "string",
 *       "description": "Expiration timestamp of the authorization code"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "access_token": {
 *       "type": "string",
 *       "description": "JWT access token"
 *     },
 *     "refresh_token": {
 *       "type": "string",
 *       "description": "JWT refresh token"
 *     },
 *     "expires_in": {
 *       "type": "number",
 *       "description": "Access token expiration time in seconds"
 *     },
 *     "token_type": {
 *       "type": "string",
 *       "example": "Bearer"
 *     },
 *     "user": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "email": { "type": "string" },
 *         "name": { "type": "string" },
 *         "role": { "type": "string" }
 *       }
 *     }
 *   }
 * }
 * @error 400 Invalid or expired authorization code
 * @error 404 Authorization code not found
 * @error 500 Internal server error
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {code, expires} = tokenExchangeSchema.parse(body);

        // Find the authorization code in the database
        const authCode = await db.cliAuthCode.findUnique({
            where: {code},
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                    },
                },
            },
        });

        if (!authCode) {
            return NextResponse.json(
                {error: 'Invalid authorization code'},
                {status: 404}
            );
        }

        // Check if the code has expired
        if (authCode.expiresAt < new Date()) {
            // Clean up expired code
            await db.cliAuthCode.delete({
                where: {code},
            });

            return NextResponse.json(
                {error: 'Authorization code has expired'},
                {status: 400}
            );
        }

        // Check if the code has already been used
        if (authCode.usedAt) {
            return NextResponse.json(
                {error: 'Authorization code has already been used'},
                {status: 400}
            );
        }

        // Verify the expires parameter matches
        const providedExpires = new Date(expires);
        if (Math.abs(authCode.expiresAt.getTime() - providedExpires.getTime()) > 1000) {
            return NextResponse.json(
                {error: 'Invalid expiration timestamp'},
                {status: 400}
            );
        }

        // Generate JWT tokens
        const tokens = await generateTokens(authCode.user.id);

        // Mark the authorization code as used
        await db.cliAuthCode.update({
            where: {code},
            data: {usedAt: new Date()},
        });

        // Update user's last login time
        await db.user.update({
            where: {id: authCode.user.id},
            data: {lastLoginAt: new Date()},
        });

        // Return tokens in OAuth2-compatible format
        return NextResponse.json({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expires_in: 60 * 60, // 60 minutes in seconds
            token_type: 'Bearer',
            user: authCode.user,
        });

    } catch (error) {
        console.error('CLI token exchange error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {error: 'Invalid request format', details: error.errors},
                {status: 400}
            );
        }

        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        );
    }
}