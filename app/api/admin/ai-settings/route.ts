import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'

const prisma = new PrismaClient()

// Define proper types for our data structures
interface AISettingsResponse {
    enableAIAssistant: boolean;
    aiApiKey: boolean | null;
    aiDefaultModel: string | null;
    aiApiProvider: string | null;
    aiApiBaseUrl: string | null;
}

interface AISettingsUpdateRequest {
    enableAIAssistant?: boolean;
    aiApiKey?: string | null;
    aiDefaultModel?: string;
    aiApiProvider?: string;
    aiApiBaseUrl?: string | null;
}

interface SystemConfigUpdate {
    aiApiProvider?: string;
    enableAIAssistant?: boolean;
    aiApiKey?: string | null;
    aiDefaultModel?: string;
    aiApiBaseUrl?: string | null;
}

/**
 * @method GET
 * @description Retrieve the current AI assistant settings
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "enableAIAssistant": { "type": "boolean" },
 *     "aiApiKey": { "type": "boolean" },
 *     "aiDefaultModel": { "type": "string", "nullable": true },
 *     "aiApiProvider": { "type": "string", "nullable": true },
 *     "aiApiBaseUrl": { "type": "string", "nullable": true }
 *   }
 * }
 * @error 401 Unauthorized - You must be logged in as an admin
 * @error 403 Forbidden - Insufficient permissions
 * @secure cookieAuth
 */
export async function GET() {
    try {
        // Validate user authentication and permissions
        const user = await validateAuthAndGetUser()

        if (!user) {
            return new NextResponse(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401 }
            )
        }

        // Check if user is an admin
        if (user.role !== 'ADMIN') {
            return new NextResponse(
                JSON.stringify({ error: 'Insufficient permissions' }),
                { status: 403 }
            )
        }

        // Get the system configuration
        const config = await prisma.systemConfig.findFirst({
            where: { id: 1 },
            select: {
                enableAIAssistant: true,
                aiApiKey: true,
                aiDefaultModel: true,
                aiApiProvider: true,
                // @ts-ignore - field added via migration
                aiApiBaseUrl: true,
            }
        }) || {
            enableAIAssistant: false,
            aiApiKey: null,
            aiDefaultModel: 'copilot-zero',
            aiApiProvider: null,
            // @ts-ignore
            aiApiBaseUrl: null,
        }

        // Return the settings
        const response: AISettingsResponse = {
            enableAIAssistant: config.enableAIAssistant,
            aiApiKey: config.aiApiKey ? true : null, // Only return boolean for security
            aiDefaultModel: config.aiDefaultModel,
            aiApiProvider: config.aiApiProvider || 'secton',
            // @ts-ignore
            aiApiBaseUrl: (config as any).aiApiBaseUrl || null,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching AI settings:', error)
        return new NextResponse(
            JSON.stringify({ error: 'Failed to fetch AI settings' }),
            { status: 500 }
        )
    }
}

/**
 * @method POST
 * @description Update AI assistant settings
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "enableAIAssistant": { "type": "boolean", "nullable": true },
 *     "aiApiKey": { "type": "string", "nullable": true },
 *     "aiDefaultModel": { "type": "string", "nullable": true },
 *     "aiApiProvider": { "type": "string", "nullable": true },
 *     "aiApiBaseUrl": { "type": "string", "nullable": true }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "message": { "type": "string" }
 *   }
 * }
 * @error 400 Bad Request - Invalid request body
 * @error 401 Unauthorized - You must be logged in as an admin
 * @error 403 Forbidden - Insufficient permissions
 * @secure cookieAuth
 */
export async function POST(request: Request) {
    try {
        // Validate user authentication and permissions
        const user = await validateAuthAndGetUser()

        if (!user) {
            return new NextResponse(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401 }
            )
        }

        // Check if user is an admin
        if (user.role !== 'ADMIN') {
            return new NextResponse(
                JSON.stringify({ error: 'Insufficient permissions' }),
                { status: 403 }
            )
        }

        // Parse request body
        const body: AISettingsUpdateRequest = await request.json()

        // Validate request body
        if (typeof body !== 'object') {
            return new NextResponse(
                JSON.stringify({ error: 'Invalid request body' }),
                { status: 400 }
            )
        }

        // Extract fields with validation and create properly typed update data object
        const updateData: SystemConfigUpdate = {}

        if (typeof body.enableAIAssistant === 'boolean') {
            updateData.enableAIAssistant = body.enableAIAssistant
        }

        if (body.aiApiKey !== undefined) {
            updateData.aiApiKey = body.aiApiKey
        }

        if (body.aiDefaultModel) {
            updateData.aiDefaultModel = body.aiDefaultModel
        }

        if (body.aiApiProvider) {
            updateData.aiApiProvider = body.aiApiProvider
        }

        if (body.aiApiBaseUrl !== undefined) {
            updateData.aiApiBaseUrl = body.aiApiBaseUrl
        }

        // Update the system configuration
        await prisma.systemConfig.upsert({
            where: { id: 1 },
            update: updateData,
            create: {
                id: 1,
                ...updateData,
                // Add required default values for create operation
                defaultInvitationExpiry: 7,
                requireApprovalForChangelogs: true,
                maxChangelogEntriesPerProject: 100,
                enableAnalytics: true,
                enableNotifications: true,
                enablePasswordReset: false,
                updatedAt: new Date(),
                // @ts-ignore
                aiApiBaseUrl: updateData.aiApiBaseUrl || null,
            }
        })

        // Add audit log entry
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE_AI_SETTINGS',
                userId: user.id,
                details: {
                    enableAIAssistant: updateData.enableAIAssistant,
                    aiDefaultModel: updateData.aiDefaultModel,
                    // Don't log the API key for security
                    aiApiKeyUpdated: updateData.aiApiKey !== undefined
                }
            }
        })

        // Return success response
        return NextResponse.json({
            success: true,
            message: 'AI settings updated successfully'
        })
    } catch (error) {
        console.error('Error updating AI settings:', error)
        return new NextResponse(
            JSON.stringify({ error: 'Failed to update AI settings' }),
            { status: 500 }
        )
    }
}