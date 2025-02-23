import { NextRequest, NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { createAuditLog } from '@/lib/utils/auditLog';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateUserSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    role: z.enum(['ADMIN', 'STAFF']).optional(),
});

/**
 * @method GET
 * @description Fetches the user details for the given user ID. Only admins can view user details.
 * @queryParam {string} userId - The user ID to fetch details for.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "email": { "type": "string" },
 *     "name": { "type": "string" },
 *     "role": { "type": "string" },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "lastLoginAt": { "type": "string", "format": "date-time" },
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Invalid request"
 *     }
 *   }
 * }
 * @error 403 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Forbidden"
 *     }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "User not found"
 *     }
 *   }
 * }
 * @error 500 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Internal server error"
 *     }
 *   }
 * }
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const currentUser = await validateAuthAndGetUser();

        // Only admins can view user details
        if (currentUser.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { userId } = params;
        const targetUser = await db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                lastLoginAt: true,
            }
        });

        if (!targetUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Log the user profile view
        await createAuditLog(
            'VIEW_USER_PROFILE',
            currentUser.id,
            userId,
            {
                viewedEmail: targetUser.email,
                viewedRole: targetUser.role
            }
        );

        return NextResponse.json(targetUser);
    } catch (error) {
        console.error('Failed to fetch user:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user' },
            { status: 500 }
        );
    }
}

/**
 * @method PATCH
 * @description Updates the user details for the given user ID. Only admins can update user details.
 * @queryParam {string} userId - The user ID to update details for.
 * @requestBody {
 *   "type": "object",
 *   "properties": {
 *     "name": { "type": "string", "minLength": 1, "maxLength": 100, "optional": true },
 *     "role": { "type": "string", "enum": ["ADMIN", "STAFF"], "optional": true }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "email": { "type": "string" },
 *     "name": { "type": "string" },
 *     "role": { "type": "string" },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "lastLoginAt": { "type": "string", "format": "date-time" },
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Invalid request"
 *     }
 *   }
 * }
 * @error 403 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Forbidden"
 *     }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "User not found"
 *     }
 *   }
 * }
 * @error 500 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Internal server error"
 *     }
 *   }
 * }
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const currentUser = await validateAuthAndGetUser();

        // Only admins can update users
        if (currentUser.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { userId } = params;
        const body = await request.json();
        const validatedData = updateUserSchema.parse(body);

        // Prevent self-role change
        if (userId === currentUser.id && validatedData.role) {
            return NextResponse.json(
                { error: 'Cannot change your own role' },
                { status: 400 }
            );
        }

        const targetUser = await db.user.findUnique({
            where: { id: userId }
        });

        if (!targetUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Prepare audit log details
        const auditDetails: Record<string, unknown> = {};
        if (validatedData.name) {
            auditDetails.previousName = targetUser.name;
            auditDetails.newName = validatedData.name;
        }
        if (validatedData.role) {
            auditDetails.previousRole = targetUser.role;
            auditDetails.newRole = validatedData.role;
        }

        // Update user
        const updatedUser = await db.user.update({
            where: { id: userId },
            data: {
                ...(validatedData.name && { name: validatedData.name }),
                ...(validatedData.role && { role: validatedData.role }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            }
        });

        // Create audit log
        await createAuditLog(
            'UPDATE_USER',
            currentUser.id,
            userId,
            auditDetails
        );

        return NextResponse.json(updatedUser);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Failed to update user:', error);
        return NextResponse.json(
            { error: 'Failed to update user' },
            { status: 500 }
        );
    }
}

/**
 * @method DELETE
 * @description Deletes the user with the given user ID. Only admins can delete users.
 * @queryParam {string} userId - The user ID to delete.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "message": { "type": "string", "example": "User deleted successfully" }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Invalid request"
 *     }
 *   }
 * }
 * @error 403 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Forbidden"
 *     }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "User not found"
 *     }
 *   }
 * }
 * @error 500 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Internal server error"
 *     }
 *   }
 * }
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const currentUser = await validateAuthAndGetUser();

        // Only admins can delete users
        if (currentUser.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { userId } = params;

        // Prevent self-deletion
        if (userId === currentUser.id) {
            return NextResponse.json(
                { error: 'Cannot delete your own account' },
                { status: 400 }
            );
        }

        const targetUser = await db.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                name: true,
                role: true,
                id: true,
                createdAt: true
            }
        });

        if (!targetUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Create audit log BEFORE deleting the user
        await createAuditLog(
            'DELETE_USER',
            currentUser.id,
            userId,
            {
                userEmail: targetUser.email || 'N/A',
                userName: targetUser.name || 'N/A',
                userRole: targetUser.role || 'N/A',
                userCreatedAt: targetUser.createdAt.toISOString()
            }
        );

        // Delete the user
        await db.user.delete({
            where: { id: userId }
        });

        return NextResponse.json({
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Failed to delete user:', error);
        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}