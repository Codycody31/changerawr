import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { db } from '@/lib/db'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { projectId } = await params
        await validateAuthAndGetUser()
        const { searchParams } = new URL(request.url)

        // Get query parameters
        const search = searchParams.get('search')
        const tag = searchParams.get('tag')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const skip = (page - 1) * limit

        // First get the changelog for this project
        const changelog = await db.changelog.findUnique({
            where: { projectId }
        })

        if (!changelog) {
            return NextResponse.json(
                { error: 'Changelog not found' },
                { status: 404 }
            )
        }

        // Build where clause for filtering
        const where = {
            changelogId: changelog.id,
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' as const } },
                    { content: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
            ...(tag && {
                tags: {
                    some: {
                        name: tag
                    }
                }
            }),
            ...(startDate && endDate && {
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            })
        }

        // Get entries with pagination
        const [entries, total] = await Promise.all([
            db.changelogEntry.findMany({
                where,
                include: {
                    tags: true
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit
            }),
            db.changelogEntry.count({ where })
        ])

        // Get all tags used in this project's changelog
        const tags = await db.changelogTag.findMany({
            where: {
                entries: {
                    some: {
                        changelogId: changelog.id
                    }
                }
            }
        })

        return NextResponse.json({
            entries,
            tags,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Error fetching changelog:', error)
        return NextResponse.json(
            { error: 'Failed to fetch changelog' },
            { status: 500 }
        )
    }
}

export async function POST(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    try {
        const user = await validateAuthAndGetUser()
        const { title, content, version, tags } = await request.json()

        // Get the changelog for this project
        const changelog = await db.changelog.findUnique({
            where: { projectId: params.projectId }
        })

        if (!changelog) {
            return NextResponse.json(
                { error: 'Changelog not found' },
                { status: 404 }
            )
        }

        const entry = await db.changelogEntry.create({
            data: {
                title,
                content,
                version,
                changelogId: changelog.id,
                tags: {
                    connect: tags.map((tagId: string) => ({ id: tagId }))
                }
            },
            include: {
                tags: true
            }
        })

        return NextResponse.json(entry)
    } catch (error) {
        console.error('Error creating changelog entry:', error)
        return NextResponse.json(
            { error: 'Failed to create changelog entry' },
            { status: 500 }
        )
    }
}