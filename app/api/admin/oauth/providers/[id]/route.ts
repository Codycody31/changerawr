import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { z } from 'zod';
import { OAuthProviderUpdateData } from '@/lib/types/oauth';

const updateProviderSchema = z.object({
    name: z.string().min(1, 'Name is required').optional(),
    baseUrl: z.string().url('Base URL must be a valid URL').optional(),
    clientId: z.string().min(1, 'Client ID is required').optional(),
    clientSecret: z.string().min(1, 'Client Secret is required').optional(),
    scopes: z.array(z.string()).min(1, 'At least one scope is required').optional(),
    enabled: z.boolean().optional(),
    isDefault: z.boolean().optional()
});

/**
 * @method PATCH
 * @description Updates an existing OAuth provider
 * @param {string} id - The ID of the OAuth provider to update
 * @body {
 *   "type": "object",
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
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" },
 *     "enabled": { "type": "boolean" },
 *     "isDefault": { "type": "boolean" },
 *     "updatedAt": { "type": "string", "format": "date-time" }
 *   }
 * }
 * @error 400 Invalid input - Validation error
 * @error 403 Unauthorized - User not authorized to access this endpoint
 * @error 404 Provider not found
 * @error 500 An unexpected error occurred while updating provider
 */
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await validateAuthAndGetUser();

        // Only admins can update providers
        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { id } = params;
        const body = await request.json();
        const validatedData = updateProviderSchema.parse(body);

        // Check if provider exists
        const provider = await db.oAuthProvider.findUnique({
            where: { id }
        });

        if (!provider) {
            return NextResponse.json(
                { error: 'Provider not found' },
                { status: 404 }
            );
        }

        // Prepare update data
        const updateData: OAuthProviderUpdateData = {};

        if (validatedData.name !== undefined) {
            updateData.name = validatedData.name;
        }

        if (validatedData.clientId !== undefined) {
            updateData.clientId = validatedData.clientId;
        }

        // When updating provider, update the callback URL if name changes
        if (validatedData.name !== undefined) {
            updateData.name = validatedData.name;

            // Update callback URL to match new name
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            updateData.callbackUrl = `${appUrl}/api/auth/oauth/callback/${validatedData.name.toLowerCase().replace(/\s+/g, '-')}`;
        }

        if (validatedData.clientSecret !== undefined) {
            updateData.clientSecret = validatedData.clientSecret;
        }

        if (validatedData.scopes !== undefined) {
            updateData.scopes = validatedData.scopes;
        }

        if (validatedData.enabled !== undefined) {
            updateData.enabled = validatedData.enabled;
        }

        if (validatedData.isDefault !== undefined) {
            updateData.isDefault = validatedData.isDefault;

            // If setting as default, unset any other defaults
            if (validatedData.isDefault) {
                await db.oAuthProvider.updateMany({
                    where: { id: { not: id }, isDefault: true },
                    data: { isDefault: false }
                });
            }
        }

        // Update URLs if baseUrl is provided
        if (validatedData.baseUrl) {
            // Normalize base URL (remove trailing slash)
            const baseUrl = validatedData.baseUrl.endsWith('/')
                ? validatedData.baseUrl.slice(0, -1)
                : validatedData.baseUrl;

            updateData.authorizationUrl = `${baseUrl}/oauth/authorize`;
            updateData.tokenUrl = `${baseUrl}/oauth/token`;
            updateData.userInfoUrl = `${baseUrl}/oauth/userinfo`;
        }

        // Update the provider
        const updatedProvider = await db.oAuthProvider.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({
            id: updatedProvider.id,
            name: updatedProvider.name,
            enabled: updatedProvider.enabled,
            isDefault: updatedProvider.isDefault,
            updatedAt: updatedProvider.updatedAt
        });
    } catch (error) {
        console.error('Failed to update OAuth provider:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update OAuth provider' },
            { status: 500 }
        );
    }
}

/**
 * @method DELETE
 * @description Deletes an OAuth provider
 * @param {string} id - The ID of the OAuth provider to delete
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" }
 *   }
 * }
 * @error 403 Unauthorized - User not authorized to access this endpoint
 * @error 404 Provider not found
 * @error 500 An unexpected error occurred while deleting provider
 */
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await validateAuthAndGetUser();

        // Only admins can delete providers
        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { id } = params;

        // Check if provider exists
        const provider = await db.oAuthProvider.findUnique({
            where: { id }
        });

        if (!provider) {
            return NextResponse.json(
                { error: 'Provider not found' },
                { status: 404 }
            );
        }

        // Delete the provider
        await db.oAuthProvider.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete OAuth provider:', error);
        return NextResponse.json(
            { error: 'Failed to delete OAuth provider' },
            { status: 500 }
        );
    }
}