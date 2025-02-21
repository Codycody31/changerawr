import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ITEMS_PER_PAGE = 10

export async function GET(
    request: Request,
    context: { params: { projectId: string } }
) {
    return await (async () => {
        try {
            const { params } = context
            const { projectId } = await (async () => params)();
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
            const where: {
                changelogId: string;
                publishedAt: { not: null };
                OR?: Array<{
                    publishedAt: { lt: Date } | { equals: Date };
                    id?: { lt: string };
                }>;
            } = {
                changelogId: project.changelog.id,
                publishedAt: { not: null }
            };

            if (cursor) {
                const cursorEntry = await db.changelogEntry.findUnique({
                    where: { id: cursor },
                    select: { publishedAt: true }
                });

                if (cursorEntry?.publishedAt) {
                    where.OR = [
                        { publishedAt: { lt: cursorEntry.publishedAt } },
                        {
                            publishedAt: { equals: cursorEntry.publishedAt },
                            id: { lt: cursor }
                        }
                    ];
                }
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
    })()
}
