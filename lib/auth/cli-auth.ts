import { nanoid } from 'nanoid';
import { db } from '@/lib/db';

/**
 * Generate a temporary authorization code for CLI authentication
 * @param userId - The user ID to associate with the code
 * @param callbackUrl - The CLI callback URL
 * @returns Object containing the code and expiration time
 */
export async function generateCLIAuthCode(userId: string, callbackUrl: string) {
    // Generate a secure random code
    const code = nanoid(32);

    // Set expiration to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Clean up any existing expired codes for this user
    await db.cliAuthCode.deleteMany({
        where: {
            userId,
            expiresAt: {
                lt: new Date(),
            },
        },
    });

    // Create the new authorization code
    const authCode = await db.cliAuthCode.create({
        data: {
            code,
            userId,
            callbackUrl,
            expiresAt,
        },
    });

    return {
        code: authCode.code,
        expires: authCode.expiresAt.getTime(),
        expiresAt: authCode.expiresAt,
    };
}

/**
 * Validate and consume a CLI authorization code
 * @param code - The authorization code to validate
 * @returns User information if valid, null if invalid
 */
export async function validateCLIAuthCode(code: string) {
    const authCode = await db.cliAuthCode.findUnique({
        where: { code },
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
        return null;
    }

    // Check if expired
    if (authCode.expiresAt < new Date()) {
        // Clean up expired code
        await db.cliAuthCode.delete({
            where: { code },
        });
        return null;
    }

    // Check if already used
    if (authCode.usedAt) {
        return null;
    }

    return {
        code: authCode.code,
        user: authCode.user,
        callbackUrl: authCode.callbackUrl,
        expiresAt: authCode.expiresAt,
    };
}

/**
 * Mark a CLI authorization code as used
 * @param code - The authorization code to mark as used
 */
export async function markCLIAuthCodeAsUsed(code: string) {
    await db.cliAuthCode.update({
        where: { code },
        data: { usedAt: new Date() },
    });
}

/**
 * Clean up expired CLI authorization codes
 * This should be called periodically to prevent database bloat
 */
export async function cleanupExpiredCLIAuthCodes() {
    const result = await db.cliAuthCode.deleteMany({
        where: {
            OR: [
                {
                    expiresAt: {
                        lt: new Date(),
                    },
                },
                {
                    usedAt: {
                        not: null,
                    },
                    createdAt: {
                        lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
                    },
                },
            ],
        },
    });

    return result.count;
}

/**
 * Get all active CLI authorization codes for a user
 * @param userId - The user ID
 * @returns Array of active authorization codes
 */
export async function getActiveCLIAuthCodes(userId: string) {
    return await db.cliAuthCode.findMany({
        where: {
            userId,
            expiresAt: {
                gt: new Date(),
            },
            usedAt: null,
        },
        select: {
            code: true,
            callbackUrl: true,
            expiresAt: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
}

/**
 * Revoke all active CLI authorization codes for a user
 * @param userId - The user ID
 */
export async function revokeAllCLIAuthCodes(userId: string) {
    const result = await db.cliAuthCode.deleteMany({
        where: {
            userId,
            usedAt: null,
        },
    });

    return result.count;
}