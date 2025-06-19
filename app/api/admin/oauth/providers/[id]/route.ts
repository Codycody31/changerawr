import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { z } from 'zod';
import { OAuthProviderUpdateData } from '@/lib/types/oauth';
import { createAuditLog } from '@/lib/utils/auditLog';

const updateProviderSchema = z.object({
    name: z.string().min(1, 'Name is required').optional(),
    authorizationUrl: z.string().url('Authorization URL must be valid').optional(),
    tokenUrl: z.string().url('Token URL must be valid').optional(),
    userInfoUrl: z.string().url('User Info URL must be valid').optional(),
    clientId: z.string().min(1, 'Client ID is required').optional(),
    clientSecret: z.string().min(1, 'Client Secret is required').optional(),
    scopes: z.array(z.string()).min(1, 'At least one scope is required').optional(),
    enabled: z.boolean().optional(),
    isDefault: z.boolean().optional()
});

/**
 * @method PATCH
 * @description Updates an existing OAuth provider with support for custom URLs
 * @param {string} id - The ID of the OAuth provider to update
 * @body {
 *   "type": "object",
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
    { params }: { params: Promise<{ id: string }> }
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

        const { id } = await params;
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

        // Handle custom URL updates
        if (validatedData.authorizationUrl !== undefined) {
            updateData.authorizationUrl = validatedData.authorizationUrl;
        }

        if (validatedData.tokenUrl !== undefined) {
            updateData.tokenUrl = validatedData.tokenUrl;
        }

        if (validatedData.userInfoUrl !== undefined) {
            updateData.userInfoUrl = validatedData.userInfoUrl;
        }

        // Update callback URL if name changes
        if (validatedData.name !== undefined) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            updateData.callbackUrl = `${appUrl}/api/auth/oauth/callback/${validatedData.name.toLowerCase().replace(/\s+/g, '-')}`;
        }

        // Track changes for audit log
        const changes: Record<string, { from: unknown; to: unknown }> = {};

        if (validatedData.name && validatedData.name !== provider.name) {
            changes.name = { from: provider.name, to: validatedData.name };
        }

        if (validatedData.authorizationUrl && validatedData.authorizationUrl !== provider.authorizationUrl) {
            changes.authorizationUrl = { from: provider.authorizationUrl, to: validatedData.authorizationUrl };
        }

        if (validatedData.tokenUrl && validatedData.tokenUrl !== provider.tokenUrl) {
            changes.tokenUrl = { from: provider.tokenUrl, to: validatedData.tokenUrl };
        }

        if (validatedData.userInfoUrl && validatedData.userInfoUrl !== provider.userInfoUrl) {
            changes.userInfoUrl = { from: provider.userInfoUrl, to: validatedData.userInfoUrl };
        }

        if (validatedData.clientId && validatedData.clientId !== provider.clientId) {
            changes.clientId = { from: provider.clientId, to: validatedData.clientId };
        }

        if (validatedData.enabled !== undefined && validatedData.enabled !== provider.enabled) {
            changes.enabled = { from: provider.enabled, to: validatedData.enabled };
        }

        if (validatedData.isDefault !== undefined && validatedData.isDefault !== provider.isDefault) {
            changes.isDefault = { from: provider.isDefault, to: validatedData.isDefault };
        }

        if (validatedData.scopes) {
            const currentScopes = provider.scopes || [];
            const newScopes = validatedData.scopes;

            if (JSON.stringify(currentScopes.sort()) !== JSON.stringify(newScopes.sort())) {
                changes.scopes = { from: currentScopes, to: newScopes };
            }
        }

        // Update the provider
        const updatedProvider = await db.oAuthProvider.update({
            where: { id },
            data: updateData
        });

        // Create audit log for the update
        try {
            await createAuditLog(
                'UPDATE_OAUTH_PROVIDER',
                user.id,
                user.id,
                {
                    providerId: updatedProvider.id,
                    providerName: updatedProvider.name,
                    changes,
                    changeCount: Object.keys(changes).length,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

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
    { params }: { params: Promise<{ id: string }> }
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

        const { id } = await params;

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

        // Store provider details for audit log before deletion
        const providerDetails = {
            id: provider.id,
            name: provider.name,
            authorizationUrl: provider.authorizationUrl,
            tokenUrl: provider.tokenUrl,
            userInfoUrl: provider.userInfoUrl,
            enabled: provider.enabled,
            isDefault: provider.isDefault
        };

        // Delete the provider
        await db.oAuthProvider.delete({
            where: { id }
        });

        // Create audit log for the deletion
        try {
            await createAuditLog(
                'DELETE_OAUTH_PROVIDER',
                user.id,
                user.id,
                {
                    deletedProvider: providerDetails,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to delete OAuth provider:', error);
        return NextResponse.json(
            { error: 'Failed to delete OAuth provider' },
            { status: 500 }
        );
    }
}