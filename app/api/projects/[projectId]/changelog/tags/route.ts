import { validateAuthAndGetUser } from "@/lib/utils/changelog"
import {NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db";
import { z } from 'zod';
import {createAuditLog} from "@/lib/utils/auditLog";

// Constants
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Get a list of project tags
 * @method GET
 * @description Fetches a list of project tags along with pagination metadata. Users must be authenticated to access this endpoint.
 * @queryParams {
 *   page: The page number of the results, starting from 1. Defaults to 1.
 *   limit: The number of results per page. Must be between 1 and 100. Defaults to 20.
 *   search: A search query to filter tags by name. Case-insensitive.
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
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        await validateAuthAndGetUser();

        // Parse and validate query parameters
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(
            MAX_PAGE_SIZE,
            Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE)))
        );
        const search = searchParams.get('search') || '';

        const { projectId } = await (async () => params)();

        // Build optimized query
        const whereClause = {
            entries: {
                some: {
                    changelog: {
                        projectId
                    }
                }
            },
            ...(search && {
                name: {
                    contains: search,
                    mode: 'insensitive' as const
                }
            })
        };

        // Execute queries in parallel
        const [tags, totalCount] = await Promise.all([
            db.changelogTag.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
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
            { error: 'Failed to fetch tags' },
            { status: 500 }
        );
    }
}

/**
 * @method POST
 * @description Creates a new tag for a project's changelog
 * @body {
 *   "type": "object",
 *   "required": ["name"],
 *   "properties": {
 *     "name": {
 *       "type": "string",
 *       "description": "The tag name"
 *     }
 *   }
 * }
 * @response 201 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" }
 *   }
 * }
 * @error 400 Validation failed - Invalid input format
 * @error 401 Unauthorized - Please log in
 * @error 403 Forbidden - Insufficient permissions
 * @error 409 Tag already exists
 * @error 500 Server error - Failed to create tag
 * @secure cookieAuth
 */

const createTagSchema = z.object({
    name: z.string().min(1).max(50).trim(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        // Validate user
        const user = await validateAuthAndGetUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
            return NextResponse.json(
                { error: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        // Get project ID from route params
        const { projectId } = await (async () => params)();

        // Verify project exists
        const project = await db.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
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
                { status: 400 }
            );
        }

        const { name } = validationResult.data;

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
            return NextResponse.json(existingTag, { status: 200 });
        }

        // Create new tag
        const newTag = await db.changelogTag.create({
            data: {
                name: name,
            }
        });

        // Log action
        try {
            await createAuditLog(
                'CREATE_TAG',
                user.id,
                user.id,
                {
                    reason: 'Tag assigned did not exist previously',
                    tagId: newTag.id,
                    tagName: newTag.name,
                    projectId,
                    timestamp: new Date().toISOString(),
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create tag created audit log:', auditLogError);
        }

        return NextResponse.json(newTag, { status: 201 });

    } catch (error) {
        console.error('Error creating tag:', error);
        return NextResponse.json(
            { error: 'Failed to create tag' },
            { status: 500 }
        );
    }
}