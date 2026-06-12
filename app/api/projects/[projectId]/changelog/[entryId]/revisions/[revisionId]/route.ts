import {NextResponse} from 'next/server'
import {validateAuthAndGetUser} from '@/lib/utils/changelog'
import {createAuditLog} from '@/lib/utils/auditLog'
import {db} from '@/lib/db'
import {diffLines} from 'diff'
import {Role} from '@/lib/types/auth'
import {isValidPickerIcon} from '@/lib/constants/lucide-icons'
import {MAX_REVISION_LABEL_LENGTH, isValidRevisionColor} from '@/lib/constants/revision-markers'

/**
 * Get a single version history revision, including a line-by-line diff against the previous revision
 * @method GET
 * @description Returns the full snapshot of a saved version history checkpoint, plus a computed diff against the immediately preceding revision. Requires user authentication.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry.
 * @param {string} revisionId - The ID of the revision to retrieve.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "revision": { "type": "object" },
 *     "previous": { "type": "object" },
 *     "restoredFrom": { "type": "object" },
 *     "diff": { "type": "array" }
 *   }
 * }
 * @error 401 { "type": "object", "properties": { "error": { "type": "string" } } }
 * @error 404 { "type": "object", "properties": { "error": { "type": "string" } } }
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string; entryId: string; revisionId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const {projectId, entryId, revisionId} = await context.params;

        const entry = await db.changelogEntry.findUnique({
            where: {id: entryId},
            select: {id: true, changelog: {select: {projectId: true}}}
        });

        if (!entry) {
            return NextResponse.json({error: 'Entry not found'}, {status: 404});
        }

        if (entry.changelog.projectId !== projectId) {
            return NextResponse.json({error: 'Entry does not belong to this project'}, {status: 400});
        }

        const revision = await db.changelogEntryRevision.findUnique({
            where: {id: revisionId},
            include: {
                createdBy: {select: {id: true, name: true, email: true}}
            }
        });

        if (!revision || revision.entryId !== entryId) {
            return NextResponse.json({error: 'Revision not found'}, {status: 404});
        }

        const previous = await db.changelogEntryRevision.findFirst({
            where: {
                entryId,
                createdAt: {lt: revision.createdAt}
            },
            orderBy: {createdAt: 'desc'},
            select: {id: true, createdAt: true, content: true}
        });

        const diff = diffLines(previous?.content ?? '', revision.content);

        const restoredFrom = revision.restoredFromId
            ? await db.changelogEntryRevision.findUnique({
                where: {id: revision.restoredFromId},
                select: {id: true, title: true, reason: true, label: true, icon: true, color: true, createdAt: true}
            })
            : null;

        return NextResponse.json({
            revision: {
                id: revision.id,
                title: revision.title,
                content: revision.content,
                excerpt: revision.excerpt,
                version: revision.version,
                reason: revision.reason,
                linesAdded: revision.linesAdded,
                linesRemoved: revision.linesRemoved,
                restoredFromId: revision.restoredFromId,
                label: revision.label,
                icon: revision.icon,
                color: revision.color,
                pinned: revision.pinned,
                createdAt: revision.createdAt,
                createdBy: revision.createdBy,
            },
            previous: previous ? {id: previous.id, createdAt: previous.createdAt} : null,
            restoredFrom,
            diff: diff.map((change) => ({
                value: change.value,
                added: !!change.added,
                removed: !!change.removed,
            })),
        });
    } catch (error) {
        console.error('Error fetching changelog entry revision:', error);
        return NextResponse.json(
            {error: 'Failed to fetch changelog entry revision'},
            {status: 500}
        );
    }
}

/**
 * Set or clear a custom marker (label, icon, color) on a saved version history revision
 * @method PATCH
 * @description Updates the user-defined label, lucide icon name, and/or hex color used to highlight a saved revision in the version history timeline. Requires user authentication; VIEWER role is not permitted.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry.
 * @param {string} revisionId - The ID of the revision to update.
 * @body {object} - `{ "label"?: string | null, "icon"?: string | null, "color"?: string | null, "pinned"?: boolean }`
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "label": { "type": "string" },
 *     "icon": { "type": "string" },
 *     "color": { "type": "string" },
 *     "pinned": { "type": "boolean" }
 *   }
 * }
 * @error 400 { "type": "object", "properties": { "error": { "type": "string" } } }
 * @error 401 { "type": "object", "properties": { "error": { "type": "string" } } }
 * @error 403 { "type": "object", "properties": { "error": { "type": "string" } } }
 * @error 404 { "type": "object", "properties": { "error": { "type": "string" } } }
 */
export async function PATCH(
    request: Request,
    context: { params: Promise<{ projectId: string; entryId: string; revisionId: string }> }
) {
    const {projectId, entryId, revisionId} = await context.params;

    try {
        const user = await validateAuthAndGetUser();

        if (user.role === Role.VIEWER) {
            try {
                await createAuditLog(
                    'CHANGELOG_ENTRY_PERMISSION_DENIED',
                    user.id,
                    user.id,
                    {action: 'EDIT_CHANGELOG_ENTRY_REVISION_MARKER', projectId, entryId, revisionId, timestamp: new Date().toISOString()}
                );
            } catch (auditLogError) {
                console.error('Failed to create permission denied audit log:', auditLogError);
            }

            return NextResponse.json({error: 'You do not have permission to edit revision markers'}, {status: 403});
        }

        const entry = await db.changelogEntry.findUnique({
            where: {id: entryId},
            select: {id: true, changelog: {select: {projectId: true}}}
        });

        if (!entry) {
            return NextResponse.json({error: 'Entry not found'}, {status: 404});
        }

        if (entry.changelog.projectId !== projectId) {
            return NextResponse.json({error: 'Entry does not belong to this project'}, {status: 400});
        }

        const revision = await db.changelogEntryRevision.findUnique({
            where: {id: revisionId},
            select: {id: true, entryId: true}
        });

        if (!revision || revision.entryId !== entryId) {
            return NextResponse.json({error: 'Revision not found'}, {status: 404});
        }

        const body = await request.json();

        if (!('label' in body) && !('icon' in body) && !('color' in body) && !('pinned' in body)) {
            return NextResponse.json({error: 'No marker fields provided'}, {status: 400});
        }

        const data: { label?: string | null; icon?: string | null; color?: string | null; pinned?: boolean } = {};

        if ('label' in body) {
            const label = typeof body.label === 'string' ? body.label.trim() : null;

            if (label && label.length > MAX_REVISION_LABEL_LENGTH) {
                return NextResponse.json({error: `Label must be ${MAX_REVISION_LABEL_LENGTH} characters or fewer`}, {status: 400});
            }

            data.label = label || null;
        }

        if ('icon' in body) {
            const icon = typeof body.icon === 'string' ? body.icon : null;

            if (!isValidPickerIcon(icon)) {
                return NextResponse.json({error: 'Invalid icon name'}, {status: 400});
            }

            data.icon = icon;
        }

        if ('color' in body) {
            const color = typeof body.color === 'string' ? body.color : null;

            if (!isValidRevisionColor(color)) {
                return NextResponse.json({error: 'Invalid color, expected a 6-digit hex value'}, {status: 400});
            }

            data.color = color;
        }

        if ('pinned' in body) {
            if (typeof body.pinned !== 'boolean') {
                return NextResponse.json({error: 'pinned must be a boolean'}, {status: 400});
            }

            data.pinned = body.pinned;
        }

        const updated = await db.changelogEntryRevision.update({
            where: {id: revisionId},
            data,
            select: {id: true, label: true, icon: true, color: true, pinned: true},
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating changelog entry revision marker:', error);
        return NextResponse.json(
            {error: 'Failed to update changelog entry revision marker'},
            {status: 500}
        );
    }
}
