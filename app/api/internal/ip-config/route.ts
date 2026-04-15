import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Internal endpoint used by Next.js middleware to fetch the IP whitelist config.
 * Protected by INTERNAL_API_SECRET — not intended to be called by clients.
 */
export async function GET(request: NextRequest) {
    const secret = request.headers.get('x-internal-secret')
    const expected = process.env.INTERNAL_API_SECRET

    if (!expected || !secret || secret !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const config = await db.systemConfig.findFirst({
            select: {
                panelIpWhitelistEnabled: true,
                panelIpWhitelist: true,
            },
        })

        return NextResponse.json({
            enabled: config?.panelIpWhitelistEnabled ?? false,
            whitelist: config?.panelIpWhitelist ?? [],
        })
    } catch {
        // Fail open — if we can't read config, don't block users
        return NextResponse.json({ enabled: false, whitelist: [] })
    }
}
