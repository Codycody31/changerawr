import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { db } from '@/lib/db'

export async function GET(
    request: Request,
    context: { params: { projectId: string; entryId: string } }
) {
    try {
        const user = await validateAuthAndGetUser();

        // Unwrap the params using IIFE
        const { projectId, entryId } = await (async () => context.params)();

        const entry = await db.changelogEntry.findUnique({
            where: { id: entryId },
            include: {
                tags: true
            }
        });

        if (!entry) {
            return NextResponse.json(
                { error: 'Entry not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(entry);
    } catch (error) {
        console.error('Error fetching changelog entry:', error);
        return NextResponse.json(
            { error: 'Failed to fetch changelog entry' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    context: { params: { projectId: string; entryId: string } }
) {
    try {
        const user = await validateAuthAndGetUser();
        const { title, content, version, tags } = await request.json();

        // Unwrap the params using IIFE
        const { projectId, entryId } = await (async () => context.params)();

        const entry = await db.changelogEntry.update({
            where: { id: entryId },
            data: {
                title,
                content,
                version,
                tags: {
                    set: tags.map((tagId: string) => ({ id: tagId }))
                }
            },
            include: {
                tags: true
            }
        });

        return NextResponse.json(entry);
    } catch (error) {
        console.error('Error updating changelog entry:', error);
        return NextResponse.json(
            { error: 'Failed to update changelog entry' },
            { status: 500 }
        );
    }
}

