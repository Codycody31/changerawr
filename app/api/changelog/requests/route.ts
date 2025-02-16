import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { z } from 'zod'

const requestSchema = z.object({
    type: z.enum(['DELETE_PROJECT', 'DELETE_TAG']),
    projectId: z.string(),
    targetId: z.string().optional()
})

export async function GET() {
    try {
        const user = await validateAuthAndGetUser()

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const requests = await db.changelogRequest.findMany({
            where: {
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

export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser()
        console.log('User attempting to create request:', { id: user.id, role: user.role }) // Debugging

        // Ensure only staff members can create requests (Admins should perform actions directly)
        if (user.role !== 'STAFF') {
            return NextResponse.json(
                { error: 'Only staff can create requests' },
                { status: 403 }
            )
        }

        const body = await request.json()
        console.log('Received request body:', body) // Debug log

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

        // Check if a similar pending request already exists
        const existingRequest = await db.changelogRequest.findFirst({
            where: {
                projectId: validatedData.projectId,
                type: validatedData.type,
                targetId: validatedData.targetId,
                status: 'PENDING',
                staffId: user.id
            }
        })

        if (existingRequest) {
            return NextResponse.json(
                { error: 'A similar request is already pending' },
                { status: 400 }
            )
        }

        // Create the request without performing the deletion
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

        // Log the creation of the request for debugging
        console.log('Request created successfully:', changelogRequest)

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
