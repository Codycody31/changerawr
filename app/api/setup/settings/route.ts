import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const settingsSchema = z.object({
    defaultInvitationExpiry: z.number().min(1).max(30).default(7),
    requireApprovalForChangelogs: z.boolean().default(true),
    maxChangelogEntriesPerProject: z.number().min(10).max(1000).default(100),
    enableAnalytics: z.boolean().default(true),
    enableNotifications: z.boolean().default(true),
})

export async function POST(request: Request) {
    try {
        // Check if settings already exist
        const existingConfig = await db.systemConfig.findFirst()
        if (existingConfig) {
            return NextResponse.json(
                { error: 'System settings already configured' },
                { status: 400 }
            )
        }

        // Validate request data
        const body = await request.json()
        const validatedData = settingsSchema.parse(body)

        // Create system config
        const config = await db.systemConfig.create({
            data: {
                id: 1,
                defaultInvitationExpiry: validatedData.defaultInvitationExpiry,
                requireApprovalForChangelogs: validatedData.requireApprovalForChangelogs,
                maxChangelogEntriesPerProject: validatedData.maxChangelogEntriesPerProject,
                enableAnalytics: validatedData.enableAnalytics,
                enableNotifications: validatedData.enableNotifications,
            }
        })

        return NextResponse.json({
            message: 'System settings configured successfully',
            config
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Invalid input',
                    details: error.errors,
                },
                { status: 400 }
            )
        }

        console.error('Settings setup error:', error)
        return NextResponse.json(
            { error: 'Failed to configure system settings' },
            { status: 500 }
        )
    }
}