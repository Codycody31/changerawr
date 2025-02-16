import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'

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