import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateApiKeySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    isRevoked: z.boolean().optional(),
    expiresAt: z.string().datetime().optional().nullable(),
});

export async function GET(
    request: Request,
    { params }: { params: { keyId: string } }
) {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const apiKey = await db.apiKey.findUnique({
            where: { id: params.keyId },
            select: {
                id: true,
                name: true,
                lastUsed: true,
                createdAt: true,
                expiresAt: true,
                isRevoked: true,
                permissions: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                }
            }
        });

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(apiKey);
    } catch (error) {
        console.error('Failed to fetch API key:', error);
        return NextResponse.json(
            { error: 'Failed to fetch API key' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { keyId: string } }
) {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validatedData = updateApiKeySchema.parse(body);

        const existingKey = await db.apiKey.findUnique({
            where: { id: params.keyId }
        });

        if (!existingKey) {
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            );
        }

        // If the key is already revoked, only allow name changes
        if (existingKey.isRevoked && validatedData.isRevoked === false) {
            return NextResponse.json(
                { error: 'Cannot un-revoke an API key' },
                { status: 400 }
            );
        }

        const apiKey = await db.apiKey.update({
            where: { id: params.keyId },
            data: {
                ...(validatedData.name && { name: validatedData.name }),
                ...(validatedData.isRevoked !== undefined && { isRevoked: validatedData.isRevoked }),
                ...(validatedData.expiresAt !== undefined && {
                    expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null
                })
            },
            select: {
                id: true,
                name: true,
                lastUsed: true,
                createdAt: true,
                expiresAt: true,
                isRevoked: true,
                permissions: true
            }
        });

        return NextResponse.json(apiKey);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Failed to update API key:', error);
        return NextResponse.json(
            { error: 'Failed to update API key' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { keyId: string } }
) {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const existingKey = await db.apiKey.findUnique({
            where: { id: params.keyId }
        });

        if (!existingKey) {
            return NextResponse.json(
                { error: 'API key not found' },
                { status: 404 }
            );
        }

        // Only allow deletion of revoked keys
        if (!existingKey.isRevoked) {
            return NextResponse.json(
                { error: 'Cannot delete an active API key. Revoke it first.' },
                { status: 400 }
            );
        }

        // Permanently delete the key
        await db.apiKey.delete({
            where: { id: params.keyId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete API key:', error);
        return NextResponse.json(
            { error: 'Failed to delete API key' },
            { status: 500 }
        );
    }
}