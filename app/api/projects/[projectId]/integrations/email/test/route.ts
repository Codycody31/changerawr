// app/api/projects/[projectId]/integrations/email/test/route.ts
import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

// Validation schema for test request
const testSchema = z.object({
    smtpHost: z.string().min(1, 'SMTP host is required'),
    smtpPort: z.number().int().min(1).max(65535),
    smtpUser: z.string().optional().nullable(),
    smtpPassword: z.string().optional().nullable(),
    smtpSecure: z.boolean().default(false), // Default to false for local testing
    fromEmail: z.string().email('Invalid email address'),
    testEmail: z.string().email('Invalid test email address'),
});

/**
 * @method POST
 * @description Tests SMTP connection and sends a test email
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
        const validatedData = testSchema.parse(body);

        // Log the input values for debugging
        console.log('Email test configuration:', {
            host: validatedData.smtpHost,
            port: validatedData.smtpPort,
            secure: validatedData.smtpSecure,
            user: validatedData.smtpUser || '(none)',
            password: validatedData.smtpPassword ? '(provided)' : '(empty)'
        });

        // Create a transporter with correct typing for local test servers
        const transportConfig: SMTPTransport.Options = {
            host: validatedData.smtpHost,
            port: validatedData.smtpPort,
            // Force secure to false for local testing regardless of the input
            secure: false,
            // Configure TLS options to avoid certificate validation issues
            tls: {
                // Disable certificate validation for testing
                rejectUnauthorized: false
            },
            // Disable STARTTLS for localhost test servers that don't support it
            ignoreTLS: true,
            // Set connection timeout to a lower value to fail faster
            connectionTimeout: 5000
        };

        // Only add authentication if username is provided
        if (validatedData.smtpUser && validatedData.smtpUser.trim() !== '') {
            transportConfig.auth = {
                user: validatedData.smtpUser,
                pass: validatedData.smtpPassword || ''
            };
        }

        console.log('Final transport configuration:', JSON.stringify(transportConfig, null, 2));

        const transporter = nodemailer.createTransport(transportConfig);

        try {
            // Add debug logging
            console.log('Verifying connection...');

            // Test the connection
            await transporter.verify();
            console.log('Connection verified successfully');

            // Send a test email
            console.log('Sending test email...');
            const info = await transporter.sendMail({
                from: `"${project.name}" <${validatedData.fromEmail}>`,
                to: validatedData.testEmail,
                subject: "Test Email from Changerawr",
                text: `This is a test email from Changerawr for project ${project.name}.`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #333;">Test Email from Changerawr</h1>
                    <p>This is a test email from the Changerawr changelog system.</p>
                    <p>Project: <strong>${project.name}</strong></p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;" />
                    <p style="color: #666; font-size: 12px;">This email was sent to verify your SMTP configuration.</p>
                  </div>
                `,
            });

            console.log('Test email sent:', info.messageId);

            // Update the last tested timestamp and status
            await db.emailConfig.upsert({
                where: { projectId },
                update: {
                    lastTestedAt: new Date(),
                    testStatus: 'success',
                },
                create: {
                    projectId,
                    enabled: false,
                    smtpHost: validatedData.smtpHost,
                    smtpPort: validatedData.smtpPort,
                    smtpUser: validatedData.smtpUser || '',
                    smtpPassword: validatedData.smtpPassword || '',
                    smtpSecure: false, // Force save as false for local testing
                    fromEmail: validatedData.fromEmail,
                    lastTestedAt: new Date(),
                    testStatus: 'success',
                },
            });

            return NextResponse.json({
                success: true,
                message: 'Connection successful and test email sent',
                messageId: info.messageId,
            });

        } catch (error) {
            console.error('Email test error:', error);

            // Update test status with error message
            await db.emailConfig.upsert({
                where: { projectId },
                update: {
                    lastTestedAt: new Date(),
                    testStatus: error instanceof Error ? `failed: ${error.message}` : 'failed: unknown error',
                },
                create: {
                    projectId,
                    enabled: false,
                    smtpHost: validatedData.smtpHost,
                    smtpPort: validatedData.smtpPort,
                    smtpUser: validatedData.smtpUser || '',
                    smtpPassword: validatedData.smtpPassword || '',
                    smtpSecure: false, // Force save as false
                    fromEmail: validatedData.fromEmail,
                    lastTestedAt: new Date(),
                    testStatus: error instanceof Error ? `failed: ${error.message}` : 'failed: unknown error',
                },
            });

            return NextResponse.json({
                success: false,
                message: 'Failed to connect or send test email',
                error: (error as Error).message,
                stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
                // Add additional troubleshooting info
                troubleshooting: [
                    "1. Make sure your mail server is running",
                    "2. Try using port 25 instead of 2525 if your server runs on a different port",
                    "3. Check if the mail server requires SSL/TLS",
                    "4. Verify the username format is correct for your mail server"
                ]
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Failed to test email connection:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to test email connection', message: (error as Error).message },
            { status: 500 }
        );
    }
}