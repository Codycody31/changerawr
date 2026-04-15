import {NextRequest, NextResponse} from 'next/server'
import {getDomainByDomain, updateDomainVerification, canUserManageDomain} from '@/lib/custom-domains/service'
import {verifyDNSRecords} from '@/lib/custom-domains/dns'
import {getAppDomain} from '@/lib/custom-domains/utils'
import type {VerifyDomainRequest, VerifyDomainResponse} from '@/lib/types/custom-domains'
import {validateAuthAndGetUser} from '@/lib/utils/changelog'

export async function POST(request: NextRequest): Promise<NextResponse<VerifyDomainResponse>> {
    try {
        let user;
        try {
            user = await validateAuthAndGetUser();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            )
        }

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

        const isAdmin = user.role === 'ADMIN'
        const canManage = await canUserManageDomain(domain, user.id, isAdmin)
        if (!canManage) {
            return NextResponse.json(
                {success: false, error: 'Unauthorized to manage this domain'},
                {status: 403}
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