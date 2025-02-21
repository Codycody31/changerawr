import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'

// Validation schema for project settings
const projectSettingsSchema = z.object({
    name: z.string().min(1).optional(),
    isPublic: z.boolean().optional(),
    allowAutoPublish: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    defaultTags: z.array(z.string()).optional(),
})

/**
 * @method GET
 * @description Retrieves the project settings for a given project
 * @query {
 *   projectId: String, required
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" },
 *     "isPublic": { "type": "boolean" },
 *     "allowAutoPublish": { "type": "boolean" },
 *     "requireApproval": { "type": "boolean" },
 *     "defaultTags": { "type": "array", "items": { "type": "string" } },
 *     "updatedAt": { "type": "string", "format": "date-time" }
 *   }
 * }
 * @error 400 Invalid request data
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 404 Project not found
 * @error 500 An unexpected error occurred while fetching the project settings
 */
export async function GET(
    request: Request,
    context: { params: { projectId: string } }
) {
    try {
        const { projectId } = await (async () => context.params)();

        await validateAuthAndGetUser()

        const project = await db.project.findUnique({
            where: {
                id: projectId
            },
            select: {
                id: true,
                name: true,
                isPublic: true,
                allowAutoPublish: true,
                requireApproval: true,
                defaultTags: true,
                updatedAt: true,
            }
        })

        if (!project) {
            return new NextResponse(
                JSON.stringify({ error: 'Project not found' }),
                { status: 404 }
            )
        }

        return new NextResponse(JSON.stringify(project), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('Failed to fetch project settings:', error)
        return new NextResponse(
            JSON.stringify({ error: 'Failed to fetch project settings' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
}

/**
 * @method PATCH
 * @description Updates the project settings for a given project
 * @query {
 *   projectId: String, required
 * }
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "name": { "type": "string" },
 *     "isPublic": { "type": "boolean" },
 *     "allowAutoPublish": { "type": "boolean" },
 *     "requireApproval": { "type": "boolean" },
 *     "defaultTags": {
 *       "type": "array",
 *       "items": { "type": "string" }
 *     }
 *   },
 *   "required": [
 *     "name"
 *   ]
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" },
 *     "isPublic": { "type": "boolean" },
 *     "allowAutoPublish": { "type": "boolean" },
 *     "requireApproval": { "type": "boolean" },
 *     "defaultTags": { "type": "array", "items": { "type": "string" } },
 *     "updatedAt": { "type": "string", "format": "date-time" }
 *   }
 * }
 * @error 400 Invalid request data
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 404 Project not found
 * @error 500 An unexpected error occurred while updating the project settings
 */
export async function PATCH(
    request: Request,
    context: { params: { projectId: string } }
) {
    try {
        const { projectId } = await (async () => context.params)();

        await validateAuthAndGetUser()

        // Get and validate request body
        const body = await request.json()
        const validatedData = projectSettingsSchema.parse(body)

        // Fetch current project to ensure it exists
        const existingProject = await db.project.findUnique({
            where: {
                id: projectId
            }
        })

        if (!existingProject) {
            return new NextResponse(
                JSON.stringify({ error: 'Project not found' }),
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                }
            )
        }

        // Update project settings
        const updatedProject = await db.project.update({
            where: {
                id: projectId
            },
            data: {
                ...validatedData,
                updatedAt: new Date()
            },
            select: {
                id: true,
                name: true,
                isPublic: true,
                allowAutoPublish: true,
                requireApproval: true,
                defaultTags: true,
                updatedAt: true,
            }
        })

        return new NextResponse(JSON.stringify(updatedProject), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error('Failed to update project settings:', error)

        if (error instanceof z.ZodError) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Invalid request data',
                    details: error.errors
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            )
        }

        return new NextResponse(
            JSON.stringify({ error: 'Failed to update project settings' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
}