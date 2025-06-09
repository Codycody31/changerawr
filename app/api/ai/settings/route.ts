import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * @method GET
 * @description Retrieve the system AI settings including the API key for the editor
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "enableAIAssistant": { "type": "boolean" },
 *     "aiApiKey": { "type": "string", "nullable": true }
 *   }
 * }
 */
export async function GET() {
    try {
        // Get the system configuration
        const config = await prisma.systemConfig.findFirst({
            where: { id: 1 },
            select: {
                enableAIAssistant: true,
                aiApiKey: true,
                aiDefaultModel: true
            }
        });

        // Log retrieved settings for debugging
        // console.log('Retrieved AI settings:', {
        //     enabled: config?.enableAIAssistant,
        //     hasKey: !!config?.aiApiKey
        // });

        // Return the settings with the actual API key for use in the editor
        return NextResponse.json({
            enableAIAssistant: config?.enableAIAssistant || false,
            aiApiKey: config?.aiApiKey || null,
            aiDefaultModel: config?.aiDefaultModel || null,
        });
    } catch (error) {
        console.error('Error fetching AI system settings:', error)
        return new NextResponse(
            JSON.stringify({
                error: 'Failed to fetch AI settings',
                enableAIAssistant: false,
                aiApiKey: null,
            }),
            { status: 500 }
        )
    }
}