import { NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/auth/webauthn';
import { generateTokens } from '@/lib/auth/tokens';
import { db } from '@/lib/db';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            response,
            challenge,
        } = body as {
            response: AuthenticationResponseJSON;
            challenge: string;
        };

        // Find the passkey
        const passkey = await db.passkey.findUnique({
            where: { credentialId: response.id },
            include: { user: true },
        });

        if (!passkey) {
            return NextResponse.json(
                { error: 'Passkey not found' },
                { status: 400 }
            );
        }

        const verification = await verifyAuthentication(
            response,
            challenge,
            passkey.publicKey,
            passkey.counter
        );

        if (!verification.verified) {
            return NextResponse.json(
                { error: 'Authentication verification failed' },
                { status: 400 }
            );
        }

        // Update counter and last used
        await db.passkey.update({
            where: { id: passkey.id },
            data: {
                counter: verification.authenticationInfo.newCounter,
                lastUsedAt: new Date(),
            },
        });

        const user = passkey.user;

        // Check if this passkey login requires a password as second factor
        if (user.twoFactorMode === 'PASSKEY_PLUS_PASSWORD') {
            // Create a 2FA session
            const session = await db.twoFactorSession.create({
                data: {
                    userId: user.id,
                    type: 'PASSKEY_PLUS_PASSWORD',
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
                },
            });

            return NextResponse.json({
                requiresSecondFactor: true,
                secondFactorType: 'password',
                sessionToken: session.id,
                message: 'Password verification required'
            });
        }

        // Complete regular login
        const tokens = await generateTokens(user.id);

        // Update last login
        await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });

        const authResponse = NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            ...tokens,
        });

        // Set cookies
        authResponse.cookies.set('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60,
        });

        authResponse.cookies.set('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60,
        });

        return authResponse;
    } catch (error) {
        console.error('Failed to verify authentication:', error);
        return NextResponse.json(
            { error: 'Failed to verify authentication' },
            { status: 500 }
        );
    }
}