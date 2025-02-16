import { z } from 'zod'
import { db } from '@/lib/db'
import { RequestStatus } from '@prisma/client'
import { verifyAccessToken } from '@/lib/auth/tokens'
import {cookies} from "next/headers";

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
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')

    if (!accessToken?.value) {
        throw new Error('No access token found')
    }

    const userId = await verifyAccessToken(accessToken.value)

    if (!userId) {
        throw new Error('Invalid token')
    }

    const user = await db.user.findUnique({
        where: { id: userId }
    })

    if (!user) {
        throw new Error('User not found')
    }

    return user
}

// Response Helpers
export function sendError(message: string, status: number = 400) {
    return new Response(
        JSON.stringify({ error: message }),
        {
            status,
            headers: { 'Content-Type': 'application/json' }
        }
    )
}

export function sendSuccess(data: unknown, status: number = 200) {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: { 'Content-Type': 'application/json' }
        }
    )
}