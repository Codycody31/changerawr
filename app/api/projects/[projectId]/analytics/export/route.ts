import {NextResponse} from 'next/server';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {getProjectAnalytics, getTimeRange} from '@/lib/utils/analytics';
import {db} from '@/lib/db';
import {z} from 'zod';
import type {AnalyticsPeriod} from '@/lib/types/analytics';

const exportQuerySchema = z.object({
    period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
    format: z.enum(['csv', 'json']).optional().default('csv'),
});

/**
 * @method GET
 * @description Export project analytics data
 * @response 200 CSV or JSON file download
 * @error 403 Unauthorized
 * @error 404 Project not found
 * @error 500 Export failed
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
                {error: 'Project ID is required'},
                {status: 400}
            );
        }

        const user = await validateAuthAndGetUser();

        // Check if analytics are enabled
        const systemConfig = await db.systemConfig.findFirst();
        if (!systemConfig?.enableAnalytics) {
            return NextResponse.json(
                {error: 'Analytics are disabled'},
                {status: 403}
            );
        }

        // Verify project exists and user has access
        const project = await db.project.findUnique({
            where: {id: projectId},
            select: {id: true, name: true, isPublic: true}
        });

        if (!project) {
            return NextResponse.json(
                {error: 'Project not found'},
                {status: 404}
            );
        }

        if (!project.isPublic && user.role !== 'ADMIN') {
            return NextResponse.json(
                {error: 'Not authorized'},
                {status: 403}
            );
        }

        // Parse query parameters
        const url = new URL(request.url);
        const queryParams = {
            period: (url.searchParams.get('period') as AnalyticsPeriod) || '30d',
            format: (url.searchParams.get('format') as 'csv' | 'json') || 'csv',
        };

        const validatedParams = exportQuerySchema.parse(queryParams);
        const timeRange = getTimeRange(validatedParams.period);

        // Get analytics data
        const analyticsData = await getProjectAnalytics(projectId, timeRange);

        const exportData = {
            projectId: project.id,
            projectName: project.name,
            period: validatedParams.period,
            timeRange: {
                start: timeRange.start.toISOString(),
                end: timeRange.end.toISOString()
            },
            exportedAt: new Date().toISOString(),
            exportedBy: user.email,
            data: {
                summary: {
                    totalViews: analyticsData.totalViews,
                    uniqueVisitors: analyticsData.uniqueVisitors,
                },
                daily: analyticsData.dailyViews,
                countries: analyticsData.topCountries,
                entries: analyticsData.topEntries,
                referrers: analyticsData.topReferrers,
            }
        };

        if (validatedParams.format === 'json') {
            return NextResponse.json(exportData, {
                headers: {
                    'Content-Disposition': `attachment; filename="analytics-${projectId}-${validatedParams.period}.json"`,
                    'Content-Type': 'application/json',
                }
            });
        }

        // Generate CSV
        const csvLines = [
            // Header
            'Type,Date,Value,Label,Count',
            // Summary
            'Summary,,Total Views,,',
            'Summary,,Unique Visitors,,',
            // Daily data
            ...analyticsData.dailyViews.map(day =>
                `Daily,${day.date},Views,,${day.views}`
            ),
            ...analyticsData.dailyViews.map(day =>
                `Daily,${day.date},Unique Visitors,,${day.uniqueVisitors}`
            ),
            // Countries
            ...analyticsData.topCountries.map(country =>
                `Country,,${country.country},,${country.count}`
            ),
            // Entries
            ...analyticsData.topEntries.map(entry =>
                `Entry,,${entry.title.replace(/,/g, ';')},Views,${entry.views}`
            ),
            ...analyticsData.topEntries.map(entry =>
                `Entry,,${entry.title.replace(/,/g, ';')},Visitors,${entry.uniqueVisitors}`
            ),
            // Referrers
            ...analyticsData.topReferrers.map(referrer =>
                `Referrer,,${referrer.referrer},,${referrer.count}`
            ),
        ];

        const csvContent = csvLines.join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Disposition': `attachment; filename="analytics-${projectId}-${validatedParams.period}.csv"`,
                'Content-Type': 'text/csv',
            }
        });

    } catch (error) {
        console.error('Error exporting analytics:', error);
        return NextResponse.json(
            {error: 'Failed to export analytics data'},
            {status: 500}
        );
    }
}