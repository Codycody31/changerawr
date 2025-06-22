import {NextResponse} from 'next/server'
import {PrismaClient} from '@prisma/client'
import {validateAuthAndGetUser} from "@/lib/utils/changelog"
import {encryptToken} from "@/lib/utils/encryption"

const prisma = new PrismaClient()

interface SystemConfig {
    enableAIAssistant: boolean
    aiApiKey: string | null
    aiDefaultModel: string | null
}

interface AISettingsResponse {
    enableAIAssistant: boolean
    aiApiKey: string | null
    aiDefaultModel: string | null
}

interface AISettingsErrorResponse {
    error: string
    enableAIAssistant: boolean
    aiApiKey: null
}

/**
 * @method GET
 * @description Retrieve the system AI settings with encrypted API key for the editor
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "enableAIAssistant": { "type": "boolean" },
 *     "aiApiKey": { "type": "string", "nullable": true },
 *     "aiDefaultModel": { "type": "string", "nullable": true }
 *   }
 * }
 */
export async function GET(): Promise<NextResponse<AISettingsResponse | AISettingsErrorResponse>> {
    try {
        await validateAuthAndGetUser()

        // Get the system configuration
        const config = await prisma.systemConfig.findFirst({
            where: {id: 1},
            select: {
                enableAIAssistant: true,
                aiApiKey: true,
                aiDefaultModel: true
            }
        }) as SystemConfig | null

        // Encrypt the API key before sending to client
        let encryptedApiKey: string | null = null
        if (config?.aiApiKey) {
            encryptedApiKey = encryptToken(config.aiApiKey)
        }

        const response: AISettingsResponse = {
            enableAIAssistant: config?.enableAIAssistant || false,
            aiApiKey: encryptedApiKey,
            aiDefaultModel: config?.aiDefaultModel || null,
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Error fetching AI system settings:', error)

        const errorResponse: AISettingsErrorResponse = {
            error: 'Failed to fetch AI settings',
            enableAIAssistant: false,
            aiApiKey: null,
        }

        return new NextResponse(
            JSON.stringify(errorResponse),
            {status: 500}
        )
    }
}