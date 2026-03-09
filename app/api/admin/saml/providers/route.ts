import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { createAuditLog } from '@/lib/utils/auditLog';
import { db } from '@/lib/db';
import { z } from 'zod';

const providerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    entityId: z.string().min(1, 'IdP Entity ID is required'),
    ssoUrl: z.string().url('SSO URL must be a valid URL'),
    certificate: z.string().min(1, 'Certificate is required'),
    spEntityId: z.string().optional().nullable(),
    nameIdFormat: z
        .string()
        .default('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'),
    emailAttribute: z.string().default('email'),
    nameAttribute: z.string().default('name'),
    enabled: z.boolean().default(true),
    isDefault: z.boolean().default(false),
});

export async function GET(request: Request) {
    try {
        const user = await validateAuthAndGetUser();
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const includeAll = searchParams.get('includeAll') === 'true';

        const providers = await db.sAMLProvider.findMany({
            where: includeAll ? {} : { enabled: true },
            orderBy: { name: 'asc' },
        });

        try {
            await createAuditLog('VIEW_SAML_PROVIDERS', user.id, user.id, {
                providerCount: providers.length,
                includeAll,
            });
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        return NextResponse.json({ providers });
    } catch (error) {
        console.error('Failed to fetch SAML providers:', error);
        return NextResponse.json({ error: 'Failed to fetch SAML providers' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser();
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const validatedData = providerSchema.parse(body);

        // Enforce single default
        if (validatedData.isDefault) {
            await db.sAMLProvider.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            });
        }

        const provider = await db.sAMLProvider.create({
            data: {
                name: validatedData.name,
                entityId: validatedData.entityId,
                ssoUrl: validatedData.ssoUrl,
                certificate: validatedData.certificate,
                spEntityId: validatedData.spEntityId || null,
                nameIdFormat: validatedData.nameIdFormat,
                emailAttribute: validatedData.emailAttribute,
                nameAttribute: validatedData.nameAttribute,
                enabled: validatedData.enabled,
                isDefault: validatedData.isDefault,
            },
        });

        try {
            await createAuditLog('CREATE_SAML_PROVIDER', user.id, user.id, {
                providerId: provider.id,
                providerName: provider.name,
                enabled: provider.enabled,
                isDefault: provider.isDefault,
            });
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
        }

        return NextResponse.json(
            { id: provider.id, name: provider.name, enabled: provider.enabled, isDefault: provider.isDefault },
            { status: 201 }
        );
    } catch (error) {
        console.error('Failed to create SAML provider:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create SAML provider' }, { status: 500 });
    }
}
