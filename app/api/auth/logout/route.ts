import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

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