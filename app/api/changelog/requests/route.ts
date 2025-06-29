// app/api/changelog/requests/route.ts
import {NextResponse} from 'next/server'
import {db} from '@/lib/db'
import {validateAuthAndGetUser} from '@/lib/utils/changelog'
import {z} from 'zod'
import {Prisma} from "@prisma/client";

const requestSchema = z.object({
    type: z.enum(['DELETE_PROJECT', 'DELETE_TAG', 'DELETE_ENTRY', 'ALLOW_PUBLISH', 'ALLOW_SCHEDULE']),
    projectId: z.string(),
    targetId: z.string().optional()
})

/**
 * @method GET
 * @description Retrieves pending changelog requests for authenticated user
 * @path /api/changelog/requests
 * @query {projectId: string} (optional)
 * @response 200 {
 *   "type": "array",
 *   "items": {
 *     "type": "object",
 *     "properties": {
 *       "id": { "type": "string" },
 *       "type": { "type": "string", "enum": ["DELETE_PROJECT", "DELETE_TAG", "DELETE_ENTRY", "ALLOW_PUBLISH", "ALLOW_SCHEDULE"] },
 *       "status": { "type": "string", "enum": ["PENDING", "APPROVED", "REJECTED"] },
 *       "staffId": { "type": "string" },
 *       "targetId": { "type": "string" },
 *       "staff": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "email": { "type": "string" },
 *           "name": { "type": "string" }
 *         }
 *       },
 *       "project": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" },
 *           "defaultTags": {
 *             "type": "array",
 *             "items": {
 *               "type": "string"
 *             }
 *           }
 *         }
 *       },
 *       "ChangelogEntry": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "title": { "type": "string" }
 *         }
 *       },
 *       "ChangelogTag": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 401 Unauthorized - User not authenticated
 * @error 500 An unexpected error occurred while fetching requests
 */
export async function GET(request: Request) {
    try {
        const user = await validateAuthAndGetUser()
        const {searchParams} = new URL(request.url)
        const projectId = searchParams.get('projectId')

        // Build the base query
        const whereClause: Prisma.ChangelogRequestWhereInput = {
            status: 'PENDING',
        }

        // If projectId is provided, filter by it
        if (projectId) {
            whereClause.projectId = projectId
        }

        // If not admin, only show user's own requests
        if (user.role !== 'ADMIN') {
            whereClause.staffId = user.id
        }

        const requests = await db.changelogRequest.findMany({
            where: whereClause,
            include: {
                staff: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        defaultTags: true
                    }
                },
                ChangelogEntry: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                ChangelogTag: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(requests)

    } catch (error) {
        console.error('Failed to fetch requests:', error)
        return NextResponse.json(
            {error: 'Failed to fetch requests'},
            {status: 500}
        )
    }
}

/**
 * @method POST
 * @description Creates a new pending changelog request
 * @path /api/changelog/requests
 * @request {json}
 * @response 201 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "type": { "type": "string", "enum": ["DELETE_PROJECT", "DELETE_TAG", "DELETE_ENTRY", "ALLOW_PUBLISH", "ALLOW_SCHEDULE"] },
 *     "status": { "type": "string", "enum": ["PENDING"] },
 *     "staffId": { "type": "string" },
 *     "staff": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "email": { "type": "string" },
 *         "name": { "type": "string" }
 *       }
 *     },
 *     "project": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "name": { "type": "string" },
 *         "defaultTags": {
 *             "type": "array",
 *             "items": {
 *               "type": "string"
 *             }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 401 Unauthorized - User not authenticated
 * @error 403 Forbidden - Only staff members can create requests
 * @error 400 Bad Request - Invalid request data
 * @error 500 An unexpected error occurred while creating the request
 */
export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser()

        if (user.role === 'VIEWER') {
            return NextResponse.json(
                {error: 'Only staff members can create requests'},
                {status: 403}
            )
        }

        const body = await request.json()
        const validatedData = requestSchema.parse(body)

        // Create the request
        const newRequest = await db.changelogRequest.create({
            data: {
                type: validatedData.type,
                staffId: user.id,
                projectId: validatedData.projectId,
                targetId: validatedData.targetId,
                status: 'PENDING'
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        defaultTags: true
                    }
                }
            }
        })

        return NextResponse.json(newRequest, {status: 201})

    } catch (error) {
        console.error('Failed to create request:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {error: 'Invalid request data', details: error.errors},
                {status: 400}
            )
        }

        return NextResponse.json(
            {error: 'Failed to create request'},
            {status: 500}
        )
    }
}