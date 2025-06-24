import {NextRequest, NextResponse} from 'next/server'
import {createCustomDomain} from '@/lib/custom-domains/service'
import {getAppDomain} from '@/lib/custom-domains/utils'
import {DOMAIN_CONSTANTS} from '@/lib/custom-domains/constants'
import type {AddDomainRequest, AddDomainResponse} from '@/lib/types/custom-domains'

export async function POST(request: NextRequest): Promise<NextResponse<AddDomainResponse>> {
    try {
        const body: AddDomainRequest = await request.json()
        const {domain, projectId, userId} = body

        if (!domain || !projectId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Domain and projectId are required'
                },
                {status: 400}
            )
        }

        const domainConfig = await createCustomDomain(domain, projectId, userId)

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

        return NextResponse.json({
            success: true,
            domain: {
                id: domainConfig.id,
                domain: domainConfig.domain,
                projectId: domainConfig.projectId,
                verificationToken: domainConfig.verificationToken,
                dnsInstructions: {
                    cname: {
                        name: domainConfig.domain,
                        value: appDomain,
                        description: `Create a CNAME record pointing ${domainConfig.domain} to ${appDomain}`
                    },
                    txt: {
                        name: `${DOMAIN_CONSTANTS.VERIFICATION_SUBDOMAIN}.${domainConfig.domain}`,
                        value: domainConfig.verificationToken,
                        description: 'Create this TXT record to verify domain ownership'
                    }
                }
            }
        })

    } catch (error) {
        console.error('Error adding custom domain:', error)

        const errorMessage = error instanceof Error ? error.message : 'Internal server error'
        const statusCode = errorMessage.includes('already') ? 409 :
            errorMessage.includes('Invalid') ? 400 :
                errorMessage.includes('not found') ? 404 :
                    errorMessage.includes('exceeded') ? 429 : 500

        return NextResponse.json(
            {success: false, error: errorMessage},
            {status: statusCode}
        )
    }
}