import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const user = await validateAuthAndGetUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const passkeys = await db.passkey.findMany({
            where: { userId: user.id },
            select: {
                id: true,
                name: true,
                createdAt: true,
                lastUsedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ passkeys });
    } catch (error) {
        console.error('Failed to fetch passkeys:', error);
        return NextResponse.json(
            { error: 'Failed to fetch passkeys' },
            { status: 500 }
        );
    }
}