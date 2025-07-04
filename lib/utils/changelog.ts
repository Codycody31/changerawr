import {z} from 'zod'
import {db} from '@/lib/db'
import {RequestStatus} from '@prisma/client'
import {verifyAccessToken} from '@/lib/auth/tokens'
import {cookies, headers} from "next/headers";

// Zod Schemas
export const requestStatusSchema = z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED'] as const)
}) satisfies z.ZodType<{ status: RequestStatus }>

export const changelogEntrySchema = z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    version: z.string().optional(),
    tags: z.array(z.string()).optional()
})

export type ChangelogEntryInput = z.infer<typeof changelogEntrySchema>

// Auth Helper
export async function validateAuthAndGetUser() {
    // Check for Bearer token (API key or JWT) first
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // First, try to validate as JWT token (for CLI)
        try {
            const userId = await verifyAccessToken(token);
            if (userId) {
                const user = await db.user.findUnique({
                    where: {id: userId}
                });

                if (user) {
                    return user;
                }
            }
        } catch {
            // If JWT validation fails, continue to API key check
        }

        // Then try to validate as API key (for API access)
        const validApiKey = await db.apiKey.findFirst({
            where: {
                key: token,
                OR: [
                    {expiresAt: null},
                    {expiresAt: {gt: new Date()}}
                ],
                isRevoked: false
            }
        });

        if (validApiKey) {
            // Update last used timestamp
            await db.apiKey.update({
                where: {id: validApiKey.id},
                data: {lastUsed: new Date()}
            });

            // API keys always get admin access since they can only be created by admins
            return {
                id: validApiKey.userId,
                email: 'api.key@changerawr.sys',
                role: 'ADMIN',
                createdAt: validApiKey.createdAt,
                updatedAt: new Date()
            };
        }

        // If neither JWT nor API key validation worked
        throw new Error('Invalid token');
    }

    // Fall back to cookie authentication
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken');

    if (!accessToken?.value) {
        throw new Error('No access token found');
    }

    const userId = await verifyAccessToken(accessToken.value);

    if (!userId) {
        throw new Error('Invalid token');
    }

    const user = await db.user.findUnique({
        where: {id: userId}
    });

    if (!user) {
        throw new Error('User not found');
    }

    return user;
}

// Response Helpers
export function sendError(message: string, status: number = 400) {
    return new Response(
        JSON.stringify({error: message}),
        {
            status,
            headers: {'Content-Type': 'application/json'}
        }
    )
}

export function sendSuccess(data: unknown, status: number = 200) {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {'Content-Type': 'application/json'}
        }
    )
}