import { SignJWT, jwtVerify } from 'jose'
import { db } from '../db'
import { nanoid } from 'nanoid'

const ACCESS_SECRET = new TextEncoder().encode(
    process.env.JWT_ACCESS_SECRET || 'your-access-secret-key'
)

export async function generateTokens(userId: string) {
    // Generate access token (short-lived - 15 minutes)
    const accessToken = await new SignJWT({ userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('15m')
        .setIssuedAt()
        .sign(ACCESS_SECRET)

    // Generate refresh token (long-lived - 7 days)
    const refreshToken = nanoid(64)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Store refresh token in database
    await db.refreshToken.create({
        data: {
            userId,
            token: refreshToken,
            expiresAt,
        },
    })

    return {
        accessToken,
        refreshToken
    }
}

export async function verifyAccessToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, ACCESS_SECRET)
        return payload.userId as string
    } catch {
        return null
    }
}

export async function refreshAccessToken(refreshToken: string) {
    const storedToken = await db.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
    })

    if (!storedToken || storedToken.invalidated || storedToken.expiresAt < new Date()) {
        // Invalidate all refresh tokens for this user if token is compromised
        if (storedToken) {
            await db.refreshToken.updateMany({
                where: { userId: storedToken.userId },
                data: { invalidated: true }
            })
        }
        return null
    }

    // Generate new access token
    const accessToken = await new SignJWT({ userId: storedToken.userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('15m')
        .setIssuedAt()
        .sign(ACCESS_SECRET)

    return {
        accessToken,
        user: {
            id: storedToken.user.id,
            email: storedToken.user.email,
            name: storedToken.user.name,
            role: storedToken.user.role,
        }
    }
}