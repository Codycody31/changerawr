import { db } from '@/lib/db'
import {
    changelogEntrySchema,
    sendError,
    sendSuccess,
    type ChangelogEntryInput, validateAuthAndGetUser
} from '@/lib/utils/changelog'
import {z} from "zod";

export async function GET(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    try {
        await validateAuthAndGetUser()

        const changelog = await db.changelog.findUnique({
            where: { projectId: params.projectId },
            include: {
                entries: {
                    include: {
                        tags: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        })

        if (!changelog) {
            return sendError('Changelog not found', 404)
        }

        return sendSuccess(changelog)
    } catch (error) {
        console.error('Error fetching changelog:', error)
        return sendError('Failed to fetch changelog', 500)
    }
}

export async function POST(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    try {
        const user = await validateAuthAndGetUser()

        if (user.role === 'VIEWER') {
            return sendError('Unauthorized', 403)
        }

        const json = await request.json()
        const body: ChangelogEntryInput = changelogEntrySchema.parse(json)

        // Find or create changelog for the project
        const changelog = await db.changelog.upsert({
            where: { projectId: params.projectId },
            create: { projectId: params.projectId },
            update: {}
        })

        // Create changelog entry
        const entry = await db.changelogEntry.create({
            data: {
                title: body.title,
                content: body.content,
                version: body.version,
                changelogId: changelog.id,
                tags: body.tags ? {
                    connectOrCreate: body.tags.map(tag => ({
                        where: { name: tag },
                        create: { name: tag }
                    }))
                } : undefined
            },
            include: {
                tags: true
            }
        })

        return sendSuccess(entry, 201)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return sendError('Invalid request data: ' + error.message, 400)
        }
        console.error('Error creating changelog entry:', error)
        return sendError('Failed to create changelog entry', 500)
    }
}