import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/tokens'
import { db } from '@/lib/db'

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
        // Get access token from cookies
        const cookieStore = await cookies()
        const accessToken = cookieStore.get('accessToken')?.value

        if (!accessToken) {
            return NextResponse.json({ error: 'No token' }, { status: 401 })
        }

        // Verify token
        const userId = await verifyAccessToken(accessToken)
        if (!userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        // Fetch user data
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error('Authentication error:', error)
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
    }
}