// app/api/subscribers/[subscriberId]/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';

// Validation schema for subscriber updates
const updateSubscriberSchema = z.object({
    name: z.string().optional(),
    isActive: z.boolean().optional(),
    subscriptionType: z.enum(['ALL_UPDATES', 'MAJOR_ONLY', 'DIGEST_ONLY']).optional(),
});

/**
 * @method PATCH
 * @description Updates a subscriber's information or subscription preferences
 */
export async function PATCH(
    request: Request,
    context: { params: Promise<{ subscriberId: string }> }
): Promise<Response> {
    try {
        // Authentication check
        await validateAuthAndGetUser();

        const { subscriberId } = await context.params;
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const body = await request.json();

        // Validate input
        const validatedData = updateSubscriberSchema.parse(body);

        if (!subscriberId) {
            return NextResponse.json(
                { error: 'Subscriber ID is required' },
                { status: 400 }
            );
        }

        // Check if subscriber exists
        const subscriber = await db.emailSubscriber.findUnique({
            where: { id: subscriberId },
            include: {
                subscriptions: projectId
                    ? { where: { projectId } }
                    : undefined,
            },
        });

        if (!subscriber) {
            return NextResponse.json(
                { error: 'Subscriber not found' },
                { status: 404 }
            );
        }

        // Start transaction for related updates
        return await db.$transaction(async (tx) => {
            // Update subscriber info
            if (validatedData.name !== undefined || validatedData.isActive !== undefined) {
                await tx.emailSubscriber.update({
                    where: { id: subscriberId },
                    data: {
                        ...(validatedData.name !== undefined && { name: validatedData.name }),
                        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
                    },
                });
            }

            // Update subscription type if both projectId and subscriptionType are provided
            if (projectId && validatedData.subscriptionType) {
                const subscription = subscriber.subscriptions?.[0];

                if (subscription) {
                    await tx.projectSubscription.update({
                        where: { id: subscription.id },
                        data: { subscriptionType: validatedData.subscriptionType },
                    });
                } else {
                    await tx.projectSubscription.create({
                        data: {
                            subscriberId,
                            projectId,
                            subscriptionType: validatedData.subscriptionType,
                        },
                    });
                }
            }

            return NextResponse.json({
                success: true,
                message: 'Subscriber updated successfully',
            });
        });
    } catch (error) {
        console.error('Error updating subscriber:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update subscriber' },
            { status: 500 }
        );
    }
}

/**
 * @method DELETE
 * @description Removes a subscriber from a project or deletes them entirely
 */
export async function DELETE(
    request: Request,
    context: { params: Promise<{ subscriberId: string }> }
): Promise<Response> {
    try {
        // Authentication check
        await validateAuthAndGetUser();

        const { subscriberId } = await context.params;
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!subscriberId) {
            return NextResponse.json(
                { error: 'Subscriber ID is required' },
                { status: 400 }
            );
        }

        // Check if subscriber exists
        const subscriber = await db.emailSubscriber.findUnique({
            where: { id: subscriberId },
            include: {
                subscriptions: true,
            },
        });

        if (!subscriber) {
            return NextResponse.json(
                { error: 'Subscriber not found' },
                { status: 404 }
            );
        }

        if (projectId) {
            // Remove from specific project
            const subscription = subscriber.subscriptions.find(
                (sub) => sub.projectId === projectId
            );

            if (subscription) {
                await db.projectSubscription.delete({
                    where: { id: subscription.id },
                });
            } else {
                return NextResponse.json(
                    { error: 'Subscription not found for this project' },
                    { status: 404 }
                );
            }
        } else {
            // Remove subscriber entirely (including all subscriptions)
            await db.emailSubscriber.delete({
                where: { id: subscriberId },
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Subscriber removed successfully',
        });
    } catch (error) {
        console.error('Error removing subscriber:', error);
        return NextResponse.json(
            { error: 'Failed to remove subscriber' },
            { status: 500 }
        );
    }
}
