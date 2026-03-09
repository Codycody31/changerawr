import { NextResponse } from 'next/server';
import { handleSAMLCallback } from '@/lib/auth/saml';
import { shouldUseSecureCookies } from '@/lib/utils/cookies';

/**
 * @method POST
 * @description ACS (Assertion Consumer Service) endpoint — handles SAMLResponse from IdP
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ providerName: string }> }
) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    try {
        const { providerName } = await params;

        // Parse URL-encoded body from IdP POST binding
        const contentType = request.headers.get('content-type') || '';
        let samlResponse = '';
        let relayState = '';

        if (contentType.includes('application/x-www-form-urlencoded')) {
            const text = await request.text();
            const body = new URLSearchParams(text);
            samlResponse = body.get('SAMLResponse') || '';
            relayState = body.get('RelayState') || '';
        } else {
            const body = await request.json().catch(() => ({})) as Record<string, string>;
            samlResponse = body.SAMLResponse || '';
            relayState = body.RelayState || '';
        }

        if (!samlResponse) {
            return NextResponse.redirect(
                `${baseUrl}/login?error=${encodeURIComponent('Missing SAMLResponse')}`
            );
        }

        const authResult = await handleSAMLCallback(providerName, samlResponse);

        // Parse redirect from RelayState
        let redirectUrl = `${baseUrl}/dashboard`;
        if (relayState) {
            try {
                const stateObj = JSON.parse(Buffer.from(relayState, 'base64').toString());
                if (stateObj.redirect) {
                    redirectUrl = stateObj.redirect.startsWith('/')
                        ? `${baseUrl}${stateObj.redirect}`
                        : stateObj.redirect;
                }
            } catch {
                // ignore malformed relay state
            }
        }

        const response = NextResponse.redirect(
            `${baseUrl}/oauth-callback?redirect=${encodeURIComponent(redirectUrl)}`,
            { status: 302 }
        );

        const useSecure = shouldUseSecureCookies(request);

        response.cookies.set('accessToken', authResult.accessToken, {
            httpOnly: true,
            secure: useSecure,
            sameSite: 'lax',
            maxAge: 15 * 60,
            path: '/',
        });

        response.cookies.set('refreshToken', authResult.refreshToken, {
            httpOnly: true,
            secure: useSecure,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('SAML callback error:', error);
        return NextResponse.redirect(
            `${baseUrl}/login?error=${encodeURIComponent('SAML authentication failed')}`
        );
    }
}
