import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { db } from '@/lib/db'

/**
 * @method GET
 * @description Fetches the changelog entries for a given project
 * @query {
 *   projectId: String, required
 *   search?: String, optional
 *   tag?: String, optional
 *   startDate?: String, optional
 *   endDate?: String, optional
 *   page?: Number, optional
 *   limit?: Number, optional
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "entries": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "title": { "type": "string" },
 *           "content": { "type": "string" },
 *           "version": { "type": "number" },
 *           "createdAt": { "type": "string", "format": "date-time" },
 *           "tags": {
 *             "type": "array",
 *             "items": {
 *               "type": "object",
 *               "properties": {
 *                 "id": { "type": "string" },
 *                 "name": { "type": "string" }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     },
 *     "pagination": {
 *       "page": { "type": "number" },
 *       "limit": { "type": "number" },
 *       "total": { "type": "number" },
 *       "totalPages": { "type": "number" }
 *     }
 *   }
 * }
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 404 Project not found
 * @error 500 An unexpected error occurred while fetching the changelog entries
 */
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

/**
 * @method POST
 * @description Creates a new changelog entry for a given project
 * @query {
 *   projectId: String, required
 * }
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "tags": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" }
 *         }
 *       }
 *     }
 *   },
 *   "required": [
 *     "title",
 *     "content",
 *     "version",
 *     "tags"
 *   ]
 * }
 * @response 201 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "tags": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 404 Project not found
 * @error 500 An unexpected error occurred while creating the changelog entry
 */
export async function POST(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    try {
        await validateAuthAndGetUser()
        const { title, content, version, tags } = await request.json()

        // Get the changelog for this project
        const changelog = await db.changelog.findUnique({
            where: { projectId: await params.projectId }
        })

        if (!changelog) {
            return NextResponse.json(
                { error: 'Changelog not found' },
                { status: 404 }
            )
        }

        // Create the entry with its tags
        const entry = await db.changelogEntry.create({
            data: {
                title,
                content,
                version,
                changelogId: changelog.id,
                tags: {
                    connectOrCreate: tags.map((tag: { id?: string; name: string }) => ({
                        where: {
                            // If we have an ID, use it; otherwise use the name
                            id: tag.id || undefined,
                            name: !tag.id ? tag.name : undefined
                        },
                        create: {
                            name: tag.name
                        }
                    }))
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