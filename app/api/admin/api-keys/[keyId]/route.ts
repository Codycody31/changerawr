import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createAuditLog } from '@/lib/utils/auditLog';

const updateApiKeySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    isRevoked: z.boolean().optional(),
    expiresAt: z.string().datetime().optional().nullable(),
});

/**
 * Retrieves the details of an API key
 * @method GET
 * @description Returns the details of an API key, including its name, last used date, created date, expiration date, revocation status, and permissions. Requires admin permissions.
 * @body None
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" },
 *     "lastUsed": { "type": "string", "format": "date-time" },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "expiresAt": { "type": "string", "format": "date-time" },
 *     "isRevoked": { "type": "boolean" },
 *     "permissions": { "type": "array", "items": { "type": "string" } },
 *     "user": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "email": { "type": "string" },
 *         "name": { "type": "string" }
 *       }
 *     }
 *   }
 * }
 * @error 401 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ keyId: string }> }
): Promise<Response> {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const apiKey = await db.apiKey.findUnique({
            where: { id: (await params).keyId },
            select: {
                id: true,
                name: true,
                lastUsed: true,
                createdAt: true,
                expiresAt: true,
                isRevoked: true,
                permissions: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                }
            }
        });

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(apiKey);
    } catch (error) {
        console.error('Failed to fetch API key:', error);
        return NextResponse.json(
            { error: 'Failed to fetch API key' },
            { status: 500 }
        );
    }
}

/**
 * Updates an API key's details
 * @method PATCH
 * @description Updates an API key's name, revocation status, or expiration date. Requires admin permissions.
 * @body {
 *   "type": "object",
 *   "required": ["id"],
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string", "minLength": 1, "maxLength": 100 },
 *     "isRevoked": { "type": "boolean" },
 *     "expiresAt": { "type": "string", "format": "date-time" }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" },
 *     "lastUsed": { "type": "string", "format": "date-time" },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "expiresAt": { "type": "string", "format": "date-time" },
 *     "isRevoked": { "type": "boolean" },
 *     "permissions": { "type": "array", "items": { "type": "string" } },
 *     "user": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "email": { "type": "string" },
 *         "name": { "type": "string" }
 *       }
 *     }
 *   }
 * }
 * @error 401 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" },
 *     "details": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "message": { "type": "string" },
 *           "path": { "type": "string" }
 *         }
 *       }
 *     }
 *   }
 * }
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ keyId: string }> }
): Promise<Response> {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validatedData = updateApiKeySchema.parse(body);
        const keyId = (await params).keyId;

        const existingKey = await db.apiKey.findUnique({
            where: { id: keyId },
            include: {
                user: {
                    select: {
                        id: true
                    }
                }
            }
        });

        if (!existingKey) {
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            );
        }

        // If the key is already revoked, only allow name changes
        if (existingKey.isRevoked && validatedData.isRevoked === false) {
            return NextResponse.json(
                { error: 'Cannot un-revoke an API key' },
                { status: 400 }
            );
        }

        // Track what changed for the audit log
        const changes: Record<string, { from: unknown; to: unknown }> = {};

        if (validatedData.name && validatedData.name !== existingKey.name) {
            changes.name = { from: existingKey.name, to: validatedData.name };
        }

        if (validatedData.isRevoked !== undefined && validatedData.isRevoked !== existingKey.isRevoked) {
            changes.isRevoked = { from: existingKey.isRevoked, to: validatedData.isRevoked };
        }

        if (validatedData.expiresAt !== undefined) {
            const newExpiresAt = validatedData.expiresAt ? new Date(validatedData.expiresAt) : null;
            const oldExpiresAt = existingKey.expiresAt?.toISOString() || null;
            const newExpiresAtStr = newExpiresAt?.toISOString() || null;

            if (oldExpiresAt !== newExpiresAtStr) {
                changes.expiresAt = { from: oldExpiresAt, to: newExpiresAtStr };
            }
        }

        const apiKey = await db.apiKey.update({
            where: { id: keyId },
            data: {
                ...(validatedData.name && { name: validatedData.name }),
                ...(validatedData.isRevoked !== undefined && { isRevoked: validatedData.isRevoked }),
                ...(validatedData.expiresAt !== undefined && {
                    expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null
                })
            },
            select: {
                id: true,
                name: true,
                lastUsed: true,
                createdAt: true,
                expiresAt: true,
                isRevoked: true,
                permissions: true
            }
        });

        // Determine the audit log action based on what changed
        if (Object.keys(changes).length > 0) {
            let auditAction = 'UPDATE_API_KEY';

            // Use a more specific action if only one type of change occurred
            if (changes.isRevoked && changes.isRevoked.to === true && Object.keys(changes).length === 1) {
                auditAction = 'REVOKE_API_KEY';
            } else if (changes.name && Object.keys(changes).length === 1) {
                auditAction = 'RENAME_API_KEY';
            }

            try {
                await createAuditLog(
                    auditAction,
                    user.id,
                    user.id, // Use the admin's ID as the target user ID to avoid foreign key issues
                    {
                        apiKeyId: keyId,
                        apiKeyName: apiKey.name,
                        changes,
                        ownerId: existingKey.user.id
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
                // Continue execution even if audit log creation fails
            }
        }

        return NextResponse.json(apiKey);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Failed to update API key:', error);
        return NextResponse.json(
            { error: 'Failed to update API key' },
            { status: 500 }
        );
    }
}

/**
 * Revokes an API key
 * @method DELETE
 * @description Revokes an API key, making it unable to be used for authentication. Requires admin permissions.
 * @body None
 * @response 200 { "type": "object", "properties": { "success": true } }
 * @error 401 { "type": "object", "properties": { "error": "Unauthorized" } }
 * @error 404 { "type": "object", "properties": { "error": "API key not found" } }
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ keyId: string }> }
): Promise<Response> {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const keyId = (await params).keyId;
        const existingKey = await db.apiKey.findUnique({
            where: { id: keyId },
            include: {
                user: {
                    select: {
                        id: true
                    }
                }
            }
        });

        if (!existingKey) {
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            );
        }

        // Only allow deletion of revoked keys
        if (!existingKey.isRevoked) {
            return NextResponse.json(
                { error: 'Cannot delete an active API key. Revoke it first.' },
                { status: 400 }
            );
        }

        // Store key details for audit log before deletion
        const apiKeyDetails = {
            id: existingKey.id,
            name: existingKey.name,
            ownerId: existingKey.user.id
        };

        // Permanently delete the key
        await db.apiKey.delete({
            where: { id: keyId }
        });

        // Create audit log for deletion
        try {
            await createAuditLog(
                'DELETE_API_KEY',
                user.id,
                user.id, // Use the admin's ID as the target user ID to avoid foreign key issues
                {
                    apiKeyId: apiKeyDetails.id,
                    apiKeyName: apiKeyDetails.name,
                    ownerId: apiKeyDetails.ownerId
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
            // Continue execution even if audit log creation fails
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete API key:', error);
        return NextResponse.json(
            { error: 'Failed to delete API key' },
            { status: 500 }
        );
    }
}