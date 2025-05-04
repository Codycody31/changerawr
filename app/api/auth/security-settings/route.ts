import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
    twoFactorMode: z.enum(['NONE', 'PASSKEY_PLUS_PASSWORD', 'PASSWORD_PLUS_PASSKEY'])
});

export async function GET() {
    try {
        const user = await validateAuthAndGetUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const fullUser = await db.user.findUnique({
            where: { id: user.id },
            select: { twoFactorMode: true }
        });

        return NextResponse.json({
            twoFactorMode: fullUser?.twoFactorMode || 'NONE'
        });
    } catch (error) {
        console.error('Failed to fetch security settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch security settings' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const user = await validateAuthAndGetUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { twoFactorMode } = updateSchema.parse(body);

        // Check if user has passkeys before enabling 2FA
        if (twoFactorMode !== 'NONE') {
            const passkeys = await db.passkey.count({
                where: { userId: user.id }
            });

            if (passkeys === 0) {
                return NextResponse.json(
                    { error: 'At least one passkey is required to enable additional security' },
                    { status: 400 }
                );
            }
        }

        const updatedUser = await db.user.update({
            where: { id: user.id },
            data: { twoFactorMode },
            select: { twoFactorMode: true }
        });

        return NextResponse.json({ twoFactorMode: updatedUser.twoFactorMode });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid security settings', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Failed to update security settings:', error);
        return NextResponse.json(
            { error: 'Failed to update security settings' },
            { status: 500 }
        );
    }
}