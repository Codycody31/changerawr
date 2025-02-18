import { validateAuthAndGetUser } from "@/lib/utils/changelog"
import { NextResponse } from "next/server"
import { db } from "@/lib/db";
import { z } from "zod"; // Recommended for validation

export async function GET(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    try {
        const user = await validateAuthAndGetUser();

        // Maintain IIFE for params
        const { projectId } = await (async () => params)();

        // Log the projectId for debugging
        console.log('Received projectId:', projectId);

        // More flexible validation
        const validatedProjectId = z.string().min(1).parse(projectId);

        const tags = await db.changelogTag.findMany({
            where: {
                // Removed UUID-specific filtering
                entries: {
                    some: {
                        changelog: {
                            projectId: validatedProjectId
                        }
                    }
                }
            },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Fallback to empty array if no tags found
        return NextResponse.json(tags || []);
    } catch (error) {
        console.error('Error fetching tags:', error);

        // More detailed error logging
        if (error instanceof z.ZodError) {
            console.error('Validation error details:', error.errors);
            return NextResponse.json(
                {
                    error: 'Invalid project ID',
                    details: error.errors
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch tags' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    try {
        const user = await validateAuthAndGetUser();

        // Parse and validate request body
        const tagSchema = z.object({
            name: z.string().min(1, "Tag name is required").max(50, "Tag name too long")
        });

        const { name } = tagSchema.parse(await request.json());

        // Maintain IIFE for params
        const { projectId } = await (async () => params)();

        // More flexible validation
        const validatedProjectId = z.string().min(1).parse(projectId);

        const tag = await db.changelogTag.create({
            data: {
                name,
                // Optional: Associate with project if needed
                // projectId: validatedProjectId
            },
            select: {
                id: true,
                name: true
            }
        });

        return NextResponse.json(tag);
    } catch (error) {
        console.error('Error creating tag:', error);

        // More granular error handling
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.errors[0].message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create tag' },
            { status: 500 }
        );
    }
}