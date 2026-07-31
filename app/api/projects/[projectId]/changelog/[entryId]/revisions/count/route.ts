import {NextResponse} from 'next/server'
import {validateAuthAndGetUser} from '@/lib/utils/changelog'
import {db} from '@/lib/db'

/**
 * Get the total number of saved version history revisions for a changelog entry
 * @method GET
 * @description Returns a cheap count of saved checkpoints for a changelog entry, for badges/UI that need the total without paginating through the full list. Requires user authentication.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "count": { "type": "number" }
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

        const count = await db.changelogEntryRevision.count({where: {entryId}});

        return NextResponse.json({count});
    } catch (error) {
        console.error('Error counting changelog entry revisions:', error);
        return NextResponse.json(
            {error: 'Failed to count changelog entry revisions'},
            {status: 500}
        );
    }
}
