import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { createAuditLog } from '@/lib/utils/auditLog'; // Import the audit log function
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

// Validation schemas
const createApiKeySchema = z.object({
    name: z.string().min(1).max(100),
    expiresAt: z.string().datetime().optional(),
    permissions: z.array(z.string()).optional(),
});

export async function GET() {
    try {
        const user = await validateAuthAndGetUser();

        // Only admins can list API keys
        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const apiKeys = await db.apiKey.findMany({
            select: {
                id: true,
                name: true,
                key: true,
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
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Log the action of viewing API keys
        try {
            await createAuditLog(
                'VIEW_API_KEYS',
                user.id,
                user.id,
                {
                    apiKeyCount: apiKeys.length || 0
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
            // Continue execution even if audit log creation fails
        }

        return NextResponse.json(apiKeys);
    } catch (error) {
        console.error('Failed to fetch API keys:', error);
        return NextResponse.json(
            { error: 'Failed to fetch API keys' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser();

        // Only admins can create API keys
        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validatedData = createApiKeySchema.parse(body);

        // Generate a unique API key
        const apiKeyString = `chr_${nanoid(32)}`;

        const apiKey = await db.apiKey.create({
            data: {
                name: validatedData.name,
                key: apiKeyString,
                expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
                permissions: validatedData.permissions || [],
                userId: user.id
            }
        });

        // Log the action of creating an API key
        try {
            await createAuditLog(
                'CREATE_API_KEY',
                user.id,
                apiKey.id,
                {
                    apiKeyName: apiKey.name,
                    expiresAt: apiKey.expiresAt?.toISOString() || 'N/A',
                    permissions: apiKey.permissions || []
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
            // Continue execution even if audit log creation fails
        }

        return NextResponse.json({
            ...apiKey,
            key: apiKeyString // Only return the full key on creation
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Failed to create API key:', error);
        return NextResponse.json(
            { error: 'Failed to create API key' },
            { status: 500 }
        );
    }
}