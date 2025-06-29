import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

interface SubscribeRequest {
    email: string;
    projectId: string;
    name?: string;
    subscriptionType: 'ALL_UPDATES' | 'MAJOR_ONLY' | 'DIGEST_ONLY';
    customDomain?: string | null; // Allow null values
}

interface SubscribeResponse {
    success: boolean;
    message: string;
}

interface ErrorResponse {
    error: string;
    details?: unknown;
}

/**
 * @method POST
 * @description Creates a subscription for a user to receive email notifications for changelog updates
 */
export async function POST(request: Request): Promise<NextResponse<SubscribeResponse | ErrorResponse>> {
    try {
        const subscribeSchema = z.object({
            email: z.string().email('Invalid email format'),
            projectId: z.string().min(1, 'Project ID is required'),
            name: z.string().optional(),
            subscriptionType: z.enum(['ALL_UPDATES', 'MAJOR_ONLY', 'DIGEST_ONLY']).default('ALL_UPDATES'),
            customDomain: z.string().nullable().optional() // Allow null, undefined, or string
        });

        // Parse and validate request body
        const body = await request.json();
        const { email, projectId, name, subscriptionType, customDomain }: SubscribeRequest = subscribeSchema.parse(body);

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

        // Determine the domain to use - default to app domain if no custom domain provided
        const appDomain = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:3000';
        const finalDomain = customDomain || appDomain; // customDomain can be null, so this will default to appDomain

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
                    isActive: true
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
            // Create new subscription with domain
            await db.projectSubscription.create({
                data: {
                    subscriberId: subscriber.id,
                    projectId,
                    subscriptionType,
                    customDomain: finalDomain // Use finalDomain (either custom or app domain)
                }
            });
        } else {
            // Update existing subscription
            await db.projectSubscription.update({
                where: { id: subscriber.subscriptions[0].id },
                data: {
                    subscriptionType,
                    customDomain: finalDomain // Update domain on existing subscription
                }
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