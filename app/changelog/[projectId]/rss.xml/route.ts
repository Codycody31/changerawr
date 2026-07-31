import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateRSSFeed, parseRssFeedConfig } from '@/lib/services/changelog/rss'

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
                enableRss: true,
                rssItemLimit: true,
                rssFullContent: true,
                rssFeedConfig: true,
                maintenanceMode: true,
                changelog: {
                    select: {
                        id: true
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

        if (project.maintenanceMode) {
            return NextResponse.json(
                { error: 'Changelog is under maintenance' },
                { status: 404 }
            )
        }

        if (!project.enableRss) {
            return NextResponse.json(
                { error: 'RSS feed is disabled for this project' },
                { status: 404 }
            )
        }

        const feedConfig = parseRssFeedConfig(project.rssFeedConfig)

        const entries = await db.changelogEntry.findMany({
            where: {
                changelogId: project.changelog.id,
                publishedAt: { not: null },
                ...(feedConfig.tagFilter.length > 0
                    ? { tags: { some: { id: { in: feedConfig.tagFilter } } } }
                    : {})
            },
            orderBy: [
                { publishedAt: 'desc' },
                { id: 'desc' }
            ],
            take: project.rssItemLimit,
            include: {
                tags: { select: { name: true } }
            }
        })

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        const feedUrl = `${baseUrl}/changelog/${project.id}`

        const rss = generateRSSFeed(entries, {
            title: `${project.name} Changelog`,
            description: `Latest changes and updates for ${project.name}`,
            link: feedUrl,
            useExcerpt: !project.rssFullContent,
            feedConfig
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