import { isValidElement } from 'react';
import { render } from '@react-email/render';
import { createTransport, SendMailOptions } from 'nodemailer';
import { db } from '@/lib/db';
import { ChangelogEmail } from '@/emails/changelog';
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { nanoid } from 'nanoid';

export interface SendEmailParams {
    projectId: string;
    subject?: string;
    changelogEntryId?: string;
    recipients?: string[];
    isDigest?: boolean;
    subscriberIds?: string[];
}

export async function sendChangelogEmail(params: SendEmailParams) {
    try {
        const { projectId, subject, changelogEntryId, recipients, isDigest, subscriberIds } = params;

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
                rejectUnauthorized: emailConfig.smtpSecure,
            },
        };

        const transporter = createTransport(transporterOptions);

        const emailSubject = subject || emailConfig.defaultSubject || 'New Changelog Updates';

        // Determine recipients
        let emailRecipients: string[] = [];
        let allSubscriberIds: string[] = [];

        // If specific subscriber IDs are provided, use those
        if (subscriberIds && subscriberIds.length > 0) {
            const subscribers = await db.emailSubscriber.findMany({
                where: {
                    id: { in: subscriberIds },
                    isActive: true,
                    subscriptions: {
                        some: { projectId }
                    }
                }
            });
            emailRecipients = subscribers.map(s => s.email);
            allSubscriberIds = subscribers.map(s => s.id);
        }
        // If direct recipients are provided, use those
        else if (recipients && recipients.length > 0) {
            // Check if any of these recipients are already subscribers
            const existingSubscribers = await db.emailSubscriber.findMany({
                where: {
                    email: { in: recipients },
                }
            });

            const existingEmails = new Set(existingSubscribers.map(s => s.email));
            const newEmails = recipients.filter(email => !existingEmails.has(email));

            // Create subscribers for new emails
            if (newEmails.length > 0) {
                await Promise.all(newEmails.map(async (email) => {
                    const subscriber = await db.emailSubscriber.create({
                        data: {
                            email,
                            unsubscribeToken: nanoid(32),
                            subscriptions: {
                                create: {
                                    projectId,
                                    subscriptionType: 'ALL_UPDATES'
                                }
                            }
                        }
                    });
                    return subscriber;
                }));
            }

            // Fetch all subscribers again to get IDs for tracking
            const allSubscribers = await db.emailSubscriber.findMany({
                where: {
                    email: { in: recipients },
                }
            });

            emailRecipients = recipients;
            allSubscriberIds = allSubscribers.map(s => s.id);
        } else {
            throw new Error('No recipients specified');
        }

        // Use the existing entries from the query
        const entries = project.changelog ? project.changelog.entries : [];

        // Generate unsubscribe URLs for each subscriber
        const subscriberMap = await db.emailSubscriber.findMany({
            where: {
                id: { in: allSubscriberIds }
            },
            select: {
                id: true,
                email: true,
                unsubscribeToken: true
            }
        });

        // Get the app URL from environment
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Process each email individually with custom unsubscribe link
        const emailPromises = emailRecipients.map(async (email) => {
            const subscriber = subscriberMap.find(s => s.email === email);
            const unsubscribeUrl = subscriber
                ? `${appUrl}/api/subscribers/unsubscribe/${subscriber.unsubscribeToken}?projectId=${projectId}`
                : `${appUrl}/unsubscribe?email=${encodeURIComponent(email)}&projectId=${projectId}`;

            const emailComponent = ChangelogEmail({
                projectName: project.name,
                entries: entries,
                isDigest: isDigest || false,
                unsubscribeUrl
            });

            const html = emailComponent && isValidElement(emailComponent) ? await render(emailComponent, {
                pretty: true
            }) : '';

            const text = emailComponent && isValidElement(emailComponent) ? await render(emailComponent, {
                plainText: true
            }) : '';

            const mailOptions: SendMailOptions = {
                from: `"${emailConfig.fromName || project.name}" <${emailConfig.fromEmail}>`,
                to: email,
                subject: emailSubject,
                text,
                html,
                replyTo: emailConfig.replyToEmail || undefined,
                headers: {
                    'List-Unsubscribe': `<${unsubscribeUrl}>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
                }
            };

            return transporter.sendMail(mailOptions);
        });

        // Send all emails
        const results = await Promise.all(emailPromises);

        // Update last sent time for subscribers
        if (allSubscriberIds.length > 0) {
            await db.emailSubscriber.updateMany({
                where: { id: { in: allSubscriberIds } },
                data: { lastEmailSentAt: new Date() }
            });
        }

        // Create email log
        await db.emailLog.create({
            data: {
                projectId,
                recipients: emailRecipients,
                subject: emailSubject,
                messageId: results[0]?.messageId || '',
                type: isDigest ? 'DIGEST' : 'SINGLE_UPDATE',
                entryIds: entries.map(e => e.id),
            }
        });

        return {
            success: true,
            messageId: results[0]?.messageId || '',
            recipientCount: emailRecipients.length
        };
    } catch (error) {
        console.error('Failed to send changelog email:', error);
        throw error;
    }
}

// Add function to manage subscriptions
export async function manageSubscription({
                                             email,
                                             projectId,
                                             subscriptionType,
                                             unsubscribe = false
                                         }: {
    email: string;
    projectId: string;
    subscriptionType?: 'ALL_UPDATES' | 'MAJOR_ONLY' | 'DIGEST_ONLY';
    unsubscribe?: boolean;
}) {
    // Check if project exists
    const project = await db.project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        throw new Error('Project not found');
    }

    // Find or create subscriber
    let subscriber = await db.emailSubscriber.findUnique({
        where: { email },
        include: {
            subscriptions: {
                where: { projectId }
            }
        }
    });

    if (!subscriber) {
        subscriber = await db.emailSubscriber.create({
            data: {
                email,
                unsubscribeToken: nanoid(32),
            },
            include: {
                subscriptions: {
                    where: { projectId }
                }
            }
        });
    }

    // If unsubscribing, remove the subscription
    if (unsubscribe) {
        if (subscriber.subscriptions.length > 0) {
            await db.projectSubscription.delete({
                where: {
                    id: subscriber.subscriptions[0].id
                }
            });
        }
        return { success: true, message: 'Unsubscribed successfully' };
    }

    // If subscribing or updating subscription
    if (subscriptionType) {
        if (subscriber.subscriptions.length > 0) {
            // Update existing subscription
            await db.projectSubscription.update({
                where: {
                    id: subscriber.subscriptions[0].id
                },
                data: {
                    subscriptionType
                }
            });
        } else {
            // Create new subscription
            await db.projectSubscription.create({
                data: {
                    projectId,
                    subscriberId: subscriber.id,
                    subscriptionType
                }
            });
        }
    }

    return { success: true, message: 'Subscription updated successfully' };
}