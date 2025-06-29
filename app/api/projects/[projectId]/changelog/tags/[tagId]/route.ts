import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {createAuditLog} from '@/lib/utils/auditLog';

/**
 * @method GET
 * @description Get a specific tag by ID with usage statistics
 * @param {string} projectId - Project ID from the URL params
 * @param {string} tagId - Tag ID from the URL params
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" },
 *     "color": { "type": "string", "nullable": true },
 *     "_count": {
 *       "type": "object",
 *       "properties": {
 *         "entries": { "type": "number" }
 *       }
 *     }
 *   }
 * }
 * @error 401 Unauthorized
 * @error 404 Tag not found
 * @error 500 Failed to fetch tag
 */
export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ projectId: string; tagId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();

        if (!user) {
            return NextResponse.json(
                {error: 'Unauthorized'},
                {status: 401}
            );
        }

        const {tagId} = await (async () => params)();

        const tag = await db.changelogTag.findUnique({
            where: {id: tagId},
            include: {
                _count: {
                    select: {
                        entries: true
                    }
                }
            }
        });

        if (!tag) {
            return NextResponse.json(
                {error: 'Tag not found'},
                {status: 404}
            );
        }

        return NextResponse.json(tag);
    } catch (error) {
        console.error('Error fetching tag:', error);
        return NextResponse.json(
            {error: 'Failed to fetch tag'},
            {status: 500}
        );
    }
}

/**
 * @method PATCH
 * @description Update a specific tag
 * @param {string} projectId - Project ID from the URL params
 * @param {string} tagId - Tag ID from the URL params
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "name": {
 *       "type": "string",
 *       "description": "The new tag name"
 *     },
 *     "color": {
 *       "type": "string",
 *       "nullable": true,
 *       "description": "Hex color code for the tag (e.g., #3b82f6)"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" },
 *     "color": { "type": "string", "nullable": true }
 *   }
 * }
 * @error 400 Validation failed
 * @error 401 Unauthorized
 * @error 403 Forbidden
 * @error 404 Tag not found
 * @error 500 Server error
 */
const updateTagSchema = z.object({
    name: z.string().min(1).max(50).trim().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

export async function PATCH(
    request: NextRequest,
    {params}: { params: Promise<{ projectId: string; tagId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();

        if (!user) {
            return NextResponse.json(
                {error: 'Unauthorized'},
                {status: 401}
            );
        }

        if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
            return NextResponse.json(
                {error: 'Insufficient permissions'},
                {status: 403}
            );
        }

        const {projectId, tagId} = await (async () => params)();
        const body = await request.json();
        const validationResult = updateTagSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: validationResult.error.format()
                },
                {status: 400}
            );
        }

        const {name, color} = validationResult.data;

        // Check if tag exists
        const existingTag = await db.changelogTag.findUnique({
            where: {id: tagId}
        });

        if (!existingTag) {
            return NextResponse.json(
                {error: 'Tag not found'},
                {status: 404}
            );
        }

        // Check for name conflicts if name is being updated
        if (name && name !== existingTag.name) {
            const conflictingTag = await db.changelogTag.findFirst({
                where: {
                    name: {
                        equals: name,
                        mode: 'insensitive'
                    },
                    id: {
                        not: tagId
                    }
                }
            });

            if (conflictingTag) {
                return NextResponse.json(
                    {error: 'A tag with this name already exists'},
                    {status: 409}
                );
            }
        }

        // Build update data
        const updateData: { name?: string; color?: string | null } = {};
        if (name !== undefined) updateData.name = name;
        if (color !== undefined) updateData.color = color;

        // Update tag
        const updatedTag = await db.changelogTag.update({
            where: {id: tagId},
            data: updateData
        });

        // Log action
        try {
            await createAuditLog(
                'UPDATE_TAG',
                user.id,
                user.id,
                {
                    tagId: updatedTag.id,
                    tagName: updatedTag.name,
                    tagColor: updatedTag.color,
                    projectId,
                    changes: updateData,
                    timestamp: new Date().toISOString(),
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create tag update audit log:', auditLogError);
        }

        return NextResponse.json(updatedTag);

    } catch (error) {
        console.error('Error updating tag:', error);
        return NextResponse.json(
            {error: 'Failed to update tag'},
            {status: 500}
        );
    }
}

/**
 * @method DELETE
 * @description Delete a specific tag
 * @param {string} projectId - Project ID from the URL params
 * @param {string} tagId - Tag ID from the URL params
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "message": { "type": "string" }
 *   }
 * }
 * @error 401 Unauthorized
 * @error 403 Forbidden
 * @error 404 Tag not found
 * @error 500 Server error
 */
export async function DELETE(
    request: NextRequest,
    {params}: { params: Promise<{ projectId: string; tagId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();

        if (!user) {
            return NextResponse.json(
                {error: 'Unauthorized'},
                {status: 401}
            );
        }

        if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
            return NextResponse.json(
                {error: 'Insufficient permissions'},
                {status: 403}
            );
        }

        const {projectId, tagId} = await (async () => params)();

        // Check if tag exists and get usage count
        const existingTag = await db.changelogTag.findUnique({
            where: {id: tagId},
            include: {
                _count: {
                    select: {
                        entries: true
                    }
                }
            }
        });

        if (!existingTag) {
            return NextResponse.json(
                {error: 'Tag not found'},
                {status: 404}
            );
        }

        // Delete the tag (this will automatically remove it from associated entries due to the many-to-many relationship)
        await db.changelogTag.delete({
            where: {id: tagId}
        });

        // Log action
        try {
            await createAuditLog(
                'DELETE_TAG',
                user.id,
                user.id,
                {
                    tagId: existingTag.id,
                    tagName: existingTag.name,
                    tagColor: existingTag.color,
                    projectId,
                    entriesAffected: existingTag._count.entries,
                    timestamp: new Date().toISOString(),
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create tag deletion audit log:', auditLogError);
        }

        return NextResponse.json({
            success: true,
            message: `Tag "${existingTag.name}" deleted successfully. Removed from ${existingTag._count.entries} entries.`
        });

    } catch (error) {
        console.error('Error deleting tag:', error);
        return NextResponse.json(
            {error: 'Failed to delete tag'},
            {status: 500}
        );
    }
}