import { NextRequest, NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { createAuditLog } from '@/lib/utils/auditLog'; // Add import
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for role update
const updateRoleSchema = z.object({
    role: z.enum(['ADMIN', 'STAFF'] as const),
});

/**
 * Update a user's role
 * @method PATCH
 * @description Updates a user's role to either 'ADMIN' or 'STAFF'. Only admins can perform this action. Requires user authentication.
 * @queryParams None
 * @requestBody {
 *   "type": "object",
 *   "properties": {
 *     "role": { "type": "enum", "enum": ["ADMIN", "STAFF"] },
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "message": { "type": "string" },
 *     "user": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "email": { "type": "string" },
 *         "name": { "type": "string" },
 *         "role": { "type": "string" },
 *         "createdAt": { "type": "string", "format": "date-time" },
 *         "lastLoginAt": { "type": "string", "format": "date-time" }
 *       }
 *     }
 *   }
 * }
 * @error 403 {
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
 * @error 500 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const currentUser = await validateAuthAndGetUser();

        // Only admins can update roles
        if (currentUser.role !== 'ADMIN') {
            // Log unauthorized attempt to update role
            try {
                await createAuditLog(
                    'UNAUTHORIZED_ROLE_UPDATE_ATTEMPT',
                    currentUser.id,
                    currentUser.id, // Use user's own ID to avoid foreign key issues
                    {
                        userRole: currentUser.role,
                        targetUserId: (await context.params).userId,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return NextResponse.json(
                { error: 'Unauthorized - Only admins can update roles' },
                { status: 403 }
            );
        }

        // Validate user ID
        const { userId } = await context.params;
        if (!userId) {
            // Log missing user ID error
            try {
                await createAuditLog(
                    'INVALID_ROLE_UPDATE_REQUEST',
                    currentUser.id,
                    currentUser.id, // Use admin's own ID to avoid foreign key issues
                    {
                        reason: 'Missing user ID',
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const targetUser = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true, name: true },
        });

        if (!targetUser) {
            // Log user not found error
            try {
                await createAuditLog(
                    'USER_NOT_FOUND',
                    currentUser.id,
                    currentUser.id, // Use admin's own ID to avoid foreign key issues
                    {
                        action: 'ROLE_UPDATE',
                        requestedUserId: userId,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Prevent self-role modification
        if (targetUser.id === currentUser.id) {
            // Log self-role modification attempt
            try {
                await createAuditLog(
                    'SELF_ROLE_MODIFICATION_ATTEMPT',
                    currentUser.id,
                    currentUser.id, // Use admin's own ID to avoid foreign key issues
                    {
                        currentRole: currentUser.role,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return NextResponse.json(
                { error: 'Cannot modify your own role' },
                { status: 400 }
            );
        }

        // Parse and validate request body
        const body = await request.json();

        // Log role update attempt
        try {
            await createAuditLog(
                'ROLE_UPDATE_ATTEMPT',
                currentUser.id,
                targetUser.id, // This is a valid user ID, so it's safe to use
                {
                    targetUserEmail: targetUser.email,
                    targetUserName: targetUser.name,
                    currentRole: targetUser.role,
                    requestedRole: body.role,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        const { role } = updateRoleSchema.parse(body);

        // No change in role
        if (role === targetUser.role) {
            // Log no-change role update
            try {
                await createAuditLog(
                    'ROLE_UPDATE_NO_CHANGE',
                    currentUser.id,
                    targetUser.id,
                    {
                        role: role,
                        message: 'Role update requested but role is already set to the requested value',
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return NextResponse.json({
                message: 'Role already set to ' + role,
                user: targetUser,
            });
        }

        // Update user role
        const updatedUser = await db.user.update({
            where: { id: userId },
            data: { role },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                lastLoginAt: true,
            },
        });

        // Log the role change for audit purposes
        try {
            await createAuditLog(
                'UPDATE_ROLE',
                currentUser.id,
                userId,
                {
                    previousRole: targetUser.role,
                    newRole: role,
                    adminEmail: currentUser.email,
                    targetUserEmail: targetUser.email,
                    targetUserName: targetUser.name,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
            // Continue execution even if audit log creation fails
        }

        return NextResponse.json({
            message: 'Role updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Role update error:', error);

        if (error instanceof z.ZodError) {
            // Log validation error
            try {
                const currentUser = await validateAuthAndGetUser();
                await createAuditLog(
                    'ROLE_UPDATE_VALIDATION_ERROR',
                    currentUser.id,
                    currentUser.id, // Use admin's own ID to avoid foreign key issues
                    {
                        targetUserId: (await context.params).userId,
                        validationErrors: error.errors,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return NextResponse.json(
                {
                    error: 'Invalid role value',
                    details: error.errors,
                },
                { status: 400 }
            );
        }

        // Log general role update error
        try {
            const currentUser = await validateAuthAndGetUser();
            await createAuditLog(
                'ROLE_UPDATE_ERROR',
                currentUser.id,
                currentUser.id, // Use admin's own ID to avoid foreign key issues
                {
                    targetUserId: (await context.params).userId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        return NextResponse.json(
            { error: 'Failed to update user role' },
            { status: 500 }
        );
    }
}