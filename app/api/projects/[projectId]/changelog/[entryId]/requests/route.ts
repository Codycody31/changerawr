import { NextRequest, NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';

/**
 * GET /api/projects/[projectId]/changelog/[entryId]/requests
 * Returns pending changelog requests for a specific entry.
 * Used by ChangelogActionRequest to detect existing pending requests
 * before showing publish/delete actions.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ projectId: string; entryId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const { projectId, entryId } = await params;

        const requests = await db.changelogRequest.findMany({
            where: {
                projectId,
                changelogEntryId: entryId,
            },
            select: {
                id: true,
                type: true,
                status: true,
                createdAt: true,
                staff: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(requests);
    } catch (error) {
        console.error('[entry/requests] GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}
