import {NextResponse} from 'next/server'
import {db} from '@/lib/db'
import {validateAuthAndGetUser} from '@/lib/utils/changelog'

interface ProjectPreview {
    id: string
    name: string
    lastUpdated: string
    changelogCount: number
}

interface DashboardActivity {
    id: string
    type: string
    message: string
    timestamp: string
    projectId: string
    projectName: string
    updatedAt: string
}

interface DashboardStats {
    projectPreviews: ProjectPreview[]
    totalProjects: number
    totalChangelogs: number
    recentActivity: DashboardActivity[]
    adminStats?: {
        pendingApprovals: number
    }
}

/**
 * @method GET
 * @description Retrieves dashboard statistics for the authenticated user, including recent projects, total project and changelog counts, and recent activity
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "projectPreviews": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" },
 *           "lastUpdated": { "type": "string", "format": "date-time" },
 *           "changelogCount": { "type": "number" }
 *         }
 *       }
 *     },
 *     "totalProjects": { "type": "number" },
 *     "totalChangelogs": { "type": "number" },
 *     "recentActivity": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "type": { "type": "string", "enum": ["CHANGELOG_ENTRY"] },
 *           "message": { "type": "string" },
 *           "timestamp": { "type": "string", "format": "date-time" },
 *           "projectId": { "type": "string" },
 *           "projectName": { "type": "string" },
 *           "updatedAt": { "type": "string", "format": "date-time" }
 *         }
 *       }
 *     },
 *     "adminStats": {
 *       "type": "object",
 *       "properties": {
 *         "pendingApprovals": { "type": "number" }
 *       },
 *       "additionalProperties": false
 *     }
 *   }
 * }
 * @error 401 Unauthorized - User not authenticated
 * @error 500 An unexpected error occurred while fetching dashboard statistics
 */
export async function GET(): Promise<NextResponse<DashboardStats | { error: string }>> {
    try {
        const user = await validateAuthAndGetUser()
        if (!user) {
            return NextResponse.json(
                {error: 'Unauthorized'},
                {status: 401}
            )
        }

        // Access control filter for non-admin users
        const accessFilter = user.role !== 'ADMIN' ? {
            OR: [
                {isPublic: true},
                // Add additional access control conditions here when implemented
            ]
        } : {}

        // Get recent projects with their latest changelog entry
        const recentProjects = await db.project.findMany({
            where: accessFilter,
            include: {
                changelog: {
                    include: {
                        entries: {
                            orderBy: {
                                updatedAt: 'desc'
                            },
                            take: 1
                        },
                        _count: {
                            select: {entries: true}
                        }
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            },
            take: 6 // Get more than 3 to show variety, let our frontend decide how many to display
        })

        // Format projects for preview - no placeholder data
        const projectPreviews: ProjectPreview[] = recentProjects.map(project => ({
            id: project.id,
            name: project.name,
            lastUpdated: project.changelog?.entries[0]?.updatedAt.toISOString() || project.updatedAt.toISOString(),
            changelogCount: project.changelog?._count.entries || 0
        }))

        // Get total counts
        const [totalProjects, totalChangelogs] = await Promise.all([
            db.project.count({
                where: accessFilter
            }),
            db.changelogEntry.count({
                where: {
                    changelog: {
                        project: accessFilter
                    }
                }
            })
        ])

        // Get recent activity
        const recentActivity = await db.changelogEntry.findMany({
            where: {
                changelog: {
                    project: accessFilter
                }
            },
            select: {
                id: true,
                title: true,
                version: true,
                createdAt: true,
                updatedAt: true,
                changelog: {
                    select: {
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10
        })

        // Format activity
        const formattedActivity = recentActivity.map(entry => ({
            id: entry.id,
            type: 'CHANGELOG_ENTRY',
            message: `New changelog entry: ${entry.title}${entry.version ? ` (${entry.version})` : ''}`,
            timestamp: entry.createdAt.toISOString(),
            projectId: entry.changelog.project.id,
            projectName: entry.changelog.project.name,
            updatedAt: entry.updatedAt.toISOString()
        }))

        // Get admin-specific stats if applicable
        let adminStats: { pendingApprovals: number } | undefined
        if (user.role === 'ADMIN') {
            const pendingApprovals = await db.changelogRequest.count({
                where: {
                    status: 'PENDING'
                }
            })

            adminStats = {pendingApprovals}
        }

        const response: DashboardStats = {
            projectPreviews,
            totalProjects,
            totalChangelogs,
            recentActivity: formattedActivity,
            ...(adminStats && {adminStats})
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Dashboard stats error:', error)
        return NextResponse.json(
            {error: 'Failed to fetch dashboard statistics'},
            {status: 500}
        )
    }
}