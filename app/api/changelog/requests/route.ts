import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { z } from 'zod'
import {Prisma} from "@prisma/client";

const requestSchema = z.object({
    type: z.enum(['DELETE_PROJECT', 'DELETE_TAG', 'DELETE_ENTRY']),
    projectId: z.string(),
    targetId: z.string().optional()
})

/**
 * @method GET
 * @description Retrieves pending changelog requests for authenticated user
 * @path /api/requests
 * @query {projectId: string} (optional)
 * @response 200 {
 *   "type": "array",
 *   "items": {
 *     "type": "object",
 *     "properties": {
 *       "id": { "type": "string" },
 *       "type": { "type": "string", "enum": ["DELETE_PROJECT", "DELETE_TAG", "DELETE_ENTRY"] },
 *       "status": { "type": "string", "enum": ["PENDING"] },
 *       "staffId": { "type": "string" },
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
        const { searchParams } = new URL(request.url)
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
            { error: 'Failed to fetch requests' },
            { status: 500 }
        )
    }
}

/**
 * @method POST
 * @description Creates a new pending changelog request
 * @path /api/requests
 * @request {json}
 * @response 201 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "type": { "type": "string", "enum": ["DELETE_PROJECT", "DELETE_TAG", "DELETE_ENTRY"] },
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
 * @error 400 Invalid request data
 * @error 500 Internal Server Error
 */
export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser()
        console.log('User attempting to create request:', { id: user.id, role: user.role })

        // Ensure only staff members can create requests (Admins should perform actions directly)
        if (user.role !== 'STAFF') {
            return NextResponse.json(
                { error: 'Only staff can create requests' },
                { status: 403 }
            )
        }

        const body = await request.json()
        console.log('Received request body:', body)

        const validatedData = requestSchema.parse(body)

        // Check if project exists and retrieve its details
        const project = await db.project.findUnique({
            where: { id: validatedData.projectId },
            select: {
                id: true,
                name: true,
                defaultTags: true
            }
        })

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            )
        }

        // Validate DELETE_TAG type requests
        if (validatedData.type === 'DELETE_TAG') {
            if (!validatedData.targetId) {
                return NextResponse.json(
                    { error: 'Target ID is required for tag deletion' },
                    { status: 400 }
                )
            }

            if (!project.defaultTags.includes(validatedData.targetId)) {
                return NextResponse.json(
                    { error: 'Tag not found in project' },
                    { status: 404 }
                )
            }
        }

        // Check if a similar pending request already exists from any staff member
        const existingRequest = await db.changelogRequest.findFirst({
            where: {
                projectId: validatedData.projectId,
                type: validatedData.type,
                targetId: validatedData.targetId,
                status: 'PENDING'
            }
        })

        if (existingRequest) {
            return NextResponse.json(
                { error: 'A similar request is already pending' },
                { status: 409 } // Using 409 Conflict for better semantic meaning
            )
        }

        // Create the request
        const changelogRequest = await db.changelogRequest.create({
            data: {
                type: validatedData.type,
                status: 'PENDING',
                staffId: user.id,
                projectId: validatedData.projectId,
                targetId: validatedData.targetId
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

        // Create an audit log entry
        await db.auditLog.create({
            data: {
                action: 'REQUEST_CREATED',
                userId: user.id,
                details: {
                    requestId: changelogRequest.id,
                    requestType: validatedData.type,
                    projectId: validatedData.projectId,
                    targetId: validatedData.targetId
                }
            }
        })

        return NextResponse.json(changelogRequest, { status: 201 })

    } catch (error) {
        console.error('Failed to create request:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Invalid request data',
                    details: error.errors
                },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Failed to create request' },
            { status: 500 }
        )
    }
}