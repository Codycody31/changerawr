import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'

const prisma = new PrismaClient()

/**
 * @method GET
 * @description Retrieve the system AI settings including the API key for the editor
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "enableAIAssistant": { "type": "boolean" },
 *     "aiDefaultModel": { "type": "string", "nullable": true },
 *     "aiApiProvider": { "type": "string" },
 *     "aiApiBaseUrl": { "type": "string", "nullable": true }
 *   }
 * }
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
                
        // Get the system configuration
        const config = await prisma.systemConfig.findFirst({
            where: { id: 1 },
            select: {
                enableAIAssistant: true,
                aiDefaultModel: true,
                aiApiProvider: true,
                // @ts-ignore
                aiApiBaseUrl: true
            }
        });

        // Return the settings with the actual API key for use in the editor
        return NextResponse.json({
            enableAIAssistant: config?.enableAIAssistant || false,
            aiDefaultModel: config?.aiDefaultModel || null,
            aiApiProvider: config?.aiApiProvider || 'secton',
            // @ts-ignore
            aiApiBaseUrl: (config as any)?.aiApiBaseUrl || null,
        });
    } catch (error) {
        console.error('Error fetching AI system settings:', error)
        return new NextResponse(
            JSON.stringify({
                error: 'Failed to fetch AI settings',
                enableAIAssistant: false,
            }),
            { status: 500 }
        )
    }
}