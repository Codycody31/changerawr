import { db } from '@/lib/db'
import {
    validateAuthAndGetUser,
    changelogEntrySchema,
    sendError,
    sendSuccess,
    type ChangelogEntryInput
} from '@/lib/utils/changelog'
import { z } from "zod";

// Helper to get project ID from changelog entry
async function getProjectIdFromEntry(entryId: string) {
    const entry = await db.changelogEntry.findUnique({
        where: { id: entryId },
        select: {
            changelog: {
                select: {
                    projectId: true
                }
            }
        }
    });
    return entry?.changelog?.projectId;
}

export async function PUT(
    request: Request,
    { params }: { params: { entryId: string } }
) {
    try {
        const user = await validateAuthAndGetUser()

        if (user.role === 'VIEWER') {
            return sendError('Unauthorized', 403)
        }

        const json = await request.json()
        const body: ChangelogEntryInput = changelogEntrySchema.parse(json)

        const entry = await db.changelogEntry.update({
            where: { id: params.entryId },
            data: {
                title: body.title,
                content: body.content,
                version: body.version,
                tags: body.tags ? {
                    set: [], // Clear existing tags
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

        return sendSuccess(entry)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return sendError('Invalid request data: ' + error.message, 400)
        }
        console.error('Error updating changelog entry:', error)
        return sendError('Failed to update changelog entry', 500)
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { entryId: string } }
) {
    try {
        const user = await validateAuthAndGetUser()

        if (user.role === 'VIEWER') {
            return sendError('Unauthorized', 403)
        }

        // Get the project ID from the changelog entry
        const projectId = await getProjectIdFromEntry(params.entryId)

        if (!projectId) {
            return sendError('Changelog entry not found', 404)
        }

        // If user is staff, create a deletion request
        if (user.role === 'STAFF') {
            const request = await db.changelogRequest.create({
                data: {
                    type: 'DELETE_ENTRY',
                    status: 'PENDING',
                    staffId: user.id,
                    changelogEntryId: params.entryId,
                    projectId: projectId
                }
            })

            return sendSuccess({
                message: 'Deletion request created',
                request
            })
        }

        // If admin, delete directly
        const entry = await db.changelogEntry.delete({
            where: { id: params.entryId }
        })

        return sendSuccess({
            message: 'Changelog entry deleted',
            entry
        })
    } catch (error) {
        console.error('Error handling changelog entry deletion:', error)
        return sendError('Failed to process deletion request', 500)
    }
}