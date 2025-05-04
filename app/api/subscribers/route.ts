import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';

/**
 * @method POST
 * @description Creates or updates a subscription for a user to receive email notifications for a project
 */
export async function POST(request: Request) {
    try {
        const subscriberSchema = z.object({
            email: z.string().email('Invalid email format'),
            projectId: z.string().min(1, 'Project ID is required'),
            name: z.string().optional(),
            subscriptionType: z.enum(['ALL_UPDATES', 'MAJOR_ONLY', 'DIGEST_ONLY']).default('ALL_UPDATES')
        });

        // Parse and validate request body
        const body = await request.json();
        const { email, projectId, name, subscriptionType } = subscriberSchema.parse(body);

        // Verify project exists and is public
        const project = await db.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
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
            // Create new subscriber
            subscriber = await db.emailSubscriber.create({
                data: {
                    email,
                    name,
                    unsubscribeToken: nanoid(32),
                    isActive: true,
                },
                include: {
                    subscriptions: {
                        where: { projectId }
                    }
                }
            });
        } else if (name && !subscriber.name) {
            // Update subscriber name if provided and not set before
            await db.emailSubscriber.update({
                where: { id: subscriber.id },
                data: { name }
            });
        }

        // Create or update subscription
        if (subscriber.subscriptions.length === 0) {
            // Create new subscription
            await db.projectSubscription.create({
                data: {
                    subscriberId: subscriber.id,
                    projectId,
                    subscriptionType
                }
            });
        } else {
            // Update existing subscription
            await db.projectSubscription.update({
                where: { id: subscriber.subscriptions[0].id },
                data: { subscriptionType }
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Subscription created successfully'
        });
    } catch (error) {
        console.error('Error creating subscription:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create subscription' },
            { status: 500 }
        );
    }
}

/**
 * @method GET
 * @description List subscribers for a project with pagination and search functionality
 * @query projectId - Project ID to fetch subscribers for
 * @query page - Page number (default: 1)
 * @query limit - Results per page (default: 10)
 * @query search - Optional search term for email or name
 */
export async function GET(request: Request) {
    try {
        // Authentication check
        await validateAuthAndGetUser();

        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';

        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
                { status: 400 }
            );
        }

        // Make sure values are valid
        const validPage = Math.max(1, page);
        const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 per page
        const skip = (validPage - 1) * validLimit;

        // Build search conditions
        const searchCondition = search
            ? {
                OR: [
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { name: { contains: search, mode: 'insensitive' as const } }
                ]
            }
            : {};

        // Query with pagination and search
        const [subscribers, totalCount] = await Promise.all([
            db.emailSubscriber.findMany({
                where: {
                    ...searchCondition,
                    subscriptions: {
                        some: { projectId }
                    },
                    isActive: true
                },
                include: {
                    subscriptions: {
                        where: { projectId }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: validLimit
            }),
            db.emailSubscriber.count({
                where: {
                    ...searchCondition,
                    subscriptions: {
                        some: { projectId }
                    },
                    isActive: true
                }
            })
        ]);

        // Format response
        return NextResponse.json({
            subscribers: subscribers.map(s => ({
                id: s.id,
                email: s.email,
                name: s.name,
                subscriptionType: s.subscriptions[0]?.subscriptionType || 'ALL_UPDATES',
                createdAt: s.createdAt,
                lastEmailSentAt: s.lastEmailSentAt
            })),
            page: validPage,
            limit: validLimit,
            totalCount,
            totalPages: Math.ceil(totalCount / validLimit)
        });
    } catch (error) {
        console.error('Error fetching subscribers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscribers' },
            { status: 500 }
        );
    }
}