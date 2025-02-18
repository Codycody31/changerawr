import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { z } from 'zod'

const projectSchema = z.object({
    name: z.string().min(1, 'Project name is required')
})

export async function GET() {
    try {
        await validateAuthAndGetUser()

        const projects = await db.project.findMany({
            include: {
                changelog: {
                    include: {
                        entries: {
                            orderBy: {
                                createdAt: 'desc'
                            },
                            take: 1,
                            select: {
                                id: true,
                                version: true,
                                createdAt: true
                            }
                        },
                        _count: {
                            select: {
                                entries: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Transform the response to include entry count and latest entry
        const transformedProjects = projects.map(project => ({
            ...project,
            entryCount: project.changelog?._count?.entries || 0,
            latestEntry: project.changelog?.entries?.[0] || null
        }))

        return Response.json(transformedProjects)
    } catch (error) {
        console.error('Failed to fetch projects:', error)
        return Response.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        await validateAuthAndGetUser()

        const json = await request.json()
        const { name } = projectSchema.parse(json)

        const project = await db.project.create({
            data: {
                name,
                changelog: {
                    create: {} // Create an empty changelog automatically
                }
            },
            include: {
                changelog: true
            }
        })

        return Response.json(project, { status: 201 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return Response.json({ error: error.errors[0].message }, { status: 400 })
        }

        console.error('Failed to create project:', error)
        return Response.json({ error: 'Failed to create project' }, { status: 500 })
    }
}