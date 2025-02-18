import { validateAuthAndGetUser } from "@/lib/utils/changelog"
import { NextResponse } from "next/server"
import {db} from "@/lib/db";

export async function GET(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    try {
        await validateAuthAndGetUser()

        const tags = await db.changelogTag.findMany({
            where: {
                entries: {
                    some: {
                        changelog: {
                            projectId: params.projectId
                        }
                    }
                }
            }
        })

        return NextResponse.json(tags)
    } catch (error) {
        console.error('Error fetching tags:', error)
        return NextResponse.json(
            { error: 'Failed to fetch tags' },
            { status: 500 }
        )
    }
}

export async function POST(
    request: Request,
    {}: { params: { projectId: string } }
) {
    try {
        await validateAuthAndGetUser()
        const { name } = await request.json()

        const tag = await db.changelogTag.create({
            data: {
                name,
            }
        })

        return NextResponse.json(tag)
    } catch (error) {
        console.error('Error creating tag:', error)
        return NextResponse.json(
            { error: 'Failed to create tag' },
            { status: 500 }
        )
    }
}