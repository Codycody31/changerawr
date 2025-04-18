// app/api/projects/[projectId]/integrations/email/send/route.ts
import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { z } from 'zod';
import { sendChangelogEmail } from '@/lib/services/email/notification';

// Validation schema for send email request
const sendEmailSchema = z.object({
    recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient is required'),
    subject: z.string().optional(),
    changelogEntryId: z.string().optional(),
    isDigest: z.boolean().default(false),
});

/**
 * @method POST
 * @description Sends a changelog email to specified recipients
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
            include: { emailConfig: true }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (!project.emailConfig || !project.emailConfig.enabled) {
            return NextResponse.json({
                error: 'Email notifications are not properly configured or enabled for this project'
            }, { status: 400 });
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = sendEmailSchema.parse(body);

        // Send the email using our service
        const result = await sendChangelogEmail({
            projectId,
            subject: validatedData.subject,
            changelogEntryId: validatedData.changelogEntryId,
            recipients: validatedData.recipients,
            isDigest: validatedData.isDigest
        });

        return NextResponse.json({
            success: true,
            message: `Email sent successfully to ${result.recipientCount} recipients`,
            messageId: result.messageId
        });
    } catch (error) {
        console.error('Failed to send changelog email:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: 'Failed to send changelog email',
                message: (error instanceof Error) ? error.message : 'Unknown error',
                stack: process.env.NODE_ENV === 'development' && (error instanceof Error) ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}