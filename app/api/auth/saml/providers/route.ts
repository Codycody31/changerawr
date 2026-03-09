import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * @method GET
 * @description Returns enabled SAML providers for the login page
 */
export async function GET() {
    try {
        const providers = await db.sAMLProvider.findMany({
            where: { enabled: true },
            select: { id: true, name: true, isDefault: true },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json({ providers });
    } catch (error) {
        console.error('Failed to fetch SAML providers:', error);
        return NextResponse.json({ providers: [] });
    }
}
