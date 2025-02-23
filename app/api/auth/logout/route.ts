import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

/**
 * @method POST
 * @description Clears the access and refresh tokens, and optionally invalidates the refresh token in the database
 * @path /api/logout
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean", "example": true }
 *   }
 * }
 * @error 500 An unexpected error occurred while logging out
 */
export async function POST() {
    try {
        const cookieStore = await cookies()

        // Clear access token cookie
        cookieStore.delete('accessToken')

        // Clear refresh token cookie
        cookieStore.delete('refreshToken')

        // Optionally, invalidate refresh token in the database if you're tracking them
        const refreshToken = cookieStore.get('refreshToken')?.value
        if (refreshToken) {
            await db.refreshToken.updateMany({
                where: { token: refreshToken },
                data: { invalidated: true }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
    }
}