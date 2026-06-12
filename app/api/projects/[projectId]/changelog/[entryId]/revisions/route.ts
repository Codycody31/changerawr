import {NextResponse} from 'next/server'
import {validateAuthAndGetUser} from '@/lib/utils/changelog'
import {db} from '@/lib/db'

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * List saved version history revisions for a changelog entry, newest first
 * @method GET
 * @description Returns a paginated, git-log-style list of saved version history checkpoints for a changelog entry. Requires user authentication.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry.
 * @query {string} [cursor] - Revision ID to start after (for pagination).
 * @query {number} [limit] - Number of revisions to return (default 20, max 50).
 * @query {string} [search] - Filter revisions by title, marker label, or version (case-insensitive substring match).
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "revisions": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "title": { "type": "string" },
 *           "version": { "type": "string" },
 *           "reason": { "type": "string" },
 *           "linesAdded": { "type": "number" },
 *           "linesRemoved": { "type": "number" },
 *           "createdAt": { "type": "string", "format": "date-time" },
 *           "restoredFromId": { "type": "string" },
 *           "label": { "type": "string" },
 *           "icon": { "type": "string" },
 *           "color": { "type": "string" },
 *           "pinned": { "type": "boolean" },
 *           "restoredFrom": { "type": "object" },
 *           "createdBy": { "type": "object" }
 *         }
 *       }
 *     },
 *     "nextCursor": { "type": "string" }
 *   }
 * }
 * @error 401 { "type": "object", "properties": { "error": { "type": "string" } } }
 * @error 404 { "type": "object", "properties": { "error": { "type": "string" } } }
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string; entryId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const {projectId, entryId} = await context.params;

        const entry = await db.changelogEntry.findUnique({
            where: {id: entryId},
            select: {
                id: true,
                changelog: {select: {projectId: true}}
            }
        });

        if (!entry) {
            return NextResponse.json({error: 'Entry not found'}, {status: 404});
        }

        if (entry.changelog.projectId !== projectId) {
            return NextResponse.json({error: 'Entry does not belong to this project'}, {status: 400});
        }

        const {searchParams} = new URL(request.url);
        const cursor = searchParams.get('cursor');
        const search = searchParams.get('search')?.trim();
        const requestedLimit = parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10);
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
            ? Math.min(requestedLimit, MAX_LIMIT)
            : DEFAULT_LIMIT;

        const revisions = await db.changelogEntryRevision.findMany({
            where: {
                entryId,
                ...(search ? {
                    OR: [
                        {title: {contains: search, mode: 'insensitive'}},
                        {label: {contains: search, mode: 'insensitive'}},
                        {version: {contains: search, mode: 'insensitive'}},
                    ]
                } : {})
            },
            orderBy: [{pinned: 'desc'}, {createdAt: 'desc'}],
            take: limit + 1,
            ...(cursor ? {cursor: {id: cursor}, skip: 1} : {}),
            select: {
                id: true,
                title: true,
                version: true,
                reason: true,
                linesAdded: true,
                linesRemoved: true,
                createdAt: true,
                restoredFromId: true,
                label: true,
                icon: true,
                color: true,
                pinned: true,
                createdBy: {
                    select: {id: true, name: true, email: true}
                }
            }
        });

        const hasMore = revisions.length > limit;
        const items = hasMore ? revisions.slice(0, limit) : revisions;
        const nextCursor = hasMore ? items[items.length - 1].id : null;

        const restoredFromIds = [...new Set(
            items.map((item) => item.restoredFromId).filter((id): id is string => !!id)
        )];

        const restoredFromRevisions = restoredFromIds.length > 0
            ? await db.changelogEntryRevision.findMany({
                where: {id: {in: restoredFromIds}},
                select: {id: true, title: true, reason: true, label: true, icon: true, color: true, createdAt: true}
            })
            : [];

        const restoredFromById = new Map(restoredFromRevisions.map((revision) => [revision.id, revision]));

        const itemsWithRestoredFrom = items.map((item) => ({
            ...item,
            restoredFrom: item.restoredFromId ? restoredFromById.get(item.restoredFromId) ?? null : null,
        }));

        return NextResponse.json({revisions: itemsWithRestoredFrom, nextCursor});
    } catch (error) {
        console.error('Error listing changelog entry revisions:', error);
        return NextResponse.json(
            {error: 'Failed to list changelog entry revisions'},
            {status: 500}
        );
    }
}
