import { validateAuthAndGetUser } from "@/lib/utils/changelog";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/utils/auditLog";
import { db } from "@/lib/db";

/**
 * Revoke an invitation
 * @method DELETE
 * @description Revokes an invitation by marking it as used. Only admins have the permission to revoke invitations.
 * @queryParams { id: string } - The invitation ID to be revoked.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "message": { "type": "string" },
 *     "invitation": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "email": { "type": "string" },
 *         "role": { "type": "string" },
 *         "expiresAt": { "type": "string", "format": "date-time" },
 *         "usedAt": { "type": "string", "format": "date-time" }
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
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 500 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            // Log unauthorized attempt to revoke invitation
            try {
                await createAuditLog(
                    'UNAUTHORIZED_ACCESS_ATTEMPT',
                    user.id,
                    user.id, // Use the user's own ID as target to avoid foreign key issues
                    {
                        action: 'REVOKE_INVITATION',
                        targetInvitationId: (await params).id,
                        userRole: user.role,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create unauthorized access audit log:', auditLogError);
            }

            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Await params to satisfy Next.js's requirement
        const awaitedParams = await Promise.resolve(params);

        // Create audit log for attempting to revoke an invitation
        try {
            await createAuditLog(
                'INVITATION_REVOCATION_ATTEMPT',
                user.id,
                user.id, // Use the admin's own ID as target to avoid foreign key issues
                {
                    invitationId: awaitedParams.id,
                    timestamp: new Date().toISOString(),
                    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create attempt audit log:', auditLogError);
        }

        // Fetch the invitation details before revoking
        const existingInvitation = await db.invitationLink.findUnique({
            where: { id: awaitedParams.id }
        });

        if (!existingInvitation) {
            // Log attempt to revoke non-existent invitation
            try {
                await createAuditLog(
                    'INVITATION_NOT_FOUND',
                    user.id,
                    user.id, // Use the admin's own ID as target to avoid foreign key issues
                    {
                        invitationId: awaitedParams.id,
                        timestamp: new Date().toISOString(),
                        action: 'REVOKE_INVITATION'
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create not found audit log:', auditLogError);
            }

            return NextResponse.json(
                { error: 'Invitation link not found' },
                { status: 404 }
            );
        }

        // Check if invitation is already used/revoked
        if (existingInvitation.usedAt) {
            // Log attempt to revoke already revoked invitation
            try {
                await createAuditLog(
                    'INVITATION_ALREADY_REVOKED',
                    user.id,
                    user.id, // Use the admin's own ID as target to avoid foreign key issues
                    {
                        invitationId: existingInvitation.id,
                        invitationEmail: existingInvitation.email,
                        originalUsedAt: existingInvitation.usedAt.toISOString(),
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (auditLogError) {
                console.error('Failed to create already revoked audit log:', auditLogError);
            }

            return NextResponse.json({
                message: 'Invitation has already been revoked',
                invitation: existingInvitation
            });
        }

        // Check if invitation is expired
        const isExpired = existingInvitation.expiresAt < new Date();

        // Create audit log BEFORE performing the update
        try {
            await createAuditLog(
                'REVOKE_INVITATION',
                user.id,
                user.id, // Use the admin's own ID as target to avoid foreign key issues
                {
                    invitationId: existingInvitation.id,
                    invitationEmail: existingInvitation.email,
                    invitationRole: existingInvitation.role,
                    originalExpiresAt: existingInvitation.expiresAt.toISOString(),
                    wasAlreadyExpired: isExpired,
                    revokedBy: user.email || user.id,
                    revokedAt: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create revocation audit log:', auditLogError);
            // Continue execution even if audit log creation fails
        }

        // Instead of deleting, mark the invitation as used
        const updatedInvitation = await db.invitationLink.update({
            where: { id: awaitedParams.id },
            data: {
                usedAt: new Date(), // Mark as used to effectively revoke it
            }
        });

        // Create success audit log after update
        try {
            await createAuditLog(
                'INVITATION_REVOCATION_SUCCESS',
                user.id,
                user.id, // Use the admin's own ID as target to avoid foreign key issues
                {
                    invitationId: updatedInvitation.id,
                    invitationEmail: updatedInvitation.email,
                    invitationRole: updatedInvitation.role,
                    usedAt: updatedInvitation.usedAt?.toISOString(),
                    completedAt: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create success audit log:', auditLogError);
        }

        return NextResponse.json({
            message: 'Invitation link revoked successfully',
            invitation: updatedInvitation
        });
    } catch (error) {
        console.error('Failed to revoke invitation link:', error);

        // Log error during invitation revocation
        try {
            const user = await validateAuthAndGetUser();
            await createAuditLog(
                'INVITATION_REVOCATION_ERROR',
                user.id,
                user.id, // Use the user's own ID as target to avoid foreign key issues
                {
                    invitationId: (await params).id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create error audit log:', auditLogError);
        }

        return NextResponse.json(
            { error: 'Failed to revoke invitation link' },
            { status: 500 }
        );
    }
}