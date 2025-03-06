import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { z } from 'zod';

const providerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    baseUrl: z.string().url('Base URL must be a valid URL'),
    clientId: z.string().min(1, 'Client ID is required'),
    clientSecret: z.string().min(1, 'Client Secret is required'),
    scopes: z.array(z.string()).min(1, 'At least one scope is required'),
    enabled: z.boolean().default(true),
    isDefault: z.boolean().default(false)
});

/**
 * @method GET
 * @description Retrieves all OAuth providers
 * @query {
 *   includeAll: boolean, default: false - Whether to include disabled providers
 * }
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
 *           "clientId": { "type": "string" },
 *           "clientSecret": { "type": "string" },
 *           "authorizationUrl": { "type": "string" },
 *           "tokenUrl": { "type": "string" },
 *           "userInfoUrl": { "type": "string" },
 *           "callbackUrl": { "type": "string" },
 *           "scopes": { "type": "array", "items": { "type": "string" } },
 *           "enabled": { "type": "boolean" },
 *           "isDefault": { "type": "boolean" },
 *           "createdAt": { "type": "string", "format": "date-time" },
 *           "updatedAt": { "type": "string", "format": "date-time" }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 403 Unauthorized - User not authorized to access this endpoint
 * @error 500 An unexpected error occurred while fetching providers
 */
export async function GET(request: Request) {
    try {
        const user = await validateAuthAndGetUser();

        // Only admins can access this endpoint
        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const includeAll = searchParams.get('includeAll') === 'true';

        const providers = await db.oAuthProvider.findMany({
            where: includeAll ? {} : { enabled: true },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ providers });
    } catch (error) {
        console.error('Failed to fetch OAuth providers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch OAuth providers' },
            { status: 500 }
        );
    }
}

/**
 * @method POST
 * @description Creates a new OAuth provider
 * @body {
 *   "type": "object",
 *   "required": ["name", "baseUrl", "clientId", "clientSecret", "scopes"],
 *   "properties": {
 *     "name": { "type": "string" },
 *     "baseUrl": { "type": "string", "format": "url" },
 *     "clientId": { "type": "string" },
 *     "clientSecret": { "type": "string" },
 *     "scopes": { "type": "array", "items": { "type": "string" } },
 *     "enabled": { "type": "boolean" },
 *     "isDefault": { "type": "boolean" }
 *   }
 * }
 * @response 201 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" },
 *     "enabled": { "type": "boolean" },
 *     "isDefault": { "type": "boolean" }
 *   }
 * }
 * @error 400 Invalid input - Validation error
 * @error 403 Unauthorized - User not authorized to access this endpoint
 * @error 500 An unexpected error occurred while creating provider
 */
export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser();

        // Only admins can create providers
        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validatedData = providerSchema.parse(body);

        // Normalize base URL (remove trailing slash)
        const baseUrl = validatedData.baseUrl.endsWith('/')
            ? validatedData.baseUrl.slice(0, -1)
            : validatedData.baseUrl;

        // Get app URL for callback
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // If this is set as default, unset any existing default
        if (validatedData.isDefault) {
            await db.oAuthProvider.updateMany({
                where: { isDefault: true },
                data: { isDefault: false }
            });
        }

        // Create the provider
        const provider = await db.oAuthProvider.create({
            data: {
                name: validatedData.name,
                clientId: validatedData.clientId,
                clientSecret: validatedData.clientSecret,
                authorizationUrl: `${baseUrl}/oauth/authorize`,
                tokenUrl: `${baseUrl}/oauth/token`,
                userInfoUrl: `${baseUrl}/oauth/userinfo`,
                // Use provider name in callback URL
                callbackUrl: `${appUrl}/api/auth/oauth/callback/${validatedData.name.toLowerCase().replace(/\s+/g, '-')}`,
                scopes: validatedData.scopes,
                enabled: validatedData.enabled,
                isDefault: validatedData.isDefault
            }
        });

        return NextResponse.json(
            {
                id: provider.id,
                name: provider.name,
                enabled: provider.enabled,
                isDefault: provider.isDefault
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Failed to create OAuth provider:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create OAuth provider' },
            { status: 500 }
        );
    }
}