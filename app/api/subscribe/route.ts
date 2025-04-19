import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

/**
 * @method POST
 * @description Creates a subscription for a user to receive email notifications for changelog updates
 */
export async function POST(request: Request) {
    try {
        const subscribeSchema = z.object({
            email: z.string().email('Invalid email format'),
            projectId: z.string().min(1, 'Project ID is required'),
            name: z.string().optional(),
            subscriptionType: z.enum(['ALL_UPDATES', 'MAJOR_ONLY', 'DIGEST_ONLY']).default('ALL_UPDATES')
        });

        // Parse and validate request body
        const body = await request.json();
        const { email, projectId, name, subscriptionType } = subscribeSchema.parse(body);

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