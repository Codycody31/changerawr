import {NextResponse} from 'next/server';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {getProjectAnalytics, getTimeRange} from '@/lib/utils/analytics';
import {db} from '@/lib/db';
import {z} from 'zod';
import type {AnalyticsPeriod, AnalyticsQueryParams} from '@/lib/types/analytics';

const analyticsQuerySchema = z.object({
    period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

/**
 * @method GET
 * @description Get analytics data for a specific project
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "data": {
 *       "type": "object",
 *       "properties": {
 *         "totalViews": { "type": "number" },
 *         "uniqueVisitors": { "type": "number" },
 *         "topCountries": {
 *           "type": "array",
 *           "items": {
 *             "type": "object",
 *             "properties": {
 *               "country": { "type": "string" },
 *               "count": { "type": "number" }
 *             }
 *           }
 *         },
 *         "dailyViews": {
 *           "type": "array",
 *           "items": {
 *             "type": "object",
 *             "properties": {
 *               "date": { "type": "string" },
 *               "views": { "type": "number" },
 *               "uniqueVisitors": { "type": "number" }
 *             }
 *           }
 *         },
 *         "topEntries": {
 *           "type": "array",
 *           "items": {
 *             "type": "object",
 *             "properties": {
 *               "entryId": { "type": "string" },
 *               "title": { "type": "string" },
 *               "views": { "type": "number" },
 *               "uniqueVisitors": { "type": "number" }
 *             }
 *           }
 *         },
 *         "topReferrers": {
 *           "type": "array",
 *           "items": {
 *             "type": "object",
 *             "properties": {
 *               "referrer": { "type": "string" },
 *               "count": { "type": "number" }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 400 Invalid parameters
 * @error 403 Unauthorized - User not authorized to access project
 * @error 404 Project not found
 * @error 500 Internal server error
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const params = await context.params;
        const projectId = params.projectId;

        // Ensure we have a valid projectId
        if (!projectId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Project ID is required'
                },
                {status: 400}
            );
        }

        const user = await validateAuthAndGetUser();

        // Check if analytics are enabled
        const systemConfig = await db.systemConfig.findFirst();
        if (!systemConfig?.enableAnalytics) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Analytics are disabled'
                },
                {status: 403}
            );
        }

        // Verify project exists and user has access
        const project = await db.project.findUnique({
            where: {id: projectId},
            select: {
                id: true,
                name: true,
                isPublic: true
            }
        });

        if (!project) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Project not found'
                },
                {status: 404}
            );
        }

        // Only allow access if project is public or user is admin
        if (!project.isPublic && user.role !== 'ADMIN') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Not authorized to view analytics for this project'
                },
                {status: 403}
            );
        }

        // Parse query parameters
        const url = new URL(request.url);
        const queryParams: AnalyticsQueryParams = {
            period: (url.searchParams.get('period') as AnalyticsPeriod) || '30d',
            startDate: url.searchParams.get('startDate') || undefined,
            endDate: url.searchParams.get('endDate') || undefined,
        };

        const validatedParams = analyticsQuerySchema.parse(queryParams);

        // Determine time range
        let timeRange;
        if (validatedParams.startDate && validatedParams.endDate) {
            timeRange = {
                start: new Date(validatedParams.startDate),
                end: new Date(validatedParams.endDate)
            };
        } else {
            timeRange = getTimeRange(validatedParams.period);
        }

        // Get analytics data
        const analyticsData = await getProjectAnalytics(projectId, timeRange);

        return NextResponse.json({
            success: true,
            data: {
                ...analyticsData,
                period: validatedParams.period,
                timeRange: {
                    start: timeRange.start.toISOString(),
                    end: timeRange.end.toISOString()
                },
                projectId,
                projectName: project.name
            }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid parameters',
                    details: error.errors
                },
                {status: 400}
            );
        }

        console.error('Error fetching project analytics:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch analytics data'
            },
            {status: 500}
        );
    }
}