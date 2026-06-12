import {NextResponse} from 'next/server'
import {validateAuthAndGetUser} from '@/lib/utils/changelog'
import {db} from '@/lib/db'
import {diffLines} from 'diff'

interface AttributedLine {
    text: string;
    revisionId: string;
}

function splitHunkLines(value: string): string[] {
    const lines = value.split('\n');

    if (lines[lines.length - 1] === '') {
        lines.pop();
    }

    return lines;
}

/**
 * Get line-by-line authorship ("blame") for a saved version history revision
 * @method GET
 * @description Computes which revision (and author) last touched each line of the given revision's content, by replaying the revision chain from the earliest available snapshot. Requires user authentication.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry.
 * @param {string} revisionId - The ID of the revision to compute blame for.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "lines": { "type": "array" },
 *     "revisions": { "type": "object" }
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

        const target = await db.changelogEntryRevision.findUnique({
            where: {id: revisionId},
            select: {id: true, entryId: true, createdAt: true}
        });

        if (!target || target.entryId !== entryId) {
            return NextResponse.json({error: 'Revision not found'}, {status: 404});
        }

        const revisions = await db.changelogEntryRevision.findMany({
            where: {entryId, createdAt: {lte: target.createdAt}},
            orderBy: {createdAt: 'asc'},
            select: {
                id: true,
                content: true,
                createdAt: true,
                reason: true,
                version: true,
                linesAdded: true,
                linesRemoved: true,
                createdBy: {select: {id: true, name: true, email: true}}
            }
        });

        let attributedLines: AttributedLine[] = [];

        for (let i = 0; i < revisions.length; i++) {
            const revision = revisions[i];

            if (i === 0) {
                attributedLines = splitHunkLines(revision.content).map((text) => ({
                    text,
                    revisionId: revision.id,
                }));
                continue;
            }

            const previous = revisions[i - 1];
            const diff = diffLines(previous.content, revision.content);
            const newLines: AttributedLine[] = [];
            let oldIndex = 0;

            for (const hunk of diff) {
                const lines = splitHunkLines(hunk.value);

                if (hunk.removed) {
                    oldIndex += lines.length;
                } else if (hunk.added) {
                    for (const text of lines) {
                        newLines.push({text, revisionId: revision.id});
                    }
                } else {
                    for (const text of lines) {
                        newLines.push(attributedLines[oldIndex] ?? {text, revisionId: revision.id});
                        oldIndex++;
                    }
                }
            }

            attributedLines = newLines;
        }

        const revisionsById: Record<string, {
            createdAt: Date;
            reason: string;
            version: string | null;
            linesAdded: number;
            linesRemoved: number;
            createdBy: { id: string; name: string | null; email: string } | null;
        }> = {};

        for (const line of attributedLines) {
            if (revisionsById[line.revisionId]) continue;
            const revision = revisions.find((r) => r.id === line.revisionId);
            if (!revision) continue;
            revisionsById[line.revisionId] = {
                createdAt: revision.createdAt,
                reason: revision.reason,
                version: revision.version,
                linesAdded: revision.linesAdded,
                linesRemoved: revision.linesRemoved,
                createdBy: revision.createdBy,
            };
        }

        return NextResponse.json({
            lines: attributedLines,
            revisions: revisionsById,
        });
    } catch (error) {
        console.error('Error computing changelog entry revision blame:', error);
        return NextResponse.json(
            {error: 'Failed to compute revision blame'},
            {status: 500}
        );
    }
}
