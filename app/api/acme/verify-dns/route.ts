import { NextRequest, NextResponse } from 'next/server'
import { sslSupported } from '@/lib/custom-domains/ssl/is-supported'
import { completeDns01Certificate } from '@/lib/custom-domains/ssl/service'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

interface VerifyDnsRequest {
    certId: string
}

export async function POST(request: NextRequest) {
    console.log('[acme/verify-dns] 🔵 DNS verification request received')

    if (!sslSupported) {
        console.log('[acme/verify-dns] ❌ SSL not supported (not in Docker deployment)')
        return NextResponse.json(
            { error: 'SSL certificate management is only available in Docker deployments' },
            { status: 503 },
        )
    }

    try {
        const body: VerifyDnsRequest = await request.json()
        console.log('[acme/verify-dns] 📋 Request body:', body)

        if (!body.certId) {
            console.log('[acme/verify-dns] ❌ Missing certId in request')
            return NextResponse.json(
                { error: 'Missing required field: certId' },
                { status: 400 },
            )
        }

        console.log(`[acme/verify-dns] 🔍 Looking up certificate: ${body.certId}`)

        // Verify cert exists and is in the right state
        const cert = await db.domainCertificate.findUnique({
            where: { id: body.certId },
            include: {
                domain: true,
            },
        })

        if (!cert) {
            console.log(`[acme/verify-dns] ❌ Certificate not found: ${body.certId}`)
            return NextResponse.json(
                { error: 'Certificate not found' },
                { status: 404 },
            )
        }

        console.log(`[acme/verify-dns] ✅ Found certificate for ${cert.domain.domain}`)
        console.log(`[acme/verify-dns] 📊 Certificate status: ${cert.status}`)

        if (cert.status !== 'PENDING_DNS01') {
            console.log(`[acme/verify-dns] ❌ Invalid certificate state: ${cert.status} (expected: PENDING_DNS01)`)
            return NextResponse.json(
                { error: `Certificate is not in PENDING_DNS01 state (current: ${cert.status})` },
                { status: 400 },
            )
        }

        console.log('[acme/verify-dns] 🚀 Starting DNS-01 completion process...')

        try {
            // Update status to show we're processing (but keep PENDING_DNS01 status)
            await db.domainCertificate.update({
                where: { id: body.certId },
                data: { lastError: 'Verifying DNS TXT record...' },
            })

            await completeDns01Certificate(body.certId)


            console.log('[acme/verify-dns] ✅ DNS verification successful!')
            return NextResponse.json({
                success: true,
                message: 'Certificate issued successfully',
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            console.error('[acme/verify-dns] ⚠️  DNS completion error:', message)

            // If TXT record not propagated, DON'T mark as failed - keep it PENDING so user can retry
            if (message.includes('not yet propagated') || message.includes('not propagated') || message.includes('DNS validation failed') || message.includes('DNS lookup failed') || message.includes('new order has been created') || message.includes('new TXT value') || message.includes('transient upstream error')) {
                console.log('[acme/verify-dns] 💤 DNS not propagated yet, keeping status as PENDING_DNS01')

                // Update error message but keep status as PENDING_DNS01
                await db.domainCertificate.update({
                    where: { id: body.certId },
                    data: { lastError: message },
                }).catch(() => {})

                return NextResponse.json(
                    {
                        success: false,
                        message: message,
                        hint: 'Refresh SSL setup to see the latest TXT value before retrying.',
                        retry: true,
                    },
                    { status: 202 },
                )
            }

            // For other errors (expired orders, etc), mark as FAILED
            console.error('[acme/verify-dns] ❌ Marking certificate as FAILED')
            await db.domainCertificate.update({
                where: { id: body.certId },
                data: {
                    status: 'FAILED',
                    lastError: message,
                },
            }).catch(() => {})

            // Other errors are actual failures
            throw error
        }
    } catch (error) {
        console.error('[acme/verify-dns] ❌ Fatal error:', error)
        if (error instanceof Error) {
            console.error('[acme/verify-dns]    Message:', error.message)
            console.error('[acme/verify-dns]    Stack:', error.stack)
        }

        const message = error instanceof Error ? error.message : 'Unknown error'

        return NextResponse.json(
            { error: message },
            { status: 500 },
        )
    }
}