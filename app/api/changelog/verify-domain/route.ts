import {NextRequest, NextResponse} from 'next/server'
import {getDomainByDomain} from '@/lib/custom-domains/service'

export async function GET(request: NextRequest) {
    try {
        const {searchParams} = new URL(request.url)
        const domain = searchParams.get('domain')
        const token = searchParams.get('token')

        if (!domain || !token) {
            return NextResponse.json(
                {error: 'Domain and token are required'},
                {status: 400}
            )
        }

        // Look up the domain configuration
        const domainConfig = await getDomainByDomain(domain)

        if (!domainConfig) {
            return NextResponse.json(
                {error: 'Domain not found'},
                {status: 404}
            )
        }

        // Verify the token matches
        if (domainConfig.verificationToken !== token) {
            return NextResponse.json(
                {error: 'Invalid verification token'},
                {status: 403}
            )
        }

        // Return success response indicating the domain is properly routed
        return NextResponse.json({
            success: true,
            domain: domainConfig.domain,
            projectId: domainConfig.projectId,
            verified: true,
            message: 'Domain verification successful via HTTP check'
        })

    } catch (error) {
        console.error('Error in domain verification endpoint:', error)
        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        )
    }
}