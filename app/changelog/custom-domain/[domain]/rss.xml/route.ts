import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateRSSFeed } from '@/lib/services/changelog/rss'
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
                            take: 10
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

        // Use the custom domain as the base URL
        const feedUrl = `https://${domain}`

        const rss = generateRSSFeed(project.changelog.entries, {
            title: `${project.name} Changelog`,
            description: `Latest changes and updates for ${project.name}`,
            link: feedUrl
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