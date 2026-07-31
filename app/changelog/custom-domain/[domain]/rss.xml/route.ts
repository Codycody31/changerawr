import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateRSSFeed, parseRssFeedConfig } from '@/lib/services/changelog/rss'
import { getDomainByDomain } from '@/lib/custom-domains/service'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        const { domain: encodedDomain } = await params
        const domain = decodeURIComponent(encodedDomain)

        // Look up the domain configuration
        const domainConfig = await getDomainByDomain(domain)

        if (!domainConfig || !domainConfig.verified) {
            return NextResponse.json(
                { error: 'Domain not found or not verified' },
                { status: 404 }
            )
        }

        const projectId = domainConfig.projectId

        // Get project and changelog entries
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

        // Use the custom domain as the base URL
        const feedUrl = `https://${domain}`

        const rss = generateRSSFeed(entries, {
            title: `${project.name} Changelog`,
            description: `Latest changes and updates for ${project.name}`,
            link: feedUrl,
            useExcerpt: !project.rssFullContent,
            feedConfig
        })

        return new NextResponse(rss, {
            headers: {
                'Content-Type': 'application/xml;charset=utf-8',
                'Cache-Control': 'public, max-age=3600',
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