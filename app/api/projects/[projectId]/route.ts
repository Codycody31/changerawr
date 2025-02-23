import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'

/**
 * @method GET
 * @description Fetches a specific project, including its changelog and tags
 * @path {projectId}
 * @query {}
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "changelog": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "version": { "type": "string" },
 *           "createdAt": { "type": "string", "format": "date-time" },
 *           "tags": {
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
 * @error 404 Project not found
 * @error 500 An unexpected error occurred while fetching the project
 */
export async function GET(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    try {
        await validateAuthAndGetUser()

        const project = await db.project.findUnique({
            where: { id: params.projectId },
            include: {
                changelog: {
                    include: {
                        entries: {
                            orderBy: {
                                createdAt: 'desc'
                            },
                            include: {
                                tags: true
                            }
                        }
                    }
                }
            }
        })

        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 })
        }

        return Response.json(project)
    } catch (error) {
        console.error('Failed to fetch project:', error)
        return Response.json({ error: 'Failed to fetch project' }, { status: 500 })
    }
}

/**
 * @method PATCH
 * @description Updates a specific project
 * @path {projectId}
 * @request {json}
 * @query {}
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "changelog": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "version": { "type": "string" },
 *           "createdAt": { "type": "string", "format": "date-time" },
 *           "tags": {
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
 * @error 404 Project not found
 * @error 500 An unexpected error occurred while updating the project
 */
export async function PATCH(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    try {
        await validateAuthAndGetUser()
        const json = await request.json()

        const updated = await db.project.update({
            where: { id: params.projectId },
            data: json,
            include: {
                changelog: true
            }
        })

        return Response.json(updated)
    } catch (error) {
        console.error('Failed to update project:', error)
        return Response.json({ error: 'Failed to update project' }, { status: 500 })
    }
}

/**
 * @method DELETE
 * @description Deletes a specific project
 * @path {projectId}
 * @query {}
 * @response 204
 * @error 404 Project not found
 * @error 500 An unexpected error occurred while deleting the project
 */
export async function DELETE(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    try {
        await validateAuthAndGetUser()

        await db.project.delete({
            where: { id: params.projectId }
        })

        return new Response(null, { status: 204 })
    } catch (error) {
        console.error('Failed to delete project:', error)
        return Response.json({ error: 'Failed to delete project' }, { status: 500 })
    }
}