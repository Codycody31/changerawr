import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { canUserManageDomain } from '@/lib/custom-domains/service'

export const runtime = 'nodejs'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> },
) {
    const { domain } = await params

    try {
        let user;
        try {
            user = await validateAuthAndGetUser();
        } catch {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const isAdmin = user.role === 'ADMIN'
        const canManage = await canUserManageDomain(domain, user.id, isAdmin)
        if (!canManage) {
            return NextResponse.json({ error: 'Unauthorized to manage this domain' }, { status: 403 })
        }

        const body = await request.json()
        const { forceHttps } = body

        if (typeof forceHttps !== 'boolean') {
            return NextResponse.json(
                { error: 'forceHttps must be a boolean' },
                { status: 400 },
            )
        }

        const customDomain = await db.customDomain.findUnique({
            where: { domain },
        })

        if (!customDomain) {
            return NextResponse.json(
                { error: 'Domain not found' },
                { status: 404 },
            )
        }

        // Only allow force HTTPS if SSL is enabled
        if (forceHttps && customDomain.sslMode !== 'LETS_ENCRYPT') {
            return NextResponse.json(
                { error: 'SSL certificate required to enable force HTTPS' },
                { status: 400 },
            )
        }

        await db.customDomain.update({
            where: { domain },
            data: { forceHttps },
        })

        return NextResponse.json({
            success: true,
            forceHttps,
        })
    } catch (error) {
        console.error('[toggle-https] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        )
    }
}
