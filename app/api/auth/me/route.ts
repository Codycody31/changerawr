import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/tokens'
import { db } from '@/lib/db'

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