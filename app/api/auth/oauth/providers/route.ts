import { NextResponse } from 'next/server';
import { getOAuthProviders } from '@/lib/auth/oauth';

/**
 * @method GET
 * @description Retrieves a list of available OAuth providers
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "providers": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" },
 *           "urlName": { "type": "string" },
 *           "isDefault": { "type": "boolean" }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 500 An unexpected error occurred while fetching providers
 */
export async function GET() {
    try {
        const providers = await getOAuthProviders();

        const sanitizedProviders = providers.map(provider => ({
            id: provider.id,
            name: provider.name,
            urlName: provider.urlName, // Include the URL-friendly name
            isDefault: provider.isDefault
        }));

        return NextResponse.json({ providers: sanitizedProviders });
    } catch (error) {
        console.error('Failed to fetch OAuth providers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch OAuth providers' },
            { status: 500 }
        );
    }
}