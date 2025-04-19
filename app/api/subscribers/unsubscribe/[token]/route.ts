import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = request.nextUrl.pathname.split('/').pop(); // Extract token from URL
        const projectId = searchParams.get('projectId');

        if (!token) {
            return NextResponse.json(
                { error: 'Unsubscribe token is required' },
                { status: 400 }
            );
        }

        // Find subscriber by token
        const subscriber = await db.emailSubscriber.findUnique({
            where: { unsubscribeToken: token },
            include: {
                subscriptions: projectId
                    ? { where: { projectId } }
                    : true
            }
        });

        if (!subscriber) {
            return NextResponse.json(
                { error: 'Invalid unsubscribe token' },
                { status: 404 }
            );
        }

        if (projectId) {
            // Unsubscribe from specific project
            if (subscriber.subscriptions.length > 0) {
                await db.projectSubscription.delete({
                    where: {
                        id: subscriber.subscriptions[0].id
                    }
                });
            }
        } else {
            // Unsubscribe from all
            if (subscriber.subscriptions.length > 0) {
                await db.projectSubscription.deleteMany({
                    where: {
                        subscriberId: subscriber.id
                    }
                });
            }
        }

        // Redirect to unsubscribe confirmation page
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return NextResponse.redirect(`${appUrl}/unsubscribed?email=${encodeURIComponent(subscriber.email)}`);
    } catch (error) {
        console.error('Error processing unsubscribe request:', error);
        return NextResponse.json(
            { error: 'Failed to process unsubscribe request' },
            { status: 500 }
        );
    }
}