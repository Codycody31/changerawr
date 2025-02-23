import { validateAuthAndGetUser } from "@/lib/utils/changelog"
import { NextResponse } from "next/server"
import { db } from "@/lib/db";

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
    { params }: { params: { projectId: string } }
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