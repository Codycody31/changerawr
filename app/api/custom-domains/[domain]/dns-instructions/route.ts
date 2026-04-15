import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { DNSInstructions } from '@/lib/types/custom-domains'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { canUserManageDomain } from '@/lib/custom-domains/service'

export const runtime = 'nodejs'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        let user;
        try {
            user = await validateAuthAndGetUser();
        } catch {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
        }

        const { domain: domainName } = await params

        const isAdmin = user.role === 'ADMIN'
        const canManage = await canUserManageDomain(domainName, user.id, isAdmin)
        if (!canManage) {
            return NextResponse.json({ success: false, error: 'Unauthorized to manage this domain' }, { status: 403 })
        }

        const domain = await db.customDomain.findUnique({
            where: { domain: domainName },
            select: {
                verificationToken: true,
                domain: true,
            },
        })

        if (!domain) {
            return NextResponse.json(
                { success: false, error: 'Domain not found' },
                { status: 404 }
            )
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL
        if (!appUrl) {
            return NextResponse.json(
                { success: false, error: 'App URL not configured' },
                { status: 500 }
            )
        }

        // Extract hostname from app URL
        const appDomain = new URL(appUrl).hostname

        const dnsInstructions: DNSInstructions = {
            cname: {
                name: domain.domain,
                value: appDomain,
                description: `Point your domain to ${appDomain}`,
            },
            txt: {
                name: `_chrverify.${domain.domain}`,
                value: domain.verificationToken,
                description: 'Verify domain ownership',
            },
        }

        return NextResponse.json({
            success: true,
            dnsInstructions,
        })
    } catch (error) {
        console.error('[dns-instructions] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to generate DNS instructions' },
            { status: 500 }
        )
    }
}
