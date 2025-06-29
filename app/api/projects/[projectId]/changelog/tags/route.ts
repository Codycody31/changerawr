import {validateAuthAndGetUser} from "@/lib/utils/changelog"
import {NextRequest, NextResponse} from "next/server"
import {db} from "@/lib/db";
import {z} from 'zod';
import {createAuditLog} from "@/lib/utils/auditLog";

// Constants
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Get a list of project tags
 * @method GET
 * @description Fetches a list of tags specifically for a project's changelog along with pagination metadata. Users must be authenticated to access this endpoint.
 * @param {string} projectId - Project ID from the URL params
 * @queryParams {
 *   page: The page number of the results, starting from 1. Defaults to 1.
 *   limit: The number of results per page. Must be between 1 and 100. Defaults to 20.
 *   search: A search query to filter tags by name. Case-insensitive.
 *   includeUsage: Whether to include usage count for each tag. Defaults to false.
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "tags": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" },
 *           "color": { "type": "string", "nullable": true },
 *           "_count": {
 *             "type": "object",
 *             "properties": {
 *               "entries": { "type": "number" }
 *             }
 *           }
 *         }
 *       }
 *     },
 *     "pagination": {
 *       "type": "object",
 *       "properties": {
 *         "page": { "type": "number" },
 *         "limit": { "type": "number" },
 *         "totalCount": { "type": "number" },
 *         "totalPages": { "type": "number" },
 *         "hasMore": { "type": "boolean" }
 *       }
 *     }
 *   }
 * }
 * @error 401 Unauthorized
 * @error 404 Project not found
 * @error 500 Failed to fetch tags
 */
export async function GET(
    request: Request,
    {params}: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();

        if (!user) {
            return NextResponse.json(
                {error: 'Unauthorized'},
                {status: 401}
            );
        }

        // Parse and validate query parameters
        const {searchParams} = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(
            MAX_PAGE_SIZE,
            Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE)))
        );
        const search = searchParams.get('search') || '';
        const includeUsage = searchParams.get('includeUsage') === 'true';

        const {projectId} = await (async () => params)();

        // Verify project exists and user has access
        const project = await db.project.findUnique({
            where: {id: projectId},
            select: {
                id: true,
                changelog: {
                    select: {id: true}
                }
            }
        });

        if (!project?.changelog) {
            return NextResponse.json(
                {error: 'Project or changelog not found'},
                {status: 404}
            );
        }

        // Build optimized query - get tags that are used in this project's changelog entries
        const whereClause = {
            entries: {
                some: {
                    changelogId: project.changelog.id
                }
            },
            ...(search && {
                name: {
                    contains: search,
                    mode: 'insensitive' as const
                }
            })
        };

        // Build include clause for usage statistics
        const includeClause = includeUsage ? {
            _count: {
                select: {
                    entries: {
                        where: {
                            changelogId: project.changelog.id
                        }
                    }
                }
            }
        } : {};

        // Execute queries in parallel
        const [tags, totalCount] = await Promise.all([
            db.changelogTag.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    color: true,
                    createdAt: true,
                    updatedAt: true,
                    ...includeClause
                },
                orderBy: {
                    name: 'asc'
                },
                skip: (page - 1) * limit,
                take: limit
            }),
            db.changelogTag.count({
                where: whereClause
            })
        ]);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalCount / limit);
        const hasMore = page < totalPages;

        return NextResponse.json({
            tags,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasMore
            }
        });
    } catch (error) {
        console.error('Error fetching tags:', error);
        return NextResponse.json(
            {error: 'Failed to fetch tags'},
            {status: 500}
        );
    }
}

/**
 * @method POST
 * @description Creates a new tag for a project's changelog
 * @param {string} projectId - Project ID from the URL params
 * @body {
 *   "type": "object",
 *   "required": ["name"],
 *   "properties": {
 *     "name": {
 *       "type": "string",
 *       "description": "The tag name"
 *     },
 *     "color": {
 *       "type": "string",
 *       "nullable": true,
 *       "description": "Hex color code for the tag (e.g., #3b82f6)"
 *     }
 *   }
 * }
 * @response 201 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" },
 *     "color": { "type": "string", "nullable": true }
 *   }
 * }
 * @error 400 Validation failed - Invalid input format
 * @error 401 Unauthorized - Please log in
 * @error 403 Forbidden - Insufficient permissions
 * @error 404 Project not found
 * @error 409 Tag already exists
 * @error 500 Server error - Failed to create tag
 * @secure cookieAuth
 */

const createTagSchema = z.object({
    name: z.string().min(1).max(50).trim(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

export async function POST(
    request: NextRequest,
    {params}: { params: Promise<{ projectId: string }> }
) {
    try {
        // Validate user
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

        // Get project ID from route params
        const {projectId} = await (async () => params)();

        // Verify project exists and user has access
        const project = await db.project.findUnique({
            where: {id: projectId},
            select: {
                id: true,
                name: true,
                changelog: {
                    select: {id: true}
                }
            }
        });

        if (!project) {
            return NextResponse.json(
                {error: 'Project not found'},
                {status: 404}
            );
        }

        if (!project.changelog) {
            return NextResponse.json(
                {error: 'Project changelog not found'},
                {status: 404}
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const validationResult = createTagSchema.safeParse(body);

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

        // Check if tag already exists (case insensitive)
        const existingTag = await db.changelogTag.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                }
            }
        });

        if (existingTag) {
            // Return the existing tag instead of an error
            return NextResponse.json(existingTag, {status: 200});
        }

        // Create new tag with color
        const newTag = await db.changelogTag.create({
            data: {
                name: name,
                color: color || null,
            }
        });

        // Log action
        try {
            await createAuditLog(
                'CREATE_TAG',
                user.id,
                user.id,
                {
                    reason: 'Tag created for project',
                    tagId: newTag.id,
                    tagName: newTag.name,
                    tagColor: newTag.color,
                    projectId,
                    projectName: project.name,
                    timestamp: new Date().toISOString(),
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create tag created audit log:', auditLogError);
        }

        return NextResponse.json(newTag, {status: 201});

    } catch (error) {
        console.error('Error creating tag:', error);
        return NextResponse.json(
            {error: 'Failed to create tag'},
            {status: 500}
        );
    }
}

/**
 * @method PATCH
 * @description Updates an existing tag's properties
 * @param {string} projectId - Project ID from the URL params
 * @body {
 *   "type": "object",
 *   "required": ["tagId"],
 *   "properties": {
 *     "tagId": {
 *       "type": "string",
 *       "description": "The ID of the tag to update"
 *     },
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
 * @error 404 Tag or project not found
 * @error 409 Tag name already exists
 * @error 500 Server error
 */
const updateTagSchema = z.object({
    tagId: z.string().min(1),
    name: z.string().min(1).max(50).trim().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

export async function PATCH(
    request: NextRequest,
    {params}: { params: Promise<{ projectId: string }> }
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

        const {projectId} = await (async () => params)();

        // Verify project exists
        const project = await db.project.findUnique({
            where: {id: projectId},
            select: {
                id: true,
                name: true,
                changelog: {
                    select: {id: true}
                }
            }
        });

        if (!project?.changelog) {
            return NextResponse.json(
                {error: 'Project or changelog not found'},
                {status: 404}
            );
        }

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

        const {tagId, name, color} = validationResult.data;

        // Check if tag exists
        const existingTag = await db.changelogTag.findUnique({
            where: {id: tagId},
            include: {
                _count: {
                    select: {
                        entries: {
                            where: {
                                changelogId: project.changelog.id
                            }
                        }
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
                    projectName: project.name,
                    changes: updateData,
                    entriesAffected: existingTag._count.entries,
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
 * @description Deletes a tag and removes it from all entries in the project
 * @param {string} projectId - Project ID from the URL params
 * @queryParams {
 *   tagId: The ID of the tag to delete (required)
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "message": { "type": "string" },
 *     "entriesAffected": { "type": "number" }
 *   }
 * }
 * @error 400 Missing tagId parameter
 * @error 401 Unauthorized
 * @error 403 Forbidden
 * @error 404 Tag or project not found
 * @error 500 Server error
 */
export async function DELETE(
    request: NextRequest,
    {params}: { params: Promise<{ projectId: string }> }
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

        const {projectId} = await (async () => params)();
        const {searchParams} = new URL(request.url);
        const tagId = searchParams.get('tagId');

        if (!tagId) {
            return NextResponse.json(
                {error: 'Missing tagId parameter'},
                {status: 400}
            );
        }

        // Verify project exists
        const project = await db.project.findUnique({
            where: {id: projectId},
            select: {
                id: true,
                name: true,
                changelog: {
                    select: {id: true}
                }
            }
        });

        if (!project?.changelog) {
            return NextResponse.json(
                {error: 'Project or changelog not found'},
                {status: 404}
            );
        }

        // Check if tag exists and get usage count for this project
        const existingTag = await db.changelogTag.findUnique({
            where: {id: tagId},
            include: {
                _count: {
                    select: {
                        entries: {
                            where: {
                                changelogId: project.changelog.id
                            }
                        }
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

        const entriesAffected = existingTag._count.entries;

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
                    projectName: project.name,
                    entriesAffected,
                    timestamp: new Date().toISOString(),
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create tag deletion audit log:', auditLogError);
        }

        return NextResponse.json({
            success: true,
            message: `Tag "${existingTag.name}" deleted successfully`,
            entriesAffected
        });

    } catch (error) {
        console.error('Error deleting tag:', error);
        return NextResponse.json(
            {error: 'Failed to delete tag'},
            {status: 500}
        );
    }
}