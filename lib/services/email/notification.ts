import {isValidElement } from 'react';
import { render } from '@react-email/render';
import { createTransport, SendMailOptions } from 'nodemailer';
import { db } from '@/lib/db';
import { ChangelogEmail } from '@/emails/changelog';
import SMTPTransport from "nodemailer/lib/smtp-transport";

export interface SendEmailParams {
    projectId: string;
    subject?: string;
    changelogEntryId?: string;
    recipients?: string[];
    isDigest?: boolean;
}

export async function sendChangelogEmail(params: SendEmailParams) {
    try {
        const { projectId, subject, changelogEntryId, recipients, isDigest } = params;

        // Get project and email config
        const project = await db.project.findUnique({
            where: { id: projectId },
            include: {
                emailConfig: true,
                changelog: {
                    include: {
                        entries: changelogEntryId
                            ? {
                                where: { id: changelogEntryId },
                                include: { tags: true }
                            }
                            : {
                                orderBy: { createdAt: 'desc' },
                                take: isDigest ? 5 : 1,
                                include: { tags: true }
                            }
                    }
                }
            }
        });

        if (!project?.emailConfig?.enabled) {
            throw new Error('Email notifications are not enabled for this project');
        }

        const { emailConfig } = project;

        // Make sure there are entries to send
        if (project.changelog && !project.changelog.entries.length) {
            throw new Error('No changelog entries found to send');
        }

        // Create transporter
        const transporterOptions: SMTPTransport.Options = {
            host: emailConfig.smtpHost,
            port: emailConfig.smtpPort,
            secure: emailConfig.smtpSecure,
            auth: emailConfig.smtpUser && emailConfig.smtpPassword
                ? {
                    user: emailConfig.smtpUser,
                    pass: emailConfig.smtpPassword,
                }
                : undefined,
            tls: {
                rejectUnauthorized: emailConfig.smtpSecure, // Allow self-signed certificates
            },
        };

        // console.log('SMTP Auth Config:', {
        //     user: emailConfig.smtpUser,
        //     pass: emailConfig.smtpPassword ? '[REDACTED]' : '(empty)',
        //     host: emailConfig.smtpHost,
        //     port: emailConfig.smtpPort,
        // });

        const transporter = createTransport(transporterOptions);

        const emailSubject = subject || emailConfig.defaultSubject || 'New Changelog Updates';

        // Determine recipients
        let emailRecipients: string[] = [];

        if (recipients && recipients.length > 0) {
            emailRecipients = recipients;
        } else {
            throw new Error('No recipients specified');
        }

        // Use the existing entries from the query
        const entries = project.changelog ? project.changelog.entries : [];

        const emailComponent = ChangelogEmail({
            projectName: project.name,
            entries: entries,
            isDigest: isDigest || false
        });

        const html = emailComponent && isValidElement(emailComponent) ? await render(emailComponent, {
            pretty: true
        }) : '';

        const text = emailComponent && isValidElement(emailComponent) ? await render(emailComponent, {
            plainText: true
        }) : '';

        const mailOptions: SendMailOptions = {
            from: `"${emailConfig.fromName || project.name}" <${emailConfig.fromEmail}>`,
            to: emailRecipients.join(', '),
            subject: emailSubject,
            text,
            html,
            replyTo: emailConfig.replyToEmail || undefined,
        };

        const info = await transporter.sendMail(mailOptions);

        await db.emailLog.create({
            data: {
                projectId,
                recipients: emailRecipients,
                subject: emailSubject,
                messageId: info.messageId,
                type: isDigest ? 'DIGEST' : 'SINGLE_UPDATE',
                entryIds: entries.map(e => e.id)
            }
        });

        return {
            success: true,
            messageId: info.messageId,
            recipientCount: emailRecipients.length
        };
    } catch (error) {
        console.error('Failed to send changelog email:', error);
        throw error;
    }
}