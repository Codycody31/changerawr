import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { db } from '@/lib/db'
import {Role} from "@/lib/types/auth";

export async function GET(
    request: Request,
    context: { params: { projectId: string; entryId: string } }
) {
    try {
        await validateAuthAndGetUser();

        // Unwrap the params using IIFE
        const { entryId } = await (async () => context.params)();

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
        await validateAuthAndGetUser();
        const { title, content, version, tags } = await request.json();

        // Unwrap the params using IIFE
        const { entryId } = await (async () => context.params)();

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

export async function PATCH(
    request: Request,
    context: { params: { projectId: string; entryId: string } }
) {
    try {
        const user = await validateAuthAndGetUser();
        const { action } = await request.json();
        const { projectId, entryId } = await (async () => context.params)();

        // Verify user has permission
        if (user.role === Role.VIEWER) {
            return NextResponse.json(
                { error: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        // First, verify the entry exists and belongs to the project
        const existingEntry = await db.changelogEntry.findFirst({
            where: {
                id: entryId,
                changelog: {
                    projectId: projectId
                }
            }
        });

        if (!existingEntry) {
            return NextResponse.json(
                { error: 'Entry not found or does not belong to this project' },
                { status: 404 }
            );
        }

        // Handle publish/unpublish actions
        if (action === 'publish' || action === 'unpublish') {
            const project = await db.project.findUnique({
                where: { id: projectId },
                select: { requireApproval: true, allowAutoPublish: true }
            });

            if (!project) {
                return NextResponse.json(
                    { error: 'Project not found' },
                    { status: 404 }
                );
            }

            // For publishing, check project settings
            if (action === 'publish' && project.requireApproval &&
                user.role !== Role.ADMIN && !project.allowAutoPublish) {
                return NextResponse.json(
                    { error: 'Entry requires admin approval before publishing' },
                    { status: 403 }
                );
            }

            const entry = await db.changelogEntry.update({
                where: { id: entryId },
                data: {
                    publishedAt: action === 'publish' ? new Date() : null
                },
                include: { tags: true }
            });

            return NextResponse.json(entry);
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error updating changelog entry status:', error);
        return NextResponse.json(
            { error: 'Failed to update changelog entry status' },
            { status: 500 }
        );
    }
}

// New method for deletion requests
export async function DELETE(
    request: Request,
    context: { params: { projectId: string; entryId: string } }
) {
    try {
        const user = await validateAuthAndGetUser();
        const { projectId, entryId } = await (async () => context.params)();

        // Admin can delete directly
        if (user.role === Role.ADMIN) {
            const entry = await db.changelogEntry.delete({
                where: { id: entryId }
            });
            return NextResponse.json(entry);
        }

        // Staff must create a deletion request
        if (user.role === Role.STAFF) {
            // Check if there's already a pending request
            const existingRequest = await db.changelogRequest.findFirst({
                where: {
                    changelogEntryId: entryId,
                    status: 'PENDING'
                }
            });

            if (existingRequest) {
                return NextResponse.json(
                    { error: 'A deletion request for this entry is already pending' },
                    { status: 400 }
                );
            }

            // Create deletion request
            const request = await db.changelogRequest.create({
                data: {
                    type: 'DELETE_ENTRY',
                    staffId: user.id,
                    projectId,
                    changelogEntryId: entryId,
                    status: 'PENDING'
                }
            });

            return NextResponse.json({
                message: 'Deletion request created, awaiting admin approval',
                request
            }, { status: 202 });
        }

        return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
        );
    } catch (error) {
        console.error('Error handling changelog entry deletion:', error);
        return NextResponse.json(
            { error: 'Failed to process deletion request' },
            { status: 500 }
        );
    }
}

