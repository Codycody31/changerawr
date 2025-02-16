import { NextResponse } from 'next/server'
import { refreshAccessToken } from '@/lib/auth/tokens'
import { z } from 'zod'
import { cookies } from 'next/headers'
import {Role} from "@prisma/client";

// Define types for the refresh token response
export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        name: string | null;
        role: Role;
    };
}

const refreshSchema = z.object({
    refreshToken: z.string(),
})

export async function POST(request: Request) {
    try {
        // Try to get refresh token from cookies first
        const cookieStore = await cookies()
        const refreshTokenCookie = cookieStore.get('refreshToken')

        let refreshToken: string | undefined;

        // If no cookie, try to parse request body
        if (!refreshTokenCookie) {
            try {
                const body = await request.json()
                const parsed = refreshSchema.parse(body)
                refreshToken = parsed.refreshToken
            } catch {
                // If body parsing fails, return error
                return NextResponse.json(
                    { error: 'No refresh token provided' },
                    { status: 401 }
                )
            }
        } else {
            refreshToken = refreshTokenCookie.value
        }

        // Validate refresh token
        if (!refreshToken) {
            return NextResponse.json(
                { error: 'Invalid refresh token' },
                { status: 401 }
            )
        }

        const result = await refreshAccessToken(refreshToken) as RefreshTokenResponse
        if (!result) {
            return NextResponse.json(
                { error: 'Invalid refresh token' },
                { status: 401 }
            )
        }

        // Set new access token in response
        const response = NextResponse.json(result)

        // Set new refresh token as cookie
        response.cookies.set('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        })

        return response
    } catch (error) {
        console.error('Refresh error:', error)
        return NextResponse.json(
            { error: 'An error occurred while refreshing the token' },
            { status: 500 }
        )
    }
}