// app/api/changelog/[projectId]/entries/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ITEMS_PER_PAGE = 10

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params
        const { searchParams } = new URL(request.url)
        const cursor = searchParams.get('cursor')

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

        // Build where clause for pagination
        const where = {
            changelogId: project.changelog.id,
            publishedAt: {
                not: null,
            },
            ...(cursor && {
                OR: [
                    {
                        publishedAt: {
                            lt: await db.changelogEntry
                                .findUnique({
                                    where: { id: cursor },
                                    select: { publishedAt: true }
                                })
                                .then(entry => entry?.publishedAt)
                        }
                    },
                    {
                        publishedAt: {
                            equals: await db.changelogEntry
                                .findUnique({
                                    where: { id: cursor },
                                    select: { publishedAt: true }
                                })
                                .then(entry => entry?.publishedAt)
                        },
                        id: {
                            lt: cursor
                        }
                    }
                ]
            })
        }

        // Get entries with cursor-based pagination
        const entries = await db.changelogEntry.findMany({
            where,
            take: ITEMS_PER_PAGE + 1,
            orderBy: [
                { publishedAt: 'desc' },
                { id: 'desc' }
            ],
            include: {
                tags: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        let nextCursor: string | undefined

        // If we got more items than requested, we have a next page
        if (entries.length > ITEMS_PER_PAGE) {
            const nextItem = entries.pop()
            nextCursor = nextItem?.id
        }

        return NextResponse.json({
            project: {
                id: project.id,
                name: project.name
            },
            items: entries,
            nextCursor
        })
    } catch (error) {
        console.error('Error fetching changelog entries:', error)
        return NextResponse.json(
            { error: 'Failed to fetch changelog entries' },
            { status: 500 }
        )
    }
}