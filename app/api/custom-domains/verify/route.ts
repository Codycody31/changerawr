import {NextRequest, NextResponse} from 'next/server'
import {getDomainByDomain, updateDomainVerification} from '@/lib/custom-domains/service'
import {verifyDNSRecords} from '@/lib/custom-domains/dns'
import {getAppDomain} from '@/lib/custom-domains/utils'
import type {VerifyDomainRequest, VerifyDomainResponse} from '@/lib/types/custom-domains'

export async function POST(request: NextRequest): Promise<NextResponse<VerifyDomainResponse>> {
    try {
        const body: VerifyDomainRequest = await request.json()
        const {domain} = body

        if (!domain) {
            return NextResponse.json(
                {success: false, error: 'Domain is required'},
                {status: 400}
            )
        }

        const domainConfig = await getDomainByDomain(domain)
        if (!domainConfig) {
            return NextResponse.json(
                {success: false, error: 'Domain configuration not found'},
                {status: 404}
            )
        }

        let appDomain: string
        try {
            appDomain = getAppDomain()
        } catch (error) {
            console.error('Failed to get app domain:', error)
            return NextResponse.json(
                {success: false, error: 'App domain configuration error'},
                {status: 500}
            )
        }

        const verification = await verifyDNSRecords(
            domain,
            appDomain,
            domainConfig.verificationToken
        )

        const verified = verification.cnameValid && verification.txtValid

        // Update the verification status in our database to see if it has changed
        if (verified && !domainConfig.verified) {
            await updateDomainVerification(domain, true)
        } else if (!verified && domainConfig.verified) {
            await updateDomainVerification(domain, false)
        }

        return NextResponse.json({
            success: true,
            verification: {
                ...verification,
                verified
            }
        })

    } catch (error) {
        console.error('Error verifying custom domain:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            },
            {status: 500}
        )
    }
}