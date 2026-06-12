import {NextResponse} from 'next/server'
import {validateAuthAndGetUser, generateExcerpt} from '@/lib/utils/changelog'
import {createAuditLog} from '@/lib/utils/auditLog'
import {db} from '@/lib/db'
import {Role} from '@/lib/types/auth'
import {createRestoreRevision} from '@/lib/services/core/changelog/revisions'

/**
 * Restore a changelog entry to a previous saved version
 * @method POST
 * @description Overwrites the title, content, excerpt, and version of a changelog entry with the snapshot from a saved revision, then records a new "restore" checkpoint. Tags are not affected. Requires user authentication; VIEWER role is not permitted.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry.
 * @param {string} revisionId - The ID of the revision to restore.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "entry": { "type": "object" },
 *     "newRevisionId": { "type": "string" }
 *   }
 * }
 * @error 401 { "type": "object", "properties": { "error": { "type": "string" } } }
 * @error 403 { "type": "object", "properties": { "error": { "type": "string" } } }
 * @error 404 { "type": "object", "properties": { "error": { "type": "string" } } }
 */
export async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string; entryId: string; revisionId: string }> }
) {
    const {projectId, entryId, revisionId} = await context.params;

    try {
        const user = await validateAuthAndGetUser();

        try {
            await createAuditLog(
                'RESTORE_CHANGELOG_ENTRY_REVISION_ATTEMPT',
                user.id,
                user.id,
                {projectId, entryId, revisionId, timestamp: new Date().toISOString()}
            );
        } catch (auditLogError) {
            console.error('Failed to create restore attempt audit log:', auditLogError);
        }

        if (user.role === Role.VIEWER) {
            try {
                await createAuditLog(
                    'CHANGELOG_ENTRY_PERMISSION_DENIED',
                    user.id,
                    user.id,
                    {action: 'RESTORE_CHANGELOG_ENTRY_REVISION', projectId, entryId, revisionId, timestamp: new Date().toISOString()}
                );
            } catch (auditLogError) {
                console.error('Failed to create permission denied audit log:', auditLogError);
            }

            return NextResponse.json({error: 'You do not have permission to restore versions'}, {status: 403});
        }

        const existingEntry = await db.changelogEntry.findUnique({
            where: {id: entryId},
            include: {
                tags: true,
                changelog: {select: {projectId: true}}
            }
        });

        if (!existingEntry) {
            return NextResponse.json({error: 'Entry not found'}, {status: 404});
        }

        if (existingEntry.changelog.projectId !== projectId) {
            return NextResponse.json({error: 'Entry does not belong to this project'}, {status: 400});
        }

        const revision = await db.changelogEntryRevision.findUnique({
            where: {id: revisionId}
        });

        if (!revision || revision.entryId !== entryId) {
            return NextResponse.json({error: 'Revision not found'}, {status: 404});
        }

        const updatedEntry = await db.changelogEntry.update({
            where: {id: entryId},
            data: {
                title: revision.title,
                content: revision.content,
                excerpt: revision.excerpt ?? generateExcerpt(revision.content),
                version: revision.version,
                updatedAt: new Date(),
            },
            include: {tags: true}
        });

        const newRevision = await createRestoreRevision({
            entryId,
            userId: user.id,
            snapshot: {
                title: updatedEntry.title,
                content: updatedEntry.content,
                excerpt: updatedEntry.excerpt,
                version: updatedEntry.version,
            },
            restoredFromId: revision.id,
        });

        try {
            await createAuditLog(
                'RESTORE_CHANGELOG_ENTRY_REVISION_SUCCESS',
                user.id,
                user.id,
                {
                    projectId,
                    entryId,
                    restoredFromRevisionId: revision.id,
                    newRevisionId: newRevision.id,
                    changes: {
                        title: {from: existingEntry.title, to: updatedEntry.title},
                        version: {from: existingEntry.version, to: updatedEntry.version},
                    },
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create restore success audit log:', auditLogError);
        }

        return NextResponse.json({entry: updatedEntry, newRevisionId: newRevision.id});
    } catch (error) {
        console.error('Error restoring changelog entry revision:', error);

        try {
            const user = await validateAuthAndGetUser();
            await createAuditLog(
                'CHANGELOG_ENTRY_ERROR',
                user.id,
                user.id,
                {
                    action: 'RESTORE_CHANGELOG_ENTRY_REVISION',
                    projectId,
                    entryId,
                    revisionId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create error audit log:', auditLogError);
        }

        return NextResponse.json(
            {error: 'Failed to restore changelog entry revision'},
            {status: 500}
        );
    }
}
