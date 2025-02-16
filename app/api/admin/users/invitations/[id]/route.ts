import { validateAuthAndGetUser } from "@/lib/utils/changelog";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/utils/auditLog";
import { db } from "@/lib/db";

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
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