import { NextResponse } from 'next/server';
import { getOAuthLoginUrl } from '@/lib/auth/oauth';
import { db } from '@/lib/db';

/**
 * @method GET
 * @description Redirects to OAuth provider authorization URL
 * @param {string} providerName - The name of the OAuth provider
 * @query {
 *   state: Optional state parameter for security
 *   redirect: Where to redirect after successful authentication
 * }
 * @response 302 Redirect to OAuth provider
 * @error 400 Provider name is required
 * @error 404 Provider not found
 * @error 500 An unexpected error occurred
 */
export async function GET(
    request: Request,
    { params }: { params: { providerName: string } }
) {
    try {
        // Await params before destructuring
        const providerName = (await params).providerName;
        const { searchParams } = new URL(request.url);
        // const state = searchParams.get('state') || '';
        const redirect = searchParams.get('redirect') || '/dashboard';

        // Find provider by name with case-insensitive search
        const provider = await db.oAuthProvider.findFirst({
            where: {
                name: {
                    equals: providerName,
                    mode: 'insensitive' // Case insensitive search
                },
                enabled: true
            }
        });

        if (!provider) {
            console.log(`Provider not found: ${providerName}`);
            return NextResponse.json(
                { error: `Provider not found: ${providerName}` },
                { status: 404 }
            );
        }

        // Create a state param that includes redirect info
        const stateObj = {
            redirect,
            nonce: Math.random().toString(36).substring(2, 15)
        };

        const encodedState = Buffer.from(JSON.stringify(stateObj)).toString('base64');

        // Get OAuth login URL using provider ID
        const loginUrl = await getOAuthLoginUrl(provider.id, encodedState);

        // Redirect to OAuth provider
        return NextResponse.redirect(loginUrl);
    } catch (error) {
        console.error('OAuth authorization error:', error);

        if ((error as Error).message === 'Provider not found') {
            return NextResponse.json(
                { error: 'Provider not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to initiate OAuth flow' },
            { status: 500 }
        );
    }
}