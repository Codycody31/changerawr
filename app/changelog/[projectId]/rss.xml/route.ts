import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateRSSFeed } from '@/lib/services/changelog/rss'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params

        // Get project and changelog
        const project = await db.project.findUnique({
            where: {
                id: projectId,
                isPublic: true
            },
            select: {
                id: true,
                name: true,
                changelog: {
                    select: {
                        id: true,
                        entries: {
                            where: {
                                publishedAt: { not: null }
                            },
                            orderBy: [
                                { publishedAt: 'desc' },
                                { id: 'desc' }
                            ],
                            take: 10 // Changed from 50 to 10 entries
                        }
                    }
                }
            }
        })

        if (!project?.changelog) {
            return NextResponse.json(
                { error: 'Changelog not found or not public' },
                { status: 404 }
            )
        }

        const baseUrl = new URL(request.url).origin
        const feedUrl = `${baseUrl}/changelog/${project.id}`

        const rss = generateRSSFeed(project.changelog.entries, {
            title: `${project.name} Changelog`,
            description: `Latest changes and updates for ${project.name}`,
            link: feedUrl
        })

        // Return RSS XML with proper content type
        return new NextResponse(rss, {
            headers: {
                'Content-Type': 'application/xml;charset=utf-8',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            }
        })
    } catch (error) {
        console.error('Error generating RSS feed:', error)
        return NextResponse.json(
            { error: 'Failed to generate RSS feed' },
            { status: 500 }
        )
    }
}