import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { createAuditLog } from '@/lib/utils/auditLog';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
    name: z.string().min(1).optional(),
    entityId: z.string().min(1).optional(),
    ssoUrl: z.string().url().optional(),
    certificate: z.string().min(1).optional(),
    spEntityId: z.string().optional().nullable(),
    nameIdFormat: z.string().optional(),
    emailAttribute: z.string().optional(),
    nameAttribute: z.string().optional(),
    enabled: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    allowedEmailDomains: z.array(z.string()).optional(),
    blockExistingUsers: z.boolean().optional(),
    requiredClaims: z.record(z.string()).optional().nullable(),
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const validatedData = updateSchema.parse(body);

        const provider = await db.sAMLProvider.findUnique({ where: { id } });
        if (!provider) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
        }

        // Enforce single default
        if (validatedData.isDefault) {
            await db.sAMLProvider.updateMany({
                where: { id: { not: id }, isDefault: true },
                data: { isDefault: false },
            });
        }

        const updatedProvider = await db.sAMLProvider.update({
            where: { id },
            data: {
                ...(validatedData.name !== undefined && { name: validatedData.name }),
                ...(validatedData.entityId !== undefined && { entityId: validatedData.entityId }),
                ...(validatedData.ssoUrl !== undefined && { ssoUrl: validatedData.ssoUrl }),
                ...(validatedData.certificate !== undefined && { certificate: validatedData.certificate }),
                ...(validatedData.spEntityId !== undefined && { spEntityId: validatedData.spEntityId }),
                ...(validatedData.nameIdFormat !== undefined && { nameIdFormat: validatedData.nameIdFormat }),
                ...(validatedData.emailAttribute !== undefined && { emailAttribute: validatedData.emailAttribute }),
                ...(validatedData.nameAttribute !== undefined && { nameAttribute: validatedData.nameAttribute }),
                ...(validatedData.enabled !== undefined && { enabled: validatedData.enabled }),
                ...(validatedData.isDefault !== undefined && { isDefault: validatedData.isDefault }),
                ...(validatedData.allowedEmailDomains !== undefined && { allowedEmailDomains: validatedData.allowedEmailDomains }),
                ...(validatedData.blockExistingUsers !== undefined && { blockExistingUsers: validatedData.blockExistingUsers }),
                ...(validatedData.requiredClaims !== undefined && { requiredClaims: validatedData.requiredClaims || {} }),
            },
        });

        try {
            await createAuditLog('UPDATE_SAML_PROVIDER', user.id, user.id, {
                providerId: updatedProvider.id,
                providerName: updatedProvider.name,
            });
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        return NextResponse.json({
            id: updatedProvider.id,
            name: updatedProvider.name,
            enabled: updatedProvider.enabled,
            isDefault: updatedProvider.isDefault,
            updatedAt: updatedProvider.updatedAt,
        });
    } catch (error) {
        console.error('Failed to update SAML provider:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to update SAML provider' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;

        const provider = await db.sAMLProvider.findUnique({ where: { id } });
        if (!provider) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
        }

        await db.sAMLProvider.delete({ where: { id } });

        try {
            await createAuditLog('DELETE_SAML_PROVIDER', user.id, user.id, {
                deletedProvider: { id: provider.id, name: provider.name },
            });
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete SAML provider:', error);
        return NextResponse.json({ error: 'Failed to delete SAML provider' }, { status: 500 });
    }
}
