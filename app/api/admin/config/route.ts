import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { createAuditLog } from '@/lib/utils/auditLog'
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

        // Create audit log for viewing system config
        try {
            await createAuditLog(
                'VIEW_SYSTEM_CONFIG',
                user.id,
                user.id, // Use admin's ID as target to avoid foreign key issues
                {
                    configExists: !!config
                }
            )
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError)
            // Continue execution even if audit log creation fails
        }

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

        // Get current config to track changes
        const existingConfig = await db.systemConfig.findFirst()
        const isNewConfig = !existingConfig

        // Track what changes are being made
        const changes: Record<string, { from: unknown; to: unknown }> = {};

        if (existingConfig) {
            // Compare each field and track changes
            if (validatedData.defaultInvitationExpiry !== existingConfig.defaultInvitationExpiry) {
                changes.defaultInvitationExpiry = {
                    from: existingConfig.defaultInvitationExpiry,
                    to: validatedData.defaultInvitationExpiry
                }
            }

            if (validatedData.requireApprovalForChangelogs !== existingConfig.requireApprovalForChangelogs) {
                changes.requireApprovalForChangelogs = {
                    from: existingConfig.requireApprovalForChangelogs,
                    to: validatedData.requireApprovalForChangelogs
                }
            }

            if (validatedData.maxChangelogEntriesPerProject !== existingConfig.maxChangelogEntriesPerProject) {
                changes.maxChangelogEntriesPerProject = {
                    from: existingConfig.maxChangelogEntriesPerProject,
                    to: validatedData.maxChangelogEntriesPerProject
                }
            }

            if (validatedData.enableAnalytics !== existingConfig.enableAnalytics) {
                changes.enableAnalytics = {
                    from: existingConfig.enableAnalytics,
                    to: validatedData.enableAnalytics
                }
            }

            if (validatedData.enableNotifications !== existingConfig.enableNotifications) {
                changes.enableNotifications = {
                    from: existingConfig.enableNotifications,
                    to: validatedData.enableNotifications
                }
            }
        }

        const config = await db.systemConfig.upsert({
            where: { id: 1 }, // Assuming single config record
            update: validatedData,
            create: {
                id: 1,
                ...validatedData,
            },
        })

        // Create appropriate audit log based on operation
        try {
            if (isNewConfig) {
                // This is the initial configuration
                await createAuditLog(
                    'CREATE_SYSTEM_CONFIG',
                    user.id,
                    user.id, // Use admin's ID as target to avoid foreign key issues
                    {
                        config: {
                            defaultInvitationExpiry: config.defaultInvitationExpiry,
                            requireApprovalForChangelogs: config.requireApprovalForChangelogs,
                            maxChangelogEntriesPerProject: config.maxChangelogEntriesPerProject,
                            enableAnalytics: config.enableAnalytics,
                            enableNotifications: config.enableNotifications
                        }
                    }
                )
            } else if (Object.keys(changes).length > 0) {
                // This is an update to existing configuration
                await createAuditLog(
                    'UPDATE_SYSTEM_CONFIG',
                    user.id,
                    user.id, // Use admin's ID as target to avoid foreign key issues
                    {
                        changes,
                        changeCount: Object.keys(changes).length
                    }
                )
            }
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError)
            // Continue execution even if audit log creation fails
        }

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