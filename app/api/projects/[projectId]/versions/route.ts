import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { db } from '@/lib/db'

/**
 * @method GET
 * @description Fetches the versions of a given project
 * @query {
 *   projectId: String, required
 * }
 * @response 200 {
 *   "type": "array",
 *   "items": {
 *     "type": "number"
 *   }
 * }
 * @error 400 Invalid request data
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 500 An unexpected error occurred while fetching the versions
 */
export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
    try {
        await validateAuthAndGetUser();
        const { projectId } = await (async () => context.params)();

        // Fetch all changelog entries with versions, sorted by publishedAt
        const entries = await db.changelogEntry.findMany({
            where: {
                changelog: {
                    projectId
                },
                version: {
                    not: null
                }
            },
            select: {
                version: true,
                publishedAt: true
            },
            orderBy: {
                publishedAt: 'desc'
            }
        });

        // Get unique versions
        const versions = [...new Set(entries.map(entry => entry.version))].filter(Boolean);

        return NextResponse.json({ versions });
    } catch (error) {
        console.error('Error fetching versions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch versions' },
            { status: 500 }
        );
    }
}