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
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Await params to satisfy Next.js's requirement
        const awaitedParams = await Promise.resolve(params);

        // Fetch the invitation details before revoking
        const existingInvitation = await db.invitationLink.findUnique({
            where: { id: awaitedParams.id }
        });

        if (!existingInvitation) {
            return NextResponse.json(
                { error: 'Invitation link not found' },
                { status: 404 }
            );
        }

        // Create audit log BEFORE performing the update
        try {
            await createAuditLog(
                'REVOKE_INVITATION',
                user.id,
                existingInvitation.id,
                {
                    invitationEmail: existingInvitation.email,
                    invitationRole: existingInvitation.role,
                    originalExpiresAt: existingInvitation.expiresAt.toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
            // Continue execution even if audit log creation fails
        }

        // Instead of deleting, mark the invitation as used
        const updatedInvitation = await db.invitationLink.update({
            where: { id: awaitedParams.id },
            data: {
                usedAt: new Date(), // Mark as used to effectively revoke it
            }
        });

        return NextResponse.json({
            message: 'Invitation link revoked successfully',
            invitation: updatedInvitation
        });
    } catch (error) {
        console.error('Failed to revoke invitation link:', error);
        return NextResponse.json(
            { error: 'Failed to revoke invitation link' },
            { status: 500 }
        );
    }
}