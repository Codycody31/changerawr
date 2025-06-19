import {NextRequest, NextResponse} from 'next/server';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {createAuditLog} from '@/lib/utils/auditLog';
import {db} from '@/lib/db';
import {z} from 'zod';
import {Role} from '@prisma/client';

// Type definitions
interface PreservedUserData {
    [key: string]: string | null; // Index signature for Prisma JSON compatibility
    id: string;
    email: string;
    name: string | null;
    role: string; // Use string instead of Role enum for JSON storage
    deletedAt: string;
    deletedBy: string;
}

interface AuditLogDetails {
    [key: string]: unknown;
    _preservedUser?: PreservedUserData;
    _preservedTargetUser?: PreservedUserData;
}

// Validation schemas
const updateUserSchema = z.object({
    name: z.string().optional(),
    role: z.enum(['ADMIN', 'STAFF'] as const).optional(),
});

/**
 * Update a user's details
 * @method PATCH
 * @description Updates a user's name and/or role. Only admins can perform this action.
 * @requestBody {
 *   "type": "object",
 *   "properties": {
 *     "name": { "type": "string", "description": "User's display name" },
 *     "role": { "type": "string", "enum": ["ADMIN", "STAFF"], "description": "User's role" }
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
 * @error 403 Unauthorized - Only admins can update users
 * @error 400 Invalid request data or cannot modify own role
 * @error 404 User not found
 * @error 500 Failed to update user
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const currentUser = await validateAuthAndGetUser();

        // Only admins can update users
        if (currentUser.role !== 'ADMIN') {
            try {
                await createAuditLog(
                    'UNAUTHORIZED_USER_UPDATE_ATTEMPT',
                    currentUser.id,
                    currentUser.id,
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
                {error: 'Unauthorized - Only admins can update users'},
                {status: 403}
            );
        }

        const {userId} = await context.params;

        if (!userId) {
            return NextResponse.json(
                {error: 'User ID is required'},
                {status: 400}
            );
        }

        // Check if user exists
        const targetUser = await db.user.findUnique({
            where: {id: userId},
            select: {id: true, email: true, role: true, name: true},
        });

        if (!targetUser) {
            try {
                await createAuditLog(
                    'USER_UPDATE_NOT_FOUND',
                    currentUser.id,
                    currentUser.id,
                    {
                        action: 'UPDATE_USER',
                        requestedUserId: userId,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return NextResponse.json(
                {error: 'User not found'},
                {status: 404}
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = updateUserSchema.parse(body);

        // Prevent self-role modification
        if (validatedData.role && targetUser.id === currentUser.id) {
            try {
                await createAuditLog(
                    'SELF_ROLE_MODIFICATION_ATTEMPT',
                    currentUser.id,
                    currentUser.id,
                    {
                        currentRole: currentUser.role,
                        requestedRole: validatedData.role,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return NextResponse.json(
                {error: 'Cannot modify your own role'},
                {status: 400}
            );
        }

        // Build update data with proper typing
        const updateData: { name?: string; role?: Role } = {};
        if (validatedData.name !== undefined) updateData.name = validatedData.name;
        if (validatedData.role !== undefined) updateData.role = validatedData.role as Role;

        // Check if there are actually changes to make
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({
                message: 'No changes specified',
                user: targetUser,
            });
        }

        // Log update attempt
        try {
            await createAuditLog(
                'USER_UPDATE_ATTEMPT',
                currentUser.id,
                targetUser.id,
                {
                    targetUserEmail: targetUser.email,
                    targetUserName: targetUser.name,
                    currentRole: targetUser.role,
                    updates: updateData,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        // Update user
        const updatedUser = await db.user.update({
            where: {id: userId},
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                lastLoginAt: true,
            },
        });

        // Log successful update
        try {
            await createAuditLog(
                'UPDATE_USER',
                currentUser.id,
                userId,
                {
                    previousData: {
                        name: targetUser.name,
                        role: targetUser.role
                    },
                    newData: {
                        name: updatedUser.name,
                        role: updatedUser.role
                    },
                    adminEmail: currentUser.email,
                    targetUserEmail: targetUser.email,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        return NextResponse.json({
            message: 'User updated successfully',
            user: updatedUser,
        });

    } catch (error) {
        console.error('User update error:', error);

        if (error instanceof z.ZodError) {
            try {
                const currentUser = await validateAuthAndGetUser();
                await createAuditLog(
                    'USER_UPDATE_VALIDATION_ERROR',
                    currentUser.id,
                    currentUser.id,
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
                    error: 'Invalid request data',
                    details: error.errors,
                },
                {status: 400}
            );
        }

        try {
            const currentUser = await validateAuthAndGetUser();
            await createAuditLog(
                'USER_UPDATE_ERROR',
                currentUser.id,
                currentUser.id,
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
            {error: 'Failed to update user'},
            {status: 500}
        );
    }
}

/**
 * Delete a user account while preserving their data
 * @method DELETE
 * @description Safely deletes a user account by setting their references to NULL in related data.
 * This preserves data integrity while removing the user from the system.
 * Only admins can perform this action.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "message": { "type": "string" },
 *     "preservedData": {
 *       "type": "object",
 *       "properties": {
 *         "auditLogs": { "type": "number" },
 *         "changelogRequests": { "type": "number" },
 *         "apiKeys": { "type": "number" },
 *         "invitations": { "type": "number" }
 *       }
 *     }
 *   }
 * }
 * @error 403 Unauthorized - Only admins can delete users
 * @error 404 User not found
 * @error 400 Cannot delete own account or last admin
 * @error 500 Failed to delete user
 */
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const currentUser = await validateAuthAndGetUser();

        // Only admins can delete users
        if (currentUser.role !== 'ADMIN') {
            try {
                await createAuditLog(
                    'UNAUTHORIZED_USER_DELETE_ATTEMPT',
                    currentUser.id,
                    currentUser.id,
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
                {error: 'Unauthorized - Only admins can delete users'},
                {status: 403}
            );
        }

        const {userId} = await context.params;

        if (!userId) {
            return NextResponse.json(
                {error: 'User ID is required'},
                {status: 400}
            );
        }

        // Check if user exists
        const targetUser = await db.user.findUnique({
            where: {id: userId},
            select: {
                id: true,
                email: true,
                role: true,
                name: true,
                createdAt: true
            },
        });

        if (!targetUser) {
            try {
                await createAuditLog(
                    'USER_DELETE_NOT_FOUND',
                    currentUser.id,
                    currentUser.id,
                    {
                        action: 'DELETE_USER',
                        requestedUserId: userId,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return NextResponse.json(
                {error: 'User not found'},
                {status: 404}
            );
        }

        // Prevent self-deletion
        if (targetUser.id === currentUser.id) {
            try {
                await createAuditLog(
                    'SELF_DELETE_ATTEMPT',
                    currentUser.id,
                    currentUser.id,
                    {
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create audit log:', auditLogError);
            }

            return NextResponse.json(
                {error: 'Cannot delete your own account'},
                {status: 400}
            );
        }

        // Check if this is the last admin
        if (targetUser.role === 'ADMIN') {
            const adminCount = await db.user.count({
                where: {role: 'ADMIN'}
            });

            if (adminCount <= 1) {
                try {
                    await createAuditLog(
                        'LAST_ADMIN_DELETE_ATTEMPT',
                        currentUser.id,
                        targetUser.id,
                        {
                            targetUserEmail: targetUser.email,
                            adminCount,
                            timestamp: new Date().toISOString()
                        }
                    );
                } catch (auditLogError) {
                    console.error('Failed to create audit log:', auditLogError);
                }

                return NextResponse.json(
                    {error: 'Cannot delete the last admin user'},
                    {status: 400}
                );
            }
        }

        // Log deletion attempt
        try {
            await createAuditLog(
                'USER_DELETE_ATTEMPT',
                currentUser.id,
                targetUser.id,
                {
                    targetUserEmail: targetUser.email,
                    targetUserName: targetUser.name,
                    targetUserRole: targetUser.role,
                    targetUserCreatedAt: targetUser.createdAt.toISOString(),
                    adminEmail: currentUser.email,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        // Create preserved user data object
        const preservedUserData: PreservedUserData = {
            id: targetUser.id,
            email: targetUser.email,
            name: targetUser.name,
            role: targetUser.role, // This will be automatically converted to string
            deletedAt: new Date().toISOString(),
            deletedBy: currentUser.id
        };

        // Perform the deletion in a transaction to ensure data consistency
        const result = await db.$transaction(async (tx) => {
            // Count existing data for reporting
            const [
                auditLogCount,
                changelogRequestCount,
                apiKeyCount,
                invitationCount
            ] = await Promise.all([
                tx.auditLog.count({where: {OR: [{userId}, {targetUserId: userId}]}}),
                tx.changelogRequest.count({where: {OR: [{staffId: userId}, {adminId: userId}]}}),
                tx.apiKey.count({where: {userId}}),
                tx.invitationLink.count({where: {createdBy: userId}})
            ]);

            // Step 1: Preserve user info in audit logs before deletion
            if (auditLogCount > 0) {
                // Get audit logs where user is the performer
                const userAuditLogs = await tx.auditLog.findMany({
                    where: {userId},
                    select: {id: true, details: true}
                });

                // Update each audit log to preserve user info in details
                for (const log of userAuditLogs) {
                    const currentDetails = (log.details as AuditLogDetails) || {};
                    await tx.auditLog.update({
                        where: {id: log.id},
                        data: {
                            details: {
                                ...currentDetails,
                                _preservedUser: preservedUserData
                            }
                        }
                    });
                }

                // Get audit logs where user is the target
                const targetAuditLogs = await tx.auditLog.findMany({
                    where: {targetUserId: userId},
                    select: {id: true, details: true}
                });

                // Update each audit log to preserve target user info in details
                for (const log of targetAuditLogs) {
                    const currentDetails = (log.details as AuditLogDetails) || {};
                    await tx.auditLog.update({
                        where: {id: log.id},
                        data: {
                            details: {
                                ...currentDetails,
                                _preservedTargetUser: preservedUserData
                            }
                        }
                    });
                }
            }

            // Step 2: Revoke all API keys (mark as revoked to preserve audit trail)
            if (apiKeyCount > 0) {
                await tx.apiKey.updateMany({
                    where: {userId},
                    data: {isRevoked: true}
                });
            }

            // Step 3: Mark unused invitations as used/expired (preserve for audit trail)
            if (invitationCount > 0) {
                await tx.invitationLink.updateMany({
                    where: {
                        createdBy: userId,
                        usedAt: null
                    },
                    data: {usedAt: new Date()}
                });
            }

            // Step 4: Delete the user account
            // Foreign key constraints will automatically SET NULL on related records
            // But we've already preserved the user info in the audit log details
            await tx.user.delete({
                where: {id: userId}
            });

            return {
                preservedData: {
                    auditLogs: auditLogCount,
                    changelogRequests: changelogRequestCount,
                    apiKeys: apiKeyCount,
                    invitations: invitationCount
                }
            };
        });

        // Log successful deletion
        try {
            await createAuditLog(
                'DELETE_USER',
                currentUser.id,
                currentUser.id, // Use admin's ID since target user no longer exists
                {
                    deletedUserId: targetUser.id,
                    deletedUserEmail: targetUser.email,
                    deletedUserName: targetUser.name,
                    deletedUserRole: targetUser.role,
                    deletedAt: new Date().toISOString(),
                    adminEmail: currentUser.email,
                    preservedDataCounts: result.preservedData
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        return NextResponse.json({
            message: 'User deleted successfully',
            preservedData: result.preservedData
        });

    } catch (error) {
        console.error('User deletion error:', error);

        // Log deletion error
        try {
            const currentUser = await validateAuthAndGetUser();
            await createAuditLog(
                'USER_DELETE_ERROR',
                currentUser.id,
                currentUser.id,
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
            {error: 'Failed to delete user'},
            {status: 500}
        );
    }
}