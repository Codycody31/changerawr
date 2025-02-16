import { NextRequest, NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for role update
const updateRoleSchema = z.object({
    role: z.enum(['ADMIN', 'STAFF'] as const),
});

export async function PATCH(
    request: NextRequest,
    context: { params: { userId: string } }
) {
    try {
        const currentUser = await validateAuthAndGetUser();

        // Only admins can update roles
        if (currentUser.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized - Only admins can update roles' },
                { status: 403 }
            );
        }

        // Validate user ID
        const { userId } = context.params;
        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const targetUser = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true },
        });

        if (!targetUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Prevent self-role modification
        if (targetUser.id === currentUser.id) {
            return NextResponse.json(
                { error: 'Cannot modify your own role' },
                { status: 400 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const { role } = updateRoleSchema.parse(body);

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
        await db.auditLog.create({
            data: {
                action: 'UPDATE_ROLE',
                userId: currentUser.id,
                targetUserId: userId,
                details: JSON.stringify({
                    previousRole: targetUser.role,
                    newRole: role,
                }),
            },
        });

        return NextResponse.json({
            message: 'Role updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Role update error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Invalid role value',
                    details: error.errors,
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update user role' },
            { status: 500 }
        );
    }
}