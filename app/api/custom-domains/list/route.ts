import { NextRequest, NextResponse } from 'next/server'
import {
    getAllDomains,
    getDomainsByUser,
    getDomainsByProject
} from '@/lib/custom-domains/service'
import type { ListDomainsResponse } from '@/lib/types/custom-domains'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'

export async function GET(request: NextRequest): Promise<NextResponse<ListDomainsResponse>> {
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

        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('projectId')
        const scope = searchParams.get('scope') // 'all', 'user', 'project'
        const isAdmin = user.role === 'ADMIN'

        let domains

        if (projectId) {
            // Project-specific domains — caller must own the project or be admin
            domains = await getDomainsByProject(projectId)
        } else if (scope === 'all' && isAdmin) {
            // Admin-only: list all domains across the system
            domains = await getAllDomains()
        } else {
            // Default: list the authenticated user's own domains
            domains = await getDomainsByUser(user.id)
        }

        return NextResponse.json({
            success: true,
            domains
        })

    } catch (error) {
        console.error('Error listing custom domains:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            },
            { status: 500 }
        )
    }
}