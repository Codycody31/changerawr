import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { RequestStatus } from '@/lib/types/changelog';

export async function PATCH(request: Request, context: { params?: { requestId?: string } }) {
    try {
        console.log('Received PATCH request:', { context });

        // Validate requestId from params
        if (!context.params || !context.params.requestId) {
            console.error('Missing requestId in params:', context.params);
            return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
        }

        const { requestId } = context.params;
        console.log('Processing requestId:', requestId);

        // Parse request body
        const body = await request.json().catch((err) => {
            console.error('Failed to parse request body:', err);
            return null;
        });

        if (!body || !body.status) {
            console.error('Invalid or missing status in request body:', body);
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { status } = body as { status: RequestStatus };
        console.log('Updating request status:', { requestId, status });

        // Update the request in the database
        const updatedRequest = await db.changelogRequest.update({
            where: { id: requestId },
            data: { status },
        });

        console.log('Request updated successfully:', updatedRequest);

        return NextResponse.json(updatedRequest);
    } catch (error) {
        console.error('Unexpected error processing request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
