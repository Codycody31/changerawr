import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'

interface ProjectPreview {
    id: string
    name: string
    lastUpdated: string
    changelogCount: number
}

export async function GET() {
    try {
        const user = await validateAuthAndGetUser()
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get recent projects with their latest changelog entry
        const recentProjects = await db.project.findMany({
            where: {
                // If user is not admin, only show projects they have access to
                ...(user.role !== 'ADMIN' && {
                    OR: [
                        { isPublic: true },
                        // Add additional access control conditions here
                    ]
                })
            },
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
                            select: { entries: true }
                        }
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            },
            take: 3
        })

        // Format projects for preview
        const projectPreviews: ProjectPreview[] = recentProjects.map(project => ({
            id: project.id,
            name: project.name,
            lastUpdated: project.changelog?.entries[0]?.updatedAt.toISOString() || project.updatedAt.toISOString(),
            changelogCount: project.changelog?._count.entries || 0
        }))

        // If we don't have 3 projects, add placeholder data
        while (projectPreviews.length < 3) {
            projectPreviews.push({
                id: `placeholder-${projectPreviews.length}`,
                name: 'Sample Project',
                lastUpdated: new Date().toISOString(),
                changelogCount: 0
            })
        }

        // Get total counts
        const [totalProjects, totalChangelogs] = await Promise.all([
            db.project.count({
                where: {
                    ...(user.role !== 'ADMIN' && {
                        OR: [
                            { isPublic: true },
                            // Add additional access control conditions here
                        ]
                    })
                }
            }),
            db.changelogEntry.count({
                where: {
                    changelog: {
                        project: {
                            ...(user.role !== 'ADMIN' && {
                                OR: [
                                    { isPublic: true },
                                    // Add additional access control conditions here
                                ]
                            })
                        }
                    }
                }
            })
        ])

        // Get recent activity
        const recentActivity = await db.changelogEntry.findMany({
            where: {
                changelog: {
                    project: {
                        ...(user.role !== 'ADMIN' && {
                            OR: [
                                { isPublic: true },
                                // Add additional access control conditions here
                            ]
                        })
                    }
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
        let adminStats = {}
        if (user.role === 'ADMIN') {
            const pendingApprovals = await db.changelogRequest.count({
                where: {
                    status: 'PENDING'
                }
            })

            adminStats = {
                pendingApprovals
            }
        }

        return NextResponse.json({
            projectPreviews,
            totalProjects,
            totalChangelogs,
            recentActivity: formattedActivity,
            ...adminStats
        })
    } catch (error) {
        console.error('Dashboard stats error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch dashboard statistics' },
            { status: 500 }
        )
    }
}