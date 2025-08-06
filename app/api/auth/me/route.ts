import {NextResponse} from 'next/server'
import {cookies, headers} from 'next/headers'
import {verifyAccessToken} from '@/lib/auth/tokens'
import {db} from '@/lib/db'

/**
 * @method GET
 * @description Verifies the access token and retrieves the user's data
 * @path /api/user
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "email": { "type": "string" },
 *     "name": { "type": "string" },
 *     "role": { "type": "string" }
 *   }
 * }
 * @error 401 Unauthorized - Invalid or expired access token
 * @error 404 User not found
 * @error 500 An unexpected error occurred during authentication
 */
export async function GET() {
    try {
        // Check for Bearer token (API key) first
        const headersList = await headers();
        const authHeader = headersList.get('authorization');

        if (authHeader?.startsWith('Bearer ')) {
            const apiKey = authHeader.substring(7);

            // Log the received API key for debugging
            // console.log('Received API key:', apiKey);

            // First, let's check if the key exists at all ( used for debugging )
            // const checkKey = await db.apiKey.findFirst({
            //     where: {
            //         key: apiKey
            //     }
            // });

            // console.log('Basic key check result:', checkKey);

            // Now, let's try the full validation :)
            const validApiKey = await db.apiKey.findFirst({
                where: {
                    key: apiKey,
                    OR: [
                        {expiresAt: null},
                        {expiresAt: {gt: new Date()}}
                    ],
                    isRevoked: false
                }
            });

            if (!validApiKey) {
                return NextResponse.json({
                    error: 'Invalid API key',
                    details: 'Key not found or invalid'
                }, {status: 401});
            }

            // Update last used timestamp
            await db.apiKey.update({
                where: {id: validApiKey.id},
                data: {lastUsed: new Date()}
            });

            // Return admin user data for API keys
            return NextResponse.json({
                id: validApiKey.userId,
                email: 'api.key@changerawr.sys',
                role: 'ADMIN',
                name: 'API Key'
            });
        }

        // Fall back to cookie authentication
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;

        if (!accessToken) {
            return NextResponse.json({error: 'No token'}, {status: 401});
        }

        // Verify token
        const userId = await verifyAccessToken(accessToken);
        if (!userId) {
            return NextResponse.json({error: 'Invalid token'}, {status: 401});
        }

        // Fetch user data
        const user = await db.user.findUnique({
            where: {id: userId},
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            }
        });

        if (!user) {
            return NextResponse.json({error: 'User not found'}, {status: 404});
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Authentication error:', error);
        return NextResponse.json({error: 'Authentication failed'}, {status: 500});
    }
}