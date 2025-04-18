import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * @method DELETE
 * @description Removes a subscriber from a project or deletes them entirely
 */
export async function DELETE(
    request: Request,
    { params }: { params: { subscriberId: string } }
) {
    try {
        const { subscriberId } = params;
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!subscriberId) {
            return NextResponse.json(
                { error: 'Subscriber ID is required' },
                { status: 400 }
            );
        }

        // TODO: Add authentication check here

        if (projectId) {
            // Remove from specific project
            await db.projectSubscription.deleteMany({
                where: {
                    subscriberId,
                    projectId
                }
            });
        } else {
            // Remove subscriber entirely (including all subscriptions)
            await db.emailSubscriber.delete({
                where: { id: subscriberId }
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Subscriber removed successfully'
        });
    } catch (error) {
        console.error('Error removing subscriber:', error);
        return NextResponse.json(
            { error: 'Failed to remove subscriber' },
            { status: 500 }
        );
    }
}

/**
 * @method PATCH
 * @description Updates a subscriber's information or subscription preferences
 */
export async function PATCH(
    request: Request,
    { params }: { params: { subscriberId: string } }
) {
    try {
        const { subscriberId } = params;
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        const body = await request.json();

        if (!subscriberId) {
            return NextResponse.json(
                { error: 'Subscriber ID is required' },
                { status: 400 }
            );
        }

        // TODO: Add authentication check here

        // Update subscriber info
        if (body.name !== undefined || body.isActive !== undefined) {
            await db.emailSubscriber.update({
                where: { id: subscriberId },
                data: {
                    ...(body.name !== undefined && { name: body.name }),
                    ...(body.isActive !== undefined && { isActive: body.isActive })
                }
            });
        }

        // Update subscription type if both projectId and subscriptionType are provided
        if (projectId && body.subscriptionType) {
            const subscription = await db.projectSubscription.findFirst({
                where: {
                    subscriberId,
                    projectId
                }
            });

            if (subscription) {
                await db.projectSubscription.update({
                    where: { id: subscription.id },
                    data: { subscriptionType: body.subscriptionType }
                });
            } else {
                await db.projectSubscription.create({
                    data: {
                        subscriberId,
                        projectId,
                        subscriptionType: body.subscriptionType
                    }
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Subscriber updated successfully'
        });
    } catch (error) {
        console.error('Error updating subscriber:', error);
        return NextResponse.json(
            { error: 'Failed to update subscriber' },
            { status: 500 }
        );
    }
}