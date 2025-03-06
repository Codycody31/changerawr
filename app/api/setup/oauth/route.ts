import { NextResponse } from 'next/server';
import { z } from 'zod';
import { setupEasypanelProvider } from '@/lib/auth/providers/easypanel';

/**
 * Schema for validating OAuth provider setup request.
 */
const oauthSetupSchema = z.object({
    provider: z.string(),
    baseUrl: z.string().url('Base URL must be a valid URL'),
    clientId: z.string().min(1, 'Client ID is required'),
    clientSecret: z.string().min(1, 'Client Secret is required')
});

/**
 * @method POST
 * @description Sets up an OAuth provider during initial system setup
 * @body {
 *   "type": "object",
 *   "required": ["provider", "baseUrl", "clientId", "clientSecret"],
 *   "properties": {
 *     "provider": {
 *       "type": "string",
 *       "description": "OAuth provider type"
 *     },
 *     "baseUrl": {
 *       "type": "string",
 *       "format": "url",
 *       "description": "Base URL of the authentication server"
 *     },
 *     "clientId": {
 *       "type": "string",
 *       "description": "OAuth client ID"
 *     },
 *     "clientSecret": {
 *       "type": "string",
 *       "description": "OAuth client secret"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "provider": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "name": { "type": "string" }
 *       }
 *     }
 *   }
 * }
 * @error 400 Validation failed - Invalid input data
 * @error 500 An unexpected error occurred
 */
export async function POST(request: Request) {
    try {
        // Validate request data
        const body = await request.json();
        const { provider, baseUrl, clientId, clientSecret } = oauthSetupSchema.parse(body);

        let result;

        // Set up appropriate provider
        switch (provider.toLowerCase()) {
            case 'easypanel':
                result = await setupEasypanelProvider({
                    baseUrl,
                    clientId,
                    clientSecret
                });
                break;
            default:
                return NextResponse.json(
                    { error: `Unsupported provider: ${provider}` },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            success: true,
            provider: {
                id: result.id,
                name: result.name
            }
        });
    } catch (error) {
        console.error('OAuth setup error:', error.stack);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to set up OAuth provider' },
            { status: 500 }
        );
    }
}