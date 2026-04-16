import {NextRequest, NextResponse} from 'next/server'
import {deleteDomain, getDomainByDomain, canUserManageDomain} from '@/lib/custom-domains/service'
import type {DeleteDomainResponse} from '@/lib/types/custom-domains'
import {validateAuthAndGetUser} from '@/lib/utils/changelog'

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
        let user;
        try {
            user = await validateAuthAndGetUser();
        } catch {
            return NextResponse.json(
                {success: false, error: 'Authentication required'},
                {status: 401}
            )
        }

        const {domain: encodedDomain} = await params
        const domain = decodeURIComponent(encodedDomain)

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

        // Verify ownership via the authenticated user's role — never trust client-supplied flags
        const isAdmin = user.role === 'ADMIN'
        const canManage = await canUserManageDomain(domain, user.id, isAdmin)
        if (!canManage) {
            return NextResponse.json(
                {success: false, error: 'Unauthorized to delete this domain'},
                {status: 403}
            )
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