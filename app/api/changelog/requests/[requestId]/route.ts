import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { changelogRequestService } from '@/lib/services/request/changelog-request';

// Schema validation
const updateRequestSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    timestamp: z.string().optional()
});

/**
 * @method PATCH
 * @description Updates the status of a changelog request
 * @query {
 *   requestId: String, required
 * }
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "status": { "type": "string", "enum": ["APPROVED", "REJECTED"] },
 *     "timestamp": { "type": "string", "format": "date-time" },
 *     "adminId": { "type": "string" }
 *   },
 *   "required": [
 *     "status"
 *   ],
 *   "additionalProperties": false
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "title": { "type": "string" },
 *     "content": { "type": "string" },
 *     "version": { "type": "number" },
 *     "status": { "type": "string", "enum": ["PENDING", "APPROVED", "REJECTED"] },
 *     "createdAt": { "type": "string", "format": "date-time" },
 *     "changelogId": { "type": "string" },
 *     "adminId": { "type": "string" }
 *   }
 * }
 * @error 400 Invalid request data
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 404 Request not found
 * @error 500 An unexpected error occurred while processing the request
 */
export async function PATCH(
    req: Request,
    context: { params: { requestId: string } }
) {
    console.log('=== Processing PATCH Request ===');

    try {
        // Get and validate requestId
        const { requestId } = await (async () => context.params)();
        console.log('RequestId:', requestId);

        if (!requestId) {
            console.log('Missing requestId in params');
            return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
        }

        // Validate auth
        const user = await validateAuthAndGetUser();
        console.log('User:', { id: user.id, role: user.role });

        if (user.role !== 'ADMIN') {
            console.log('Non-admin user attempted to process request');
            return NextResponse.json(
                { error: 'Only admins can process requests' },
                { status: 403 }
            );
        }

        // Parse request body
        let body;
        try {
            const text = await req.text();
            console.log('Raw request body:', text);

            if (!text) {
                console.log('Empty request body');
                return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
            }

            body = JSON.parse(text);
            console.log('Parsed body:', body);
        } catch (error) {
            console.log('Failed to parse request body:', error);
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        // Validate parsed body
        try {
            const validatedData = updateRequestSchema.parse(body);
            console.log('Validated data:', validatedData);

            // Process the request
            const result = await changelogRequestService.processRequest({
                requestId,
                status: validatedData.status,
                adminId: user.id
            });

            console.log('Request processed successfully:', result);
            return NextResponse.json(result);

        } catch (error) {
            if (error instanceof z.ZodError) {
                console.log('Validation error:', error.errors);
                return NextResponse.json(
                    { error: 'Invalid request data', details: error.errors },
                    { status: 400 }
                );
            }
            throw error;
        }

    } catch (error: unknown) {
        // @ts-expect-error error might be null
        console.error('Error stack:', error.stack);

        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}