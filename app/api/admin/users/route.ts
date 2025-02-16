import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { createAuditLog } from '@/lib/utils/auditLog';
import { db } from '@/lib/db';
import { z } from 'zod';
import { nanoid } from 'nanoid';

// Validation schemas
const createInvitationSchema = z.object({
    email: z.string().email(),
    role: z.enum(['ADMIN', 'STAFF']),
    expiresAt: z.string().datetime().optional()
});

export async function GET() {
    try {
        const user = await validateAuthAndGetUser();

        // Only admins can list users
        if (user.role !== 'ADMIN') {
            return new NextResponse(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 403 }
            );
        }

        const users = await db.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                lastLoginAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Log the action of viewing users
        try {
            await createAuditLog(
                'VIEW_USERS_LIST',
                user.id,
                user.id,
                {
                    userCount: users.length || 0
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
            // Continue execution even if audit log creation fails
        }

        return new NextResponse(JSON.stringify(users), { status: 200 });
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return new NextResponse(
            JSON.stringify({ error: 'Failed to fetch users' }),
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser();

        // Only admins can create invitation links
        if (user.role !== 'ADMIN') {
            return new NextResponse(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 403 }
            );
        }

        const body = await request.json();
        const validatedData = createInvitationSchema.parse(body);

        // Check if user already exists
        const existingUser = await db.user.findUnique({
            where: { email: validatedData.email }
        });

        if (existingUser) {
            return new NextResponse(
                JSON.stringify({ error: 'User with this email already exists' }),
                { status: 400 }
            );
        }

        // Check for existing active invitation
        const existingInvitation = await db.invitationLink.findFirst({
            where: {
                email: validatedData.email,
                usedAt: null,
                expiresAt: {
                    gt: new Date()
                }
            }
        });

        if (existingInvitation) {
            return new NextResponse(
                JSON.stringify({ error: 'An active invitation already exists for this email' }),
                { status: 400 }
            );
        }

        // Generate invitation token and set expiration
        const token = nanoid(32);
        const expiresAt = validatedData.expiresAt
            ? new Date(validatedData.expiresAt)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

        // Create invitation link
        const invitationLink = await db.invitationLink.create({
            data: {
                email: validatedData.email,
                token,
                role: validatedData.role,
                expiresAt,
                createdBy: user.id
            }
        });

        // Generate the full invitation URL
        const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register/${token}`;

        // Create audit log for invitation creation
        try {
            await createAuditLog(
                'CREATE_INVITATION',
                user.id,
                invitationLink.id || user.id,
                {
                    invitationEmail: invitationLink.email || 'N/A',
                    invitationRole: invitationLink.role || 'N/A',
                    expiresAt: (invitationLink.expiresAt || new Date()).toISOString()
                }
            );
        } catch (auditLogError) {
            console.error('Failed to create audit log:', auditLogError);
            // Continue execution even if audit log creation fails
        }

        return new NextResponse(
            JSON.stringify({
                message: 'Invitation link created successfully',
                invitation: {
                    id: invitationLink.id,
                    email: invitationLink.email,
                    role: invitationLink.role,
                    expiresAt: invitationLink.expiresAt,
                    url: invitationUrl
                }
            }),
            { status: 200 }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(
                JSON.stringify({ error: 'Invalid request data', details: error.errors }),
                { status: 400 }
            );
        }

        console.error('Failed to create invitation link:', error);
        return new NextResponse(
            JSON.stringify({ error: 'Failed to create invitation link' }),
            { status: 500 }
        );
    }
}