import {NextRequest, NextResponse} from 'next/server'
import {deleteDomain, getDomainByDomain, canUserManageDomain} from '@/lib/custom-domains/service'
import type {DeleteDomainResponse} from '@/lib/types/custom-domains'

interface RouteParams {
    params: Promise<{
        domain: string
    }>
}

export async function DELETE(
    request: NextRequest,
    {params}: RouteParams
): Promise<NextResponse<DeleteDomainResponse>> {
    try {
        const {domain: encodedDomain} = await params
        const domain = decodeURIComponent(encodedDomain)
        const {searchParams} = new URL(request.url)
        const userId = searchParams.get('userId')
        const isAdmin = searchParams.get('admin') === 'true'

        if (!domain) {
            return NextResponse.json(
                {success: false, error: 'Domain is required'},
                {status: 400}
            )
        }

        // Check if domain exists
        const domainConfig = await getDomainByDomain(domain)
        if (!domainConfig) {
            return NextResponse.json(
                {success: false, error: 'Domain not found'},
                {status: 404}
            )
        }

        // Check permissions
        if (userId && !isAdmin) {
            const canManage = await canUserManageDomain(domain, userId, isAdmin)
            if (!canManage) {
                return NextResponse.json(
                    {success: false, error: 'Unauthorized to delete this domain'},
                    {status: 403}
                )
            }
        }

        await deleteDomain(domain)

        return NextResponse.json({success: true})

    } catch (error) {
        console.error('Error deleting custom domain:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            },
            {status: 500}
        )
    }
}