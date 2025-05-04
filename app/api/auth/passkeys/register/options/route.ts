import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { generateRegistrationOptionsForUser } from '@/lib/auth/webauthn';
import { db } from '@/lib/db';

export async function POST() {
    try {
        const user = await validateAuthAndGetUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the full user data with name field
        const fullUser = await db.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        if (!fullUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get existing passkeys to exclude
        const existingPasskeys = await db.passkey.findMany({
            where: { userId: user.id },
            select: {
                credentialId: true,
                transports: true
            },
        });

        const options = await generateRegistrationOptionsForUser(
            fullUser.id,
            fullUser.name || '',
            fullUser.email,
            existingPasskeys.map(p => ({
                id: p.credentialId,
                transports: p.transports || undefined,
            }))
        );

        // Store challenge in user record for verification
        await db.user.update({
            where: { id: user.id },
            data: {
                lastChallenge: options.challenge,
            },
        });

        return NextResponse.json(options);
    } catch (error) {
        console.error('Failed to generate registration options:', error);
        return NextResponse.json(
            { error: 'Failed to generate registration options' },
            { status: 500 }
        );
    }
}