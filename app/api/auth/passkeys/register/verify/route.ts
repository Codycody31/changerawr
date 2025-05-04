import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { verifyRegistration } from '@/lib/auth/webauthn';
import { db } from '@/lib/db';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';

export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { response, name } = body as {
            response: RegistrationResponseJSON;
            name: string;
        };

        // Get stored challenge
        const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { lastChallenge: true },
        });

        if (!dbUser?.lastChallenge) {
            return NextResponse.json(
                { error: 'Challenge not found' },
                { status: 400 }
            );
        }

        const verification = await verifyRegistration(response, dbUser.lastChallenge);

        if (!verification.verified || !verification.registrationInfo) {
            return NextResponse.json(
                { error: 'Registration verification failed' },
                { status: 400 }
            );
        }

        const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

        // Create passkey record
        const passkey = await db.passkey.create({
            data: {
                userId: user.id,
                credentialId: Buffer.from(credentialID).toString('base64url'),
                publicKey: Buffer.from(credentialPublicKey).toString('base64'),
                counter,
                name,
                transports: response.response.transports || [],
            },
        });

        return NextResponse.json({ success: true, passkey });
    } catch (error) {
        console.error('Failed to verify registration:', error);
        return NextResponse.json(
            { error: 'Failed to verify registration' },
            { status: 500 }
        );
    }
}