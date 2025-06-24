import { NextRequest, NextResponse } from 'next/server'
import {
    getAllDomains,
    getDomainsByUser,
    getDomainsByProject
} from '@/lib/custom-domains/service'
import type { ListDomainsResponse } from '@/lib/types/custom-domains'

export async function GET(request: NextRequest): Promise<NextResponse<ListDomainsResponse>> {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')
        const projectId = searchParams.get('projectId')
        const scope = searchParams.get('scope') // 'all', 'user', 'project'

        let domains

        if (scope === 'all' || (!userId && !projectId)) {
            // Admin view - all domains
            domains = await getAllDomains()
        } else if (projectId) {
            // Project-specific domains
            domains = await getDomainsByProject(projectId)
        } else if (userId) {
            // User-specific domains
            domains = await getDomainsByUser(userId)
        } else {
            return NextResponse.json(
                { success: false, error: 'Invalid query parameters' },
                { status: 400 }
            )
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