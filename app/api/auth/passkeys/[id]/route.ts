import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify the passkey belongs to the user
        const passkey = await db.passkey.findFirst({
            where: {
                id,
                userId: user.id,
            },
        });

        if (!passkey) {
            return NextResponse.json(
                { error: 'Passkey not found' },
                { status: 404 }
            );
        }

        await db.passkey.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete passkey:', error);
        return NextResponse.json(
            { error: 'Failed to delete passkey' },
            { status: 500 }
        );
    }
}