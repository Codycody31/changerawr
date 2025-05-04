import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { nanoid } from 'nanoid';

/**
 * @method POST
 * @description Development-only endpoint to generate mock subscribers for testing
 * @query projectId - Project ID to create subscribers for
 * @query count - Number of subscribers to generate (default: 20, max: 100)
 */
export async function POST(request: Request) {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
            { error: 'This endpoint is only available in development mode' },
            { status: 403 }
        );
    }

    try {
        // Authentication check
        const user = await validateAuthAndGetUser();
        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Only admins can generate mock data' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        let count = parseInt(searchParams.get('count') || '20');

        // Validate count and limit it to a reasonable number
        count = Math.min(Math.max(1, count), 100);

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        // Verify project exists
        const project = await db.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        // Generate names for mock data
        const firstNames = [
            'John', 'Jane', 'Alex', 'Emma', 'Michael', 'Sarah', 'David', 'Lisa',
            'Robert', 'Maria', 'James', 'Jennifer', 'William', 'Linda', 'Richard',
            'Emily', 'Thomas', 'Jessica', 'Daniel', 'Susan'
        ];

        const lastNames = [
            'Smith', 'Johnson', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
            'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas',
            'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris'
        ];

        // Generate domains for mock emails
        const domains = [
            'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com',
            'protonmail.com', 'icloud.com', 'aol.com', 'mail.com',
            'company.com', 'example.org', 'test.co', 'dev.io'
        ];

        // Subscription types
        const subscriptionTypes = ['ALL_UPDATES', 'MAJOR_ONLY', 'DIGEST_ONLY'];

        // Create batch of subscribers
        const createdSubscribers = [];

        for (let i = 0; i < count; i++) {
            // Generate random mock data
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const domain = domains[Math.floor(Math.random() * domains.length)];
            const subscriptionType = subscriptionTypes[
                Math.floor(Math.random() * subscriptionTypes.length)
                ] as 'ALL_UPDATES' | 'MAJOR_ONLY' | 'DIGEST_ONLY';

            // Random timestamp between 1 and 365 days ago
            const daysAgo = Math.floor(Math.random() * 365) + 1;
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - daysAgo);

            // Random decision if this subscriber has received an email
            const hasReceivedEmail = Math.random() > 0.3;
            const lastEmailDaysAgo = hasReceivedEmail ? Math.floor(Math.random() * daysAgo) : null;
            const lastEmailSentAt = lastEmailDaysAgo
                ? new Date(Date.now() - lastEmailDaysAgo * 24 * 60 * 60 * 1000)
                : null;

            // Create a unique email (avoid duplicates)
            const uniqueSuffix = Math.floor(Math.random() * 10000);
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${uniqueSuffix}@${domain}`;

            try {
                // Check if email already exists
                const existingSubscriber = await db.emailSubscriber.findUnique({
                    where: { email }
                });

                if (existingSubscriber) {
                    // Skip creating this subscriber
                    continue;
                }

                // Create new subscriber
                const subscriber = await db.emailSubscriber.create({
                    data: {
                        email,
                        name: `${firstName} ${lastName}`,
                        unsubscribeToken: nanoid(32),
                        isActive: true,
                        createdAt,
                        lastEmailSentAt,
                        subscriptions: {
                            create: {
                                projectId,
                                subscriptionType
                            }
                        }
                    }
                });

                createdSubscribers.push(subscriber);
            } catch (err) {
                console.error(`Failed to create mock subscriber ${email}:`, err);
                // Continue with the next subscriber
            }
        }

        return NextResponse.json({
            success: true,
            message: `Created ${createdSubscribers.length} mock subscribers for project`,
            count: createdSubscribers.length
        });
    } catch (error) {
        console.error('Error generating mock subscribers:', error);
        return NextResponse.json(
            { error: 'Failed to generate mock subscribers' },
            { status: 500 }
        );
    }
}