import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { createSectonClient } from '@/lib/utils/ai/secton'

// Define proper types for our data structures
interface APIKeyRequest {
    apiKey: string;
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

        // Basic validation - check if it starts with sk_
        if (!body.apiKey.startsWith('sk_')) {
            const response: APIKeyResponse = {
                valid: false,
                message: 'Invalid API key format. Secton API keys should start with "sk-_.'
            };

            return NextResponse.json(response, { status: 400 });
        }

        // Test the API key using the Secton client
        try {
            const client = createSectonClient({
                apiKey: body.apiKey,
            });

            // Try to validate the API key
            const isValid = await client.validateApiKey();

            if (isValid) {
                const response: APIKeyResponse = {
                    valid: true,
                    message: 'API key is valid and working correctly.',
                };

                return NextResponse.json(response);
            } else {
                const response: APIKeyResponse = {
                    valid: false,
                    message: 'Invalid API key. Please check your Secton API key and try again.',
                };

                return NextResponse.json(response, { status: 400 });
            }
        } catch (error) {
            console.error('Error validating Secton API key:', error);

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