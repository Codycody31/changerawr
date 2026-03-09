import { NextResponse } from 'next/server';
import { getSAMLMetadata } from '@/lib/auth/saml';

/**
 * @method GET
 * @description Returns SP metadata XML for IdP registration
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ providerName: string }> }
) {
    try {
        const { providerName } = await params;
        const metadata = await getSAMLMetadata(providerName);

        return new NextResponse(metadata, {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('SAML metadata error:', error);
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
}
