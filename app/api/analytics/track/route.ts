// app/api/analytics/track/route.ts
import {NextResponse} from 'next/server';
import {trackChangelogView} from '@/lib/middleware/analytics';
import {z} from 'zod';

const trackingSchema = z.object({
    projectId: z.string(),
    changelogEntryId: z.string().optional(),
});

/**
 * @method POST
 * @description Track a changelog view (cookieless, GDPR compliant)
 * @body {
 *   "type": "object",
 *   "required": ["projectId"],
 *   "properties": {
 *     "projectId": {
 *       "type": "string",
 *       "description": "ID of the project being viewed"
 *     },
 *     "changelogEntryId": {
 *       "type": "string",
 *       "description": "ID of the specific changelog entry being viewed (optional)"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" }
 *   }
 * }
 * @error 400 Invalid request body
 * @error 500 Failed to track view
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validatedData = trackingSchema.parse(body);

        // Track the view using our cookieless system
        await trackChangelogView(request, {
            projectId: validatedData.projectId,
            changelogEntryId: validatedData.changelogEntryId,
        });

        return NextResponse.json({success: true});
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request body',
                    details: error.errors
                },
                {status: 400}
            );
        }

        console.error('Failed to track changelog view:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to track view'
            },
            {status: 500}
        );
    }
}