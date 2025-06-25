import { isValidElement } from 'react';
import { render } from '@react-email/render';
import { createTransport, SendMailOptions } from 'nodemailer';
import { db } from '@/lib/db';
import { ChangelogEmail } from '@/emails/changelog';
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { nanoid } from 'nanoid';
import ApprovalNotificationEmail from "@/emails/approval-notification";
import RejectionNotificationEmail from "@/emails/rejection-notification";

export interface SendEmailParams {
    projectId: string;
    subject?: string;
    changelogEntryId?: string;
    recipients?: string[];
    isDigest?: boolean;
    subscriberIds?: string[];
    customDomain?: string;  // custom domain (optional)
}

export interface EmailResult {
    success: boolean;
    messageId: string;
    recipientCount: number;
}

interface NotificationRequestInfo {
    type: string;
    projectName: string;
    entryTitle?: string;
    adminName?: string;
}

interface SendNotificationParams {
    userId: string;
    status: 'APPROVED' | 'REJECTED' | 'PENDING';
    request: NotificationRequestInfo;
    dashboardUrl: string;
}

interface SubscriberWithSubscriptions {
    id: string;
    email: string;
    name: string | null;
    unsubscribeToken: string;
    subscriptions: Array<{
        customDomain: string | null;
    }>;
}

interface ManageSubscriptionParams {
    email: string;
    projectId: string;
    subscriptionType?: 'ALL_UPDATES' | 'MAJOR_ONLY' | 'DIGEST_ONLY';
    unsubscribe?: boolean;
}

interface SubscriptionResult {
    success: boolean;
    message: string;
}

/**
 * Sends changelog emails to specified recipients or subscribers
 */
export async function sendChangelogEmail(params: SendEmailParams): Promise<EmailResult> {
    try {
        const { projectId, subject, changelogEntryId, recipients, isDigest, subscriberIds, customDomain } = params;

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
        if (!project.changelog || !project.changelog.entries.length) {
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
        const finalSubscriberIds: string[] = [];

        // Process direct recipients if provided
        if (recipients && recipients.length > 0) {
            emailRecipients = [...recipients];

            // Check if any of these recipients are already subscribers
            const existingSubscribers = await db.emailSubscriber.findMany({
                where: {
                    email: { in: recipients },
                },
                select: {
                    id: true,
                    email: true
                }
            });

            const existingEmails = new Set(existingSubscribers.map(s => s.email));
            const newEmails = recipients.filter(email => !existingEmails.has(email));

            // Create subscribers for new emails
            if (newEmails.length > 0) {
                const newSubscribers = await Promise.all(newEmails.map(async (email) => {
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
                        },
                        select: {
                            id: true
                        }
                    });
                    return subscriber;
                }));

                // Track new subscriber IDs
                const newSubscriberIds = newSubscribers.map(s => s.id);
                finalSubscriberIds.push(...newSubscriberIds);
            }

            // Add existing subscriber IDs
            finalSubscriberIds.push(...existingSubscribers.map(s => s.id));
        }

        // Add explicitly specified subscribers
        if (subscriberIds && subscriberIds.length > 0) {
            const existingSubscriberIds = new Set(finalSubscriberIds);
            // Add only new subscriber IDs (avoid duplicates)
            subscriberIds.forEach(id => {
                if (!existingSubscriberIds.has(id)) {
                    finalSubscriberIds.push(id);
                }
            });
        }

        // If sending to subscribers, get their emails
        if (finalSubscriberIds.length > 0) {
            const subscribers = await db.emailSubscriber.findMany({
                where: {
                    id: { in: finalSubscriberIds },
                    isActive: true
                },
                select: {
                    id: true,
                    email: true,
                    unsubscribeToken: true
                }
            });

            // Add subscriber emails to recipients
            subscribers.forEach(subscriber => {
                if (!emailRecipients.includes(subscriber.email)) {
                    emailRecipients.push(subscriber.email);
                }
            });
        }

        // Ensure we have recipients to send to
        if (emailRecipients.length === 0) {
            throw new Error('No recipients to send to');
        }

        // Use the existing entries from the query
        const entries = project.changelog ? project.changelog.entries : [];

        // Get subscriber details with subscriptions - FIXED: using include only
        const subscriberMap: SubscriberWithSubscriptions[] = await db.emailSubscriber.findMany({
            where: {
                id: { in: finalSubscriberIds }
            },
            include: {
                subscriptions: {
                    where: { projectId },
                    select: { customDomain: true }
                }
            }
        });

        // Get the app URL from environment
        const baseUrl = customDomain
            ? `https://${customDomain}`
            : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Process each email individually with custom unsubscribe link
        const emailPromises = emailRecipients.map(async (email) => {
            const subscriber = subscriberMap.find(s => s.email === email);

            // Determine which domain to use for unsubscribe
            let unsubscribeBaseUrl = baseUrl;
            if (!customDomain && subscriber?.subscriptions?.[0]?.customDomain) {
                unsubscribeBaseUrl = `https://${subscriber.subscriptions[0].customDomain}`;
            }

            const unsubscribeUrl = subscriber
                ? `${unsubscribeBaseUrl}/api/changelog/unsubscribe/${subscriber.unsubscribeToken}?projectId=${projectId}`
                : `${unsubscribeBaseUrl}/unsubscribe?email=${encodeURIComponent(email)}&projectId=${projectId}`;

            // Generate the changelog URL based on domain
            const changelogUrl = customDomain
                ? `https://${customDomain}`
                : subscriber?.subscriptions?.[0]?.customDomain
                    ? `https://${subscriber.subscriptions[0].customDomain}`
                    : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/projects/${projectId}`;

            // Pass custom domain and changelog URL to email template
            const emailComponent = ChangelogEmail({
                projectName: project.name,
                entries: entries,
                isDigest: isDigest || false,
                unsubscribeUrl,
                recipientName: subscriber?.name || undefined,
                recipientEmail: email,
                customDomain: customDomain || subscriber?.subscriptions?.[0]?.customDomain || undefined,
                changelogUrl
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
        if (finalSubscriberIds.length > 0) {
            await db.emailSubscriber.updateMany({
                where: { id: { in: finalSubscriberIds } },
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

/**
 * Sends a notification email to a user about request status
 */
export async function sendNotificationEmail({
                                                userId,
                                                status,
                                                request,
                                                dashboardUrl
                                            }: SendNotificationParams): Promise<boolean> {
    try {
        // Get user details
        const user = await db.user.findUnique({
            where: { id: userId },
            include: { settings: true }
        });

        if (!user || (user.settings?.enableNotifications === false)) {
            return false; // User doesn't want notifications
        }

        // Get system email settings
        const systemConfig = await db.systemConfig.findFirst({
            where: { id: 1 }
        });

        if (!systemConfig || !systemConfig.systemEmail || !systemConfig.smtpHost) {
            console.error('System email not configured for notifications');
            return false;
        }

        // Set up transport
        const transporterOptions: SMTPTransport.Options = {
            host: systemConfig.smtpHost,
            port: systemConfig.smtpPort || 587,
            secure: !!systemConfig.smtpSecure,
            auth: systemConfig.smtpUser && systemConfig.smtpPassword
                ? {
                    user: systemConfig.smtpUser,
                    pass: systemConfig.smtpPassword,
                }
                : undefined,
            tls: {
                rejectUnauthorized: !!systemConfig.smtpSecure,
            },
        };

        const transporter = createTransport(transporterOptions);

        // Choose the right email template
        const emailProps = {
            recipientName: user.name || undefined,
            projectName: request.projectName,
            requestType: request.type,
            entryTitle: request.entryTitle,
            adminName: request.adminName || 'an administrator',
            dashboardUrl
        };

        // Use the appropriate email template based on status
        const emailComponent = status === 'APPROVED'
            ? ApprovalNotificationEmail(emailProps)
            : RejectionNotificationEmail(emailProps);

        // Render the email
        const html = isValidElement(emailComponent)
            ? await render(emailComponent, { pretty: true })
            : '';

        const text = isValidElement(emailComponent)
            ? await render(emailComponent, { plainText: true })
            : '';

        // Set the subject based on status
        const subject = status === 'APPROVED'
            ? `Request Approved for ${request.projectName}`
            : `Request Not Approved for ${request.projectName}`;

        // Send the email
        const mailOptions: SendMailOptions = {
            from: `"Changerawr Notifications" <${systemConfig.systemEmail}>`,
            to: user.email,
            subject,
            html,
            text,
        };

        const result = await transporter.sendMail(mailOptions);

        // Log the notification
        await db.auditLog.create({
            data: {
                action: 'NOTIFICATION_SENT',
                userId,
                details: {
                    notificationType: 'email',
                    subject,
                    status,
                    requestType: request.type,
                    projectName: request.projectName,
                    messageId: result.messageId,
                    timestamp: new Date().toISOString()
                }
            }
        });

        return true;
    } catch (error) {
        console.error('Failed to send notification email:', error);
        return false;
    }
}

/**
 * Manages subscriptions for users
 */
export async function manageSubscription({
                                             email,
                                             projectId,
                                             subscriptionType,
                                             unsubscribe = false
                                         }: ManageSubscriptionParams): Promise<SubscriptionResult> {
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