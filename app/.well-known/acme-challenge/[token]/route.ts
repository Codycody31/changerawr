import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

const TOKEN_REGEX = /^[a-zA-Z0-9_-]{20,128}$/

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params

    console.log(`[acme-challenge] 🔍 Incoming challenge request for token: ${token}`)

    // Validate token format to prevent directory traversal or injection
    if (!TOKEN_REGEX.test(token)) {
        console.log(`[acme-challenge] ❌ Invalid token format: ${token}`)
        return new NextResponse('Invalid token format', { status: 400 })
    }

    // Get the hostname from the request
    const hostname = request.headers.get('host')?.split(':')[0] || ''
    console.log(`[acme-challenge] 🌐 Request from hostname: ${hostname}`)

    try {
        // Debug: Log all pending HTTP01 challenges
        const allPending = await db.domainCertificate.findMany({
            where: { status: 'PENDING_HTTP01' },
            select: {
                id: true,
                challengeToken: true,
                domain: { select: { domain: true } },
            },
        })
        console.log(`[acme-challenge] 📋 Found ${allPending.length} pending HTTP-01 challenges in database:`)
        allPending.forEach(p => {
            console.log(`[acme-challenge]    - ${p.domain.domain}: token=${p.challengeToken}`)
        })

        // Find the certificate challenge for this specific domain and token
        const cert = await db.domainCertificate.findFirst({
            where: {
                challengeToken: token,
                status: 'PENDING_HTTP01',
                domain: {
                    domain: hostname,
                },
            },
            include: {
                domain: {
                    select: {
                        domain: true,
                    },
                },
            },
        })

        if (!cert?.challengeKeyAuth) {
            console.log(`[acme-challenge] ❌ Challenge NOT FOUND`)
            console.log(`[acme-challenge]    Looking for: domain=${hostname}, status=PENDING_HTTP01, token=${token}`)
            return new NextResponse('Challenge not found', { status: 404 })
        }

        console.log(`[acme-challenge] ✅ Found matching challenge for ${cert.domain.domain}`)
        console.log(`[acme-challenge] 📤 Serving key authorization: ${cert.challengeKeyAuth.substring(0, 20)}...`)

        // Let's Encrypt expects exactly this response with no extra whitespace
        return new NextResponse(cert.challengeKeyAuth, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        })
    } catch (error) {
        console.error('[acme-challenge] ❌ Database error:', error)
        return new NextResponse('Internal server error', { status: 500 })
    }
}
