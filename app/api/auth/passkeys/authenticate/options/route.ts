import { NextResponse } from 'next/server';
import { generateAuthenticationOptionsForUser } from '@/lib/auth/webauthn';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        let allowCredentials: { id: string; transports?: string[] }[] = [];

        if (email) {
            // Get user's passkeys
            const user = await db.user.findUnique({
                where: { email: email.toLowerCase() },
                include: {
                    passkeys: {
                        select: {
                            credentialId: true,
                            transports: true,
                        },
                    },
                },
            });

            if (user?.passkeys) {
                allowCredentials = user.passkeys.map(p => ({
                    id: p.credentialId,
                    transports: p.transports || undefined,
                }));
            }
        }

        const options = await generateAuthenticationOptionsForUser(allowCredentials);

        // Store challenge temporarily (you might use Redis or session for this)
        return NextResponse.json({
            options,
            challenge: options.challenge
        });
    } catch (error) {
        console.error('Failed to generate authentication options:', error);
        return NextResponse.json(
            { error: 'Failed to generate authentication options' },
            { status: 500 }
        );
    }
}