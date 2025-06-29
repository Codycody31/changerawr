// app/api/changelog/unsubscribe/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
    params: Promise<{
        token: string
    }>
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { token } = await params
        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('projectId')

        if (!token) {
            return NextResponse.json(
                { error: 'Unsubscribe token is required' },
                { status: 400 }
            )
        }

        // Find subscriber by token
        const subscriber = await db.emailSubscriber.findUnique({
            where: { unsubscribeToken: token },
            include: {
                subscriptions: projectId
                    ? {
                        where: { projectId },
                        include: { project: true }
                    }
                    : { include: { project: true } }
            }
        })

        if (!subscriber) {
            return NextResponse.json(
                { error: 'Invalid unsubscribe token' },
                { status: 404 }
            )
        }

        let customDomain: string | null = null

        if (projectId) {
            // Unsubscribe from specific project
            if (subscriber.subscriptions.length > 0) {
                const subscription = subscriber.subscriptions[0]
                customDomain = subscription.customDomain // Get the custom domain they subscribed from

                await db.projectSubscription.delete({
                    where: { id: subscription.id }
                })
            }
        } else {
            // Unsubscribe from all - use the most recent custom domain or first one found
            if (subscriber.subscriptions.length > 0) {
                // Try to find a subscription with a custom domain
                const subscriptionWithDomain = subscriber.subscriptions.find(sub => sub.customDomain)
                customDomain = subscriptionWithDomain?.customDomain || null

                await db.projectSubscription.deleteMany({
                    where: { subscriberId: subscriber.id }
                })
            }
        }

        // Determine redirect URL - use custom domain if available, otherwise main app domain
        let redirectUrl: string
        if (customDomain) {
            redirectUrl = `https://${customDomain}/unsubscribed?email=${encodeURIComponent(subscriber.email)}`
        } else {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            redirectUrl = `${appUrl}/unsubscribed?email=${encodeURIComponent(subscriber.email)}`
        }

        console.log(`Redirecting unsubscribe to: ${redirectUrl}`)

        return NextResponse.redirect(redirectUrl)
    } catch (error) {
        console.error('Error processing unsubscribe request:', error)
        return NextResponse.json(
            { error: 'Failed to process unsubscribe request' },
            { status: 500 }
        )
    }
}