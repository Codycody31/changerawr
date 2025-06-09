import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { createAuditLog } from '@/lib/utils/auditLog';
import { db } from '@/lib/db';
import { z } from 'zod';

// Enhanced schema to handle both preset and custom URL configurations
const providerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    clientId: z.string().min(1, 'Client ID is required'),
    clientSecret: z.string().min(1, 'Client Secret is required'),
    // Direct URL fields - these will be provided regardless of preset/custom mode
    authorizationUrl: z.string().url('Authorization URL must be valid'),
    tokenUrl: z.string().url('Token URL must be valid'),
    userInfoUrl: z.string().url('User Info URL must be valid'),
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

        // Log the action of viewing OAuth providers
        try {
            await createAuditLog(
                'VIEW_OAUTH_PROVIDERS',
                user.id,
                user.id,
                {
                    providerCount: providers.length,
                    includeAll: includeAll
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

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
 * @description Creates a new OAuth provider with support for custom URLs
 * @body {
 *   "type": "object",
 *   "required": ["name", "authorizationUrl", "tokenUrl", "userInfoUrl", "clientId", "clientSecret", "scopes"],
 *   "properties": {
 *     "name": { "type": "string" },
 *     "authorizationUrl": { "type": "string", "format": "url" },
 *     "tokenUrl": { "type": "string", "format": "url" },
 *     "userInfoUrl": { "type": "string", "format": "url" },
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

        // Get app URL for callback
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Track if we made another provider lose default status
        let previousDefaultChanged = false;

        // If this is set as default, unset any existing default
        if (validatedData.isDefault) {
            const previousDefault = await db.oAuthProvider.findFirst({
                where: { isDefault: true },
                select: { id: true, name: true }
            });

            if (previousDefault) {
                previousDefaultChanged = true;
                await db.oAuthProvider.updateMany({
                    where: { isDefault: true },
                    data: { isDefault: false }
                });
            }
        }

        // Create the provider with the provided URLs
        const provider = await db.oAuthProvider.create({
            data: {
                name: validatedData.name,
                clientId: validatedData.clientId,
                clientSecret: validatedData.clientSecret,
                authorizationUrl: validatedData.authorizationUrl,
                tokenUrl: validatedData.tokenUrl,
                userInfoUrl: validatedData.userInfoUrl,
                // Generate callback URL based on provider name
                callbackUrl: `${appUrl}/api/auth/oauth/callback/${validatedData.name.toLowerCase().replace(/\s+/g, '-')}`,
                scopes: validatedData.scopes,
                enabled: validatedData.enabled,
                isDefault: validatedData.isDefault
            }
        });

        // Create audit log for provider creation
        try {
            await createAuditLog(
                'CREATE_OAUTH_PROVIDER',
                user.id,
                user.id,
                {
                    providerId: provider.id,
                    providerName: provider.name,
                    authorizationUrl: validatedData.authorizationUrl,
                    tokenUrl: validatedData.tokenUrl,
                    userInfoUrl: validatedData.userInfoUrl,
                    enabled: provider.enabled,
                    isDefault: provider.isDefault,
                    scopes: validatedData.scopes,
                    previousDefaultChanged: previousDefaultChanged
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

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