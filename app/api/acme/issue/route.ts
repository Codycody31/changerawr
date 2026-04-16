import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sslSupported } from '@/lib/custom-domains/ssl/is-supported'
import {
    initiateHttp01Certificate,
    initiateDns01Certificate,
} from '@/lib/custom-domains/ssl/service'

export const runtime = 'nodejs'

interface IssueRequest {
    domainId: string
    challengeType: 'HTTP01' | 'DNS01'
}

export async function POST(request: NextRequest) {
    if (!sslSupported) {
        return NextResponse.json(
            { error: 'SSL certificate management is only available in Docker deployments' },
            { status: 503 },
        )
    }

    try {
        const body: IssueRequest = await request.json()

        if (!body.domainId || !body.challengeType) {
            return NextResponse.json(
                { error: 'Missing required fields: domainId, challengeType' },
                { status: 400 },
            )
        }

        if (!['HTTP01', 'DNS01'].includes(body.challengeType)) {
            return NextResponse.json(
                { error: 'challengeType must be HTTP01 or DNS01' },
                { status: 400 },
            )
        }

        // Verify domain exists and is verified
        const domain = await db.customDomain.findUnique({
            where: { id: body.domainId },
        })

        if (!domain) {
            return NextResponse.json(
                { error: 'Domain not found' },
                { status: 404 },
            )
        }

        if (!domain.verified) {
            return NextResponse.json(
                { error: 'Domain must be verified before issuing a certificate' },
                { status: 400 },
            )
        }

        // Check if there's already an active certificate
        const existingCert = await db.domainCertificate.findFirst({
            where: {
                domainId: body.domainId,
                status: 'ISSUED',
            },
        })

        if (existingCert) {
            return NextResponse.json(
                {
                    error: 'Domain already has an active certificate',
                    certificateId: existingCert.id,
                    canForceDelete: true
                },
                { status: 409 },
            )
        }

        // Check for pending/failed certificates and delete ONLY stale ones
        // Don't delete recent pending certs (< 2 minutes old) as they might be in the middle of validation
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

        const staleCerts = await db.domainCertificate.findMany({
            where: {
                domainId: body.domainId,
                status: { in: ['PENDING_HTTP01', 'PENDING_DNS01', 'FAILED'] },
                createdAt: { lt: twoMinutesAgo },
            },
        })

        if (staleCerts.length > 0) {
            console.log(`[acme/issue] Deleting ${staleCerts.length} stale certificates (older than 2 minutes) for domain ${domain.domain}`)
            await db.domainCertificate.deleteMany({
                where: {
                    domainId: body.domainId,
                    status: { in: ['PENDING_HTTP01', 'PENDING_DNS01', 'FAILED'] },
                    createdAt: { lt: twoMinutesAgo },
                },
            })
        }

        // Check if there's STILL a recent pending cert (created in last 2 minutes)
        const recentPendingCert = await db.domainCertificate.findFirst({
            where: {
                domainId: body.domainId,
                status: { in: ['PENDING_HTTP01', 'PENDING_DNS01'] },
                createdAt: { gte: twoMinutesAgo },
            },
        })

        if (recentPendingCert) {
            console.log(`[acme/issue] Recent pending certificate already exists (created ${Math.floor((Date.now() - recentPendingCert.createdAt.getTime()) / 1000)}s ago)`)
            return NextResponse.json(
                {
                    error: 'A certificate issuance is already in progress. Please wait 2 minutes before trying again.',
                    certId: recentPendingCert.id,
                },
                { status: 409 },
            )
        }

        if (body.challengeType === 'HTTP01') {
            const certId = await initiateHttp01Certificate(
                body.domainId,
                domain.domain,
            )

            return NextResponse.json({ certId }, { status: 201 })
        } else {
            const result = await initiateDns01Certificate(
                body.domainId,
                domain.domain,
            )

            return NextResponse.json(result, { status: 201 })
        }
    } catch (error) {
        console.error('[acme/issue] Error:', error)

        const message = error instanceof Error ? error.message : 'Unknown error'

        return NextResponse.json(
            { error: message },
            { status: 500 },
        )
    }
}
