import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { db } from '@/lib/db'
import { z } from 'zod'

const systemConfigSchema = z.object({
    defaultInvitationExpiry: z.number().min(1).max(30),
    requireApprovalForChangelogs: z.boolean(),
    maxChangelogEntriesPerProject: z.number().min(10).max(1000),
    enableAnalytics: z.boolean(),
    enableNotifications: z.boolean(),
})

/**
 * @method GET
 * @description Fetches the system configuration for the authenticated user
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "defaultInvitationExpiry": { "type": "number" },
 *     "requireApprovalForChangelogs": { "type": "boolean" },
 *     "maxChangelogEntriesPerProject": { "type": "number" },
 *     "enableAnalytics": { "type": "boolean" },
 *     "enableNotifications": { "type": "boolean" }
 *   }
 * }
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 500 An unexpected error occurred while fetching system configuration
 */
export async function GET() {
    try {
        const user = await validateAuthAndGetUser()

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Not authorized' },
                { status: 403 }
            )
        }

        const config = await db.systemConfig.findFirst()

        if (!config) {
            // Return default configuration if none exists
            return NextResponse.json({
                defaultInvitationExpiry: 7,
                requireApprovalForChangelogs: true,
                maxChangelogEntriesPerProject: 100,
                enableAnalytics: true,
                enableNotifications: true,
            })
        }

        return NextResponse.json(config)
    } catch (error) {
        console.error('Error fetching system configuration:', error)
        return NextResponse.json(
            { error: 'Failed to fetch system configuration' },
            { status: 500 }
        )
    }
}

/**
 * @method PATCH
 * @description Updates the system configuration for the authenticated user
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "defaultInvitationExpiry": { "type": "number" },
 *     "requireApprovalForChangelogs": { "type": "boolean" },
 *     "maxChangelogEntriesPerProject": { "type": "number" },
 *     "enableAnalytics": { "type": "boolean" },
 *     "enableNotifications": { "type": "boolean" }
 *   },
 *   "required": [
 *     "defaultInvitationExpiry",
 *     "requireApprovalForChangelogs",
 *     "maxChangelogEntriesPerProject",
 *     "enableAnalytics",
 *     "enableNotifications"
 *   ]
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "defaultInvitationExpiry": { "type": "number" },
 *     "requireApprovalForChangelogs": { "type": "boolean" },
 *     "maxChangelogEntriesPerProject": { "type": "number" },
 *     "enableAnalytics": { "type": "boolean" },
 *     "enableNotifications": { "type": "boolean" }
 *   }
 * }
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 400 Invalid configuration data
 * @error 500 An unexpected error occurred while updating system configuration
 */
export async function PATCH(request: Request) {
    try {
        const user = await validateAuthAndGetUser()

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Not authorized' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const validatedData = systemConfigSchema.parse(body)

        const config = await db.systemConfig.upsert({
            where: { id: 1 }, // Assuming single config record
            update: validatedData,
            create: {
                id: 1,
                ...validatedData,
            },
        })

        return NextResponse.json(config)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid configuration data', details: error.errors },
                { status: 400 }
            )
        }

        console.error('Error updating system configuration:', error)
        return NextResponse.json(
            { error: 'Failed to update system configuration' },
            { status: 500 }
        )
    }
}