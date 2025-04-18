import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for email config
const emailConfigSchema = z.object({
    enabled: z.boolean(),
    smtpHost: z.string().min(1, 'SMTP host is required'),
    smtpPort: z.coerce.number().int().min(1).max(65535),
    smtpUser: z.string().optional().nullable(),
    smtpPassword: z.string().optional().nullable(),
    smtpSecure: z.boolean().default(true),
    fromEmail: z.string().email('Invalid email address'),
    fromName: z.string().optional().nullable(),
    replyToEmail: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
    defaultSubject: z.string().optional().nullable(),
});

/**
 * @method GET
 * @description Retrieves the email configuration for a project
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const { projectId } = await context.params;

        // Verify project access
        const project = await db.project.findUnique({
            where: { id: projectId },
            include: { emailConfig: true }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // If no config exists yet, return default values
        if (!project.emailConfig) {
            return NextResponse.json({
                enabled: false,
                smtpHost: '',
                smtpPort: 587,
                smtpUser: '',
                smtpPassword: '',
                smtpSecure: true,
                fromEmail: '',
                fromName: '',
                replyToEmail: '',
                defaultSubject: 'New Changelog Update'
            });
        }

        // Don't return password in the response for security reasons
        const { ...safeConfig } = project.emailConfig;

        return NextResponse.json(safeConfig);
    } catch (error) {
        console.error('Failed to fetch email configuration:', error);
        return NextResponse.json(
            { error: 'Failed to fetch email configuration', message: (error as Error).message },
            { status: 500 }
        );
    }
}

/**
 * @method POST
 * @description Creates or updates email configuration for a project
 */
export async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const { projectId } = await context.params;

        // Verify project access
        const project = await db.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = emailConfigSchema.parse(body);

        // Check if existing config to handle password properly
        const existingConfig = await db.emailConfig.findUnique({
            where: { projectId }
        });

        // Prepare data for update or create
        const data = {
            ...validatedData,
            // Handle null/empty values for optional fields
            smtpUser: validatedData.smtpUser || '',
            fromName: validatedData.fromName || '',
            replyToEmail: validatedData.replyToEmail || '',
            defaultSubject: validatedData.defaultSubject || 'New Changelog Update',
            // Handle password update logic:
            // - If password is provided in the request, use it
            // - If not and there's an existing password, keep it
            // - Otherwise use empty string
            smtpPassword: validatedData.smtpPassword
                ? validatedData.smtpPassword
                : (existingConfig?.smtpPassword || '')
        };

        // Update or create email config
        const emailConfig = await db.emailConfig.upsert({
            where: { projectId },
            update: data,
            create: {
                ...data,
                projectId,
            },
        });

        // Don't return password in the response
        const { ...safeConfig } = emailConfig;

        return NextResponse.json(safeConfig);
    } catch (error) {
        console.error('Failed to update email configuration:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update email configuration', message: (error as Error).message },
            { status: 500 }
        );
    }
}