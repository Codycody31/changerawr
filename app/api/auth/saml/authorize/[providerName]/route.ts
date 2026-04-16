import { NextResponse } from 'next/server';
import { getSAMLLoginUrl } from '@/lib/auth/saml';

/**
 * @method GET
 * @description Initiates SP-initiated SAML SSO by redirecting to the IdP
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ providerName: string }> }
) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    try {
        const { providerName } = await params;
        const { searchParams } = new URL(request.url);
        const redirect = searchParams.get('redirect') || `${baseUrl}/dashboard`;

        // Build RelayState with redirect URL and a nonce
        const relayState = Buffer.from(
            JSON.stringify({ redirect, nonce: crypto.randomUUID() })
        ).toString('base64');

        const loginUrl = await getSAMLLoginUrl(providerName, relayState);
        return NextResponse.redirect(loginUrl, { status: 302 });
    } catch (error) {
        console.error('SAML authorize error:', error);
        return NextResponse.redirect(
            `${baseUrl}/login?error=${encodeURIComponent('SAML provider not available')}`
        );
    }
}
