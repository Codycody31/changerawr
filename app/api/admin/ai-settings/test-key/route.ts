import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { createSectonClient } from '@/lib/utils/ai/secton'
import { createOpenAIClient } from '@/lib/utils/ai/openai'

// Define proper types for our data structures
interface APIKeyRequest {
    apiKey: string;
    provider?: 'secton' | 'openai';
    baseUrl?: string;
}

interface APIKeyResponse {
    valid: boolean;
    message: string;
}

/**
 * @method POST
 * @description Test the validity of a Secton AI API key
 * @body {
 *   "type": "object",
 *   "required": ["apiKey"],
 *   "properties": {
 *     "apiKey": { "type": "string" }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "valid": { "type": "boolean" },
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
        const body: APIKeyRequest = await request.json()

        // Validate API key
        if (!body.apiKey || typeof body.apiKey !== 'string') {
            return new NextResponse(
                JSON.stringify({ error: 'API key is required' }),
                { status: 400 }
            )
        }

        const provider = body.provider || 'secton'

        // Optional basic validation for key format
        if (provider === 'secton' && !body.apiKey.startsWith('sk_')) {
            const response: APIKeyResponse = {
                valid: false,
                message: 'Invalid API key format. Secton API keys should start with "sk_".'
            };

            return NextResponse.json(response, { status: 400 });
        }

        try {
            let isValid = false;

            if (provider === 'openai') {
                const client = createOpenAIClient({
                    apiKey: body.apiKey,
                    baseUrl: body.baseUrl || 'https://api.openai.com/v1',
                });
                isValid = await client.validateApiKey();
            } else {
                const client = createSectonClient({
                    apiKey: body.apiKey,
                    baseUrl: body.baseUrl || 'https://api.secton.org/v1',
                });
                isValid = await client.validateApiKey();
            }

            if (isValid) {
                const response: APIKeyResponse = {
                    valid: true,
                    message: 'API key is valid and working correctly.',
                };

                return NextResponse.json(response);
            } else {
                const response: APIKeyResponse = {
                    valid: false,
                    message: 'Invalid API key. Please check your API key and try again.',
                };

                return NextResponse.json(response, { status: 400 });
            }
        } catch (error) {
            console.error('Error validating API key:', error);

            const response: APIKeyResponse = {
                valid: false,
                message: error instanceof Error ? error.message : 'Failed to validate API key.',
            };

            return NextResponse.json(response, { status: 400 });
        }
    } catch (error) {
        console.error('Error testing API key:', error);

        return new NextResponse(
            JSON.stringify({
                error: 'Server error while testing API key'
            }),
            { status: 500 }
        );
    }
}