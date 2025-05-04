// app/api/admin/config/system-email/route.ts
import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createTransport } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

// Validation schema for system email settings
const systemEmailSchema = z.object({
    enablePasswordReset: z.boolean(),
    smtpHost: z.string().min(1, 'SMTP host is required'),
    smtpPort: z.coerce.number().int().min(1).max(65535),
    smtpUser: z.string().optional().nullable(),
    smtpPassword: z.string().optional().nullable(),
    smtpSecure: z.boolean().default(true),
    systemEmail: z.string().email('Invalid email address'),
});

/**
 * @method GET
 * @description Retrieves the system email configuration
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "enablePasswordReset": { "type": "boolean" },
 *     "smtpHost": { "type": "string" },
 *     "smtpPort": { "type": "number" },
 *     "smtpUser": { "type": "string" },
 *     "smtpSecure": { "type": "boolean" },
 *     "systemEmail": { "type": "string" }
 *   }
 * }
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 500 An unexpected error occurred while fetching system email configuration
 */
export async function GET() {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Not authorized' },
                { status: 403 }
            );
        }

        const config = await db.systemConfig.findFirst({
            where: { id: 1 },
            select: {
                enablePasswordReset: true,
                smtpHost: true,
                smtpPort: true,
                smtpUser: true,
                smtpSecure: true,
                systemEmail: true
            }
        });

        if (!config) {
            // Return default configuration if none exists
            return NextResponse.json({
                enablePasswordReset: false,
                smtpHost: '',
                smtpPort: 587,
                smtpUser: '',
                smtpSecure: true,
                systemEmail: ''
            });
        }

        // Don't return password in the response for security reasons
        return NextResponse.json(config);
    } catch (error) {
        console.error('Error fetching system email configuration:', error);
        return NextResponse.json(
            { error: 'Failed to fetch system email configuration' },
            { status: 500 }
        );
    }
}

/**
 * @method POST
 * @description Updates the system email configuration
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "enablePasswordReset": { "type": "boolean" },
 *     "smtpHost": { "type": "string" },
 *     "smtpPort": { "type": "number" },
 *     "smtpUser": { "type": "string" },
 *     "smtpPassword": { "type": "string" },
 *     "smtpSecure": { "type": "boolean" },
 *     "systemEmail": { "type": "string" }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "message": { "type": "string" }
 *   }
 * }
 * @error 400 Invalid input - Validation error
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 500 An unexpected error occurred while updating system email configuration
 */
export async function POST(request: Request) {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Not authorized' },
                { status: 403 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = systemEmailSchema.parse(body);

        // Check if config exists
        const existingConfig = await db.systemConfig.findFirst({
            where: { id: 1 }
        });

        // Prepare data for update or create
        const data = {
            ...validatedData,
            // Handle null/empty values for optional fields
            smtpUser: validatedData.smtpUser || '',
            // Handle password update logic:
            // - If password is provided in the request, use it
            // - If not and there's an existing password, keep it
            // - Otherwise use empty string
            smtpPassword: validatedData.smtpPassword
                ? validatedData.smtpPassword
                : (existingConfig?.smtpPassword || '')
        };

        // Update or create system config
        await db.systemConfig.upsert({
            where: { id: 1 },
            update: data,
            create: {
                id: 1,
                ...data,
                // Set default values for other required fields
                defaultInvitationExpiry: 7,
                requireApprovalForChangelogs: true,
                maxChangelogEntriesPerProject: 100,
                enableAnalytics: true,
                enableNotifications: true
            }
        });

        return NextResponse.json({
            success: true,
            message: 'System email configuration updated successfully'
        });
    } catch (error) {
        console.error('Failed to update system email configuration:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update system email configuration' },
            { status: 500 }
        );
    }
}

/**
 * @method POST
 * @description Tests the system email configuration by sending a test email
 * @path /api/admin/config/system-email/test
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "smtpHost": { "type": "string" },
 *     "smtpPort": { "type": "number" },
 *     "smtpUser": { "type": "string" },
 *     "smtpPassword": { "type": "string" },
 *     "smtpSecure": { "type": "boolean" },
 *     "systemEmail": { "type": "string" },
 *     "testEmail": { "type": "string" }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "message": { "type": "string" }
 *   }
 * }
 * @error 400 Invalid input - Validation error
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 500 An unexpected error occurred while testing system email configuration
 */
export async function PATCH(request: Request) {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Not authorized' },
                { status: 403 }
            );
        }

        // Parse and validate request body for test email
        const body = await request.json();
        const testEmailSchema = systemEmailSchema.extend({
            testEmail: z.string().email('Invalid test email address')
        });

        const validatedData = testEmailSchema.parse(body);

        // Set up transporter for test
        const transporterOptions: SMTPTransport.Options = {
            host: validatedData.smtpHost,
            port: validatedData.smtpPort,
            secure: validatedData.smtpSecure,
            auth: validatedData.smtpUser
                ? {
                    user: validatedData.smtpUser,
                    pass: validatedData.smtpPassword || ''
                }
                : undefined,
            tls: {
                rejectUnauthorized: validatedData.smtpSecure,
            }
        };

        const transporter = createTransport(transporterOptions);

        // Send test email
        await transporter.sendMail({
            from: `"Changerawr System" <${validatedData.systemEmail}>`,
            to: validatedData.testEmail,
            subject: "Test Email from Changerawr System",
            text: "This is a test email from the Changerawr system email configuration.",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #333;">Test Email from Changerawr System</h1>
                    <p>This is a test email from the Changerawr system email configuration.</p>
                    <p>If you're receiving this, the SMTP configuration is working correctly.</p>
                    <hr style="border: 1px solid #eee; margin: 20px 0;" />
                    <p style="color: #666; font-size: 12px;">This is an automated test email.</p>
                </div>
            `
        });

        return NextResponse.json({
            success: true,
            message: 'Test email sent successfully'
        });
    } catch (error) {
        console.error('Failed to test system email configuration:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to send test email',
                error: errorMessage
            },
            { status: 500 }
        );
    }
}