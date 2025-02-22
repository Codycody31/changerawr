import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { db } from '@/lib/db'
import {Role} from "@/lib/types/auth";

/**
 * Get a changelog entry by ID
 * @method GET
 * @description Returns the details of a changelog entry by its ID, including its title, content, version, tags, and creation/update timestamps. Requires user authentication and permission to view the project.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry to retrieve.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "tags": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" },
 *           "color": { "type": "string" }
 *         }
 *       }
 *     },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "updatedAt": { "type": "string", "format": "date-time" },
 *     "projectId": { "type": "string" }
 *   }
 * }
 * @error 401 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 403 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 */
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

/**
 * Update a changelog entry by ID
 * @method PUT
 * @description Updates the title, content, version, and tags of a changelog entry by its ID. Requires user authentication and permission to edit the project.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry to update.
 * @requestBody {
 *   "type": "object",
 *   "properties": {
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "tags": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" },
 *           "color": { "type": "string" }
 *         }
 *       }
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "tags": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" },
 *           "color": { "type": "string" }
 *         }
 *       }
 *     },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "updatedAt": { "type": "string", "format": "date-time" },
 *     "projectId": { "type": "string" }
 *   }
 * }
 * @error 401 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 403 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" },
 *     "details": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "message": { "type": "string" },
 *           "path": { "type": "string" }
 *         }
 *       }
 *     }
 *   }
 * }
 */
export async function PUT(
    request: Request,
    context: { params: { projectId: string; entryId: string } }
) {
    try {
        await validateAuthAndGetUser();
        const { title, content, version, tags } = await request.json();

        // Unwrap the params using IIFE
        const { entryId } = await (async () => context.params)();

        // Fix the tags connection structure
        const entry = await db.changelogEntry.update({
            where: {
                id: entryId
            },
            data: {
                title,
                content,
                version,
                tags: {
                    set: tags.map((tag: { id: string }) => ({
                        id: tag.id
                    }))
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

/**
 * Update the status of a changelog entry by ID
 * @method PATCH
 * @description Updates the status (published/unpublished) of a changelog entry by its ID. Requires user authentication and permission to edit the project.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry to update.
 * @requestBody {
 *   "type": "object",
 *   "properties": {
 *     "action": { "type": "string", "enum": ["publish", "unpublish"] }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "tags": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" },
 *           "color": { "type": "string" }
 *         }
 *       }
 *     },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "updatedAt": { "type": "string", "format": "date-time" },
 *     "projectId": { "type": "string" },
 *     "publishedAt": { "type": "string", "format": "date-time" }
 *   }
 * }
 * @error 401 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 403 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 404 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" },
 *     "details": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "message": { "type": "string" },
 *           "path": { "type": "string" }
 *         }
 *       }
 *     }
 *   }
 * }
 */
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
            },
            include: {
                changelog: {
                    select: {
                        project: {
                            select: {
                                requireApproval: true,
                                allowAutoPublish: true
                            }
                        }
                    }
                }
            }
        });

        if (!existingEntry) {
            return NextResponse.json(
                { error: 'Entry not found or does not belong to this project' },
                { status: 404 }
            );
        }

        const project = existingEntry.changelog.project;

        // Handle publish/unpublish actions
        if (action === 'publish' || action === 'unpublish') {
            // Allow unpublishing for both ADMIN and STAFF
            if (action === 'unpublish') {
                const entry = await db.changelogEntry.update({
                    where: { id: entryId },
                    data: {
                        publishedAt: null
                    },
                    include: { tags: true }
                });
                return NextResponse.json(entry);
            }

            // Handle publishing
            if (action === 'publish') {
                // Admins can publish directly
                if (user.role === Role.ADMIN || project.allowAutoPublish) {
                    const entry = await db.changelogEntry.update({
                        where: { id: entryId },
                        data: {
                            publishedAt: new Date()
                        },
                        include: { tags: true }
                    });
                    return NextResponse.json(entry);
                }

                // Staff needs approval if required
                if (project.requireApproval && user.role === Role.STAFF) {
                    // Check for existing pending request
                    const existingRequest = await db.changelogRequest.findFirst({
                        where: {
                            type: 'ALLOW_PUBLISH',
                            changelogEntryId: entryId,
                            status: 'PENDING'
                        }
                    });

                    if (existingRequest) {
                        return NextResponse.json(
                            { error: 'A publish request for this entry is already pending' },
                            { status: 400 }
                        );
                    }

                    // Create publish request
                    const publishRequest = await db.changelogRequest.create({
                        data: {
                            type: 'ALLOW_PUBLISH',
                            staffId: user.id,
                            projectId,
                            changelogEntryId: entryId,
                            status: 'PENDING'
                        }
                    });

                    return NextResponse.json({
                        message: 'Publish request created, awaiting admin approval',
                        request: publishRequest
                    }, { status: 202 });
                }
            }
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

/**
 * Delete a changelog entry or create a deletion request
 * @method DELETE
 * @description Deletes a changelog entry if the user is an admin, or creates a deletion request if the user is staff. Requires user authentication and appropriate permissions.
 * @param {string} projectId - The ID of the project the entry belongs to.
 * @param {string} entryId - The ID of the changelog entry to delete.
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "projectId": { "type": "string" },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "updatedAt": { "type": "string", "format": "date-time" }
 *   }
 * }
 * @response 202 {
 *   "type": "object",
 *   "properties": {
 *     "message": { "type": "string" },
 *     "request": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "type": { "type": "string", "enum": ["DELETE_ENTRY"] },
 *         "status": { "type": "string", "enum": ["PENDING"] },
 *         "staffId": { "type": "string" },
 *         "projectId": { "type": "string" },
 *         "changelogEntryId": { "type": "string" },
 *         "createdAt": { "type": "string", "format": "date-time" }
 *       }
 *     }
 *   }
 * }
 * @error 400 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 401 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 403 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 * @error 500 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 */
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

