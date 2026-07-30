import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { createAuditLog } from '@/lib/utils/auditLog'
import { db } from '@/lib/db'

/**
 * @method DELETE
 * @description Permanently deletes every saved version history revision for every entry in a project's changelog. Entries themselves are kept.
 * @query {
 *   projectId: String, required
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "revisionsDeleted": { "type": "number" }
 *   }
 * }
 * @error 403 Forbidden - Only administrators can delete all history
 * @error 404 Changelog not found
 * @error 500 An unexpected error occurred while deleting revision history
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser()

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Only administrators can delete all history' },
                { status: 403 }
            )
        }

        const { projectId } = await params

        const changelog = await db.changelog.findUnique({
            where: { projectId }
        })

        if (!changelog) {
            return NextResponse.json(
                { error: 'Changelog not found' },
                { status: 404 }
            )
        }

        const { count } = await db.changelogEntryRevision.deleteMany({
            where: { entry: { changelogId: changelog.id } }
        })

        try {
            await createAuditLog(
                'DELETE_ALL_CHANGELOG_HISTORY',
                user.id,
                user.id,
                {
                    projectId,
                    changelogId: changelog.id,
                    revisionsDeleted: count,
                    timestamp: new Date().toISOString()
                }
            )
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError)
        }

        return NextResponse.json({ success: true, revisionsDeleted: count })
    } catch (error) {
        console.error('Error deleting changelog history:', error)
        return NextResponse.json(
            { error: 'Failed to delete changelog history' },
            { status: 500 }
        )
    }
}
