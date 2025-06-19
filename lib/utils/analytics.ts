// lib/utils/analytics.ts
import {db} from '@/lib/db';

export interface AnalyticsTimeRange {
    start: Date;
    end: Date;
}

export interface ProjectAnalytics {
    totalViews: number;
    uniqueVisitors: number;
    topCountries: Array<{ country: string; count: number }>;
    dailyViews: Array<{ date: string; views: number; uniqueVisitors: number }>;
    topEntries: Array<{
        entryId: string;
        title: string;
        views: number;
        uniqueVisitors: number
    }>;
    topReferrers: Array<{ referrer: string; count: number }>;
}

export interface SystemAnalytics extends ProjectAnalytics {
    topProjects: Array<{
        projectId: string;
        projectName: string;
        views: number;
        uniqueVisitors: number
    }>;
}

/**
 * Get time range for analytics queries
 */
export function getTimeRange(period: '7d' | '30d' | '90d' | '1y'): AnalyticsTimeRange {
    const end = new Date();
    const start = new Date();

    switch (period) {
        case '7d':
            start.setDate(end.getDate() - 7);
            break;
        case '30d':
            start.setDate(end.getDate() - 30);
            break;
        case '90d':
            start.setDate(end.getDate() - 90);
            break;
        case '1y':
            start.setFullYear(end.getFullYear() - 1);
            break;
    }

    return {start, end};
}

/**
 * Get analytics for a specific project
 */
export async function getProjectAnalytics(
    projectId: string,
    timeRange: AnalyticsTimeRange
): Promise<ProjectAnalytics> {
    // Base where clause for project
    const baseWhere = {
        projectId,
        viewedAt: {
            gte: timeRange.start,
            lte: timeRange.end
        }
    };

    // Total views in time range
    const totalViews = await db.publicChangelogAnalytics.count({
        where: baseWhere
    });

    // Unique visitors using raw query for better performance
    const uniqueVisitorsData = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT "sessionHash") as count
        FROM "PublicChangelogAnalytics"
        WHERE "projectId" = ${projectId}
          AND "viewedAt" >= ${timeRange.start}
          AND "viewedAt" <= ${timeRange.end}
    `;
    const uniqueVisitors = Number(uniqueVisitorsData[0]?.count || 0);

    // Top countries using raw query
    const topCountriesData = await db.$queryRaw<Array<{
        country: string;
        count: bigint
    }>>`
        SELECT "country", COUNT(*) as count
        FROM "PublicChangelogAnalytics"
        WHERE "projectId" = ${projectId}
          AND "country" IS NOT NULL
          AND "viewedAt" >= ${timeRange.start}
          AND "viewedAt" <= ${timeRange.end}
        GROUP BY "country"
        ORDER BY count DESC
        LIMIT 10
    `;

    const topCountries = topCountriesData.map(item => ({
        country: item.country || 'Unknown',
        count: Number(item.count)
    }));

    // Daily views using raw query
    const dailyViewsData = await db.$queryRaw<Array<{
        date: string;
        views: bigint;
        unique_visitors: bigint;
    }>>`
        SELECT
            DATE("viewedAt") as date,
            COUNT(*) as views,
            COUNT(DISTINCT "sessionHash") as unique_visitors
        FROM "PublicChangelogAnalytics"
        WHERE "projectId" = ${projectId}
          AND "viewedAt" >= ${timeRange.start}
          AND "viewedAt" <= ${timeRange.end}
        GROUP BY DATE("viewedAt")
        ORDER BY date DESC
    `;

    const dailyViews = dailyViewsData.map(item => ({
        date: item.date,
        views: Number(item.views),
        uniqueVisitors: Number(item.unique_visitors)
    }));

    // Top entries using raw query
    const topEntriesData = await db.$queryRaw<Array<{
        changelogEntryId: string;
        views: bigint;
        unique_visitors: bigint;
    }>>`
        SELECT
            "changelogEntryId",
            COUNT(*) as views,
            COUNT(DISTINCT "sessionHash") as unique_visitors
        FROM "PublicChangelogAnalytics"
        WHERE "projectId" = ${projectId}
          AND "changelogEntryId" IS NOT NULL
          AND "viewedAt" >= ${timeRange.start}
          AND "viewedAt" <= ${timeRange.end}
        GROUP BY "changelogEntryId"
        ORDER BY views DESC
        LIMIT 10
    `;

    // Get entry titles for the top entries
    const entryIds = topEntriesData.map(item => item.changelogEntryId);
    const entries = entryIds.length > 0 ? await db.changelogEntry.findMany({
        where: {id: {in: entryIds}},
        select: {id: true, title: true}
    }) : [];

    const entriesMap = new Map(entries.map(entry => [entry.id, entry.title]));

    const topEntries = topEntriesData.map(item => ({
        entryId: item.changelogEntryId,
        title: entriesMap.get(item.changelogEntryId) || 'Unknown Entry',
        views: Number(item.views),
        uniqueVisitors: Number(item.unique_visitors)
    }));

    // Top referrers using raw query
    const topReferrersData = await db.$queryRaw<Array<{
        referrer: string;
        count: bigint
    }>>`
        SELECT "referrer", COUNT(*) as count
        FROM "PublicChangelogAnalytics"
        WHERE "projectId" = ${projectId}
          AND "referrer" IS NOT NULL
          AND "viewedAt" >= ${timeRange.start}
          AND "viewedAt" <= ${timeRange.end}
        GROUP BY "referrer"
        ORDER BY count DESC
        LIMIT 10
    `;

    const topReferrers = topReferrersData.map(item => ({
        referrer: item.referrer || 'Direct',
        count: Number(item.count)
    }));

    return {
        totalViews,
        uniqueVisitors,
        topCountries,
        dailyViews,
        topEntries,
        topReferrers
    };
}

/**
 * Get system-wide analytics (admin only)
 */
export async function getSystemAnalytics(timeRange: AnalyticsTimeRange): Promise<SystemAnalytics> {
    // Base where clause for time range
    const timeWhere = {
        viewedAt: {
            gte: timeRange.start,
            lte: timeRange.end
        }
    };

    // Total views system-wide
    const totalViews = await db.publicChangelogAnalytics.count({
        where: timeWhere
    });

    // Unique visitors system-wide using raw query
    const uniqueVisitorsData = await db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT "sessionHash") as count
        FROM "PublicChangelogAnalytics"
        WHERE "viewedAt" >= ${timeRange.start}
          AND "viewedAt" <= ${timeRange.end}
    `;
    const uniqueVisitors = Number(uniqueVisitorsData[0]?.count || 0);

    // Top countries system-wide using raw query
    const topCountriesData = await db.$queryRaw<Array<{
        country: string;
        count: bigint
    }>>`
        SELECT "country", COUNT(*) as count
        FROM "PublicChangelogAnalytics"
        WHERE "country" IS NOT NULL
          AND "viewedAt" >= ${timeRange.start}
          AND "viewedAt" <= ${timeRange.end}
        GROUP BY "country"
        ORDER BY count DESC
        LIMIT 10
    `;

    const topCountries = topCountriesData.map(item => ({
        country: item.country || 'Unknown',
        count: Number(item.count)
    }));

    // Daily views system-wide using raw query
    const dailyViewsData = await db.$queryRaw<Array<{
        date: string;
        views: bigint;
        unique_visitors: bigint;
    }>>`
        SELECT
            DATE("viewedAt") as date,
            COUNT(*) as views,
            COUNT(DISTINCT "sessionHash") as unique_visitors
        FROM "PublicChangelogAnalytics"
        WHERE "viewedAt" >= ${timeRange.start}
          AND "viewedAt" <= ${timeRange.end}
        GROUP BY DATE("viewedAt")
        ORDER BY date DESC
    `;

    const dailyViews = dailyViewsData.map(item => ({
        date: item.date,
        views: Number(item.views),
        uniqueVisitors: Number(item.unique_visitors)
    }));

    // Top entries system-wide using raw query
    const topEntriesData = await db.$queryRaw<Array<{
        changelogEntryId: string;
        views: bigint;
        unique_visitors: bigint;
    }>>`
        SELECT
            "changelogEntryId",
            COUNT(*) as views,
            COUNT(DISTINCT "sessionHash") as unique_visitors
        FROM "PublicChangelogAnalytics"
        WHERE "changelogEntryId" IS NOT NULL
          AND "viewedAt" >= ${timeRange.start}
          AND "viewedAt" <= ${timeRange.end}
        GROUP BY "changelogEntryId"
        ORDER BY views DESC
        LIMIT 10
    `;

    // Get entry titles for the top entries
    const entryIds = topEntriesData.map(item => item.changelogEntryId);
    const entries = entryIds.length > 0 ? await db.changelogEntry.findMany({
        where: {id: {in: entryIds}},
        select: {id: true, title: true}
    }) : [];

    const entriesMap = new Map(entries.map(entry => [entry.id, entry.title]));

    const topEntries = topEntriesData.map(item => ({
        entryId: item.changelogEntryId,
        title: entriesMap.get(item.changelogEntryId) || 'Unknown Entry',
        views: Number(item.views),
        uniqueVisitors: Number(item.unique_visitors)
    }));

    // Top referrers system-wide using raw query
    const topReferrersData = await db.$queryRaw<Array<{
        referrer: string;
        count: bigint
    }>>`
        SELECT "referrer", COUNT(*) as count
        FROM "PublicChangelogAnalytics"
        WHERE "referrer" IS NOT NULL
          AND "viewedAt" >= ${timeRange.start}
          AND "viewedAt" <= ${timeRange.end}
        GROUP BY "referrer"
        ORDER BY count DESC
        LIMIT 10
    `;

    const topReferrers = topReferrersData.map(item => ({
        referrer: item.referrer || 'Direct',
        count: Number(item.count)
    }));

    // Top projects using raw query
    const topProjectsData = await db.$queryRaw<Array<{
        projectId: string;
        views: bigint;
        unique_visitors: bigint;
    }>>`
        SELECT
            "projectId",
            COUNT(*) as views,
            COUNT(DISTINCT "sessionHash") as unique_visitors
        FROM "PublicChangelogAnalytics"
        WHERE "viewedAt" >= ${timeRange.start}
          AND "viewedAt" <= ${timeRange.end}
        GROUP BY "projectId"
        ORDER BY views DESC
        LIMIT 10
    `;

    // Get project names for the top projects
    const projectIds = topProjectsData.map(item => item.projectId);
    const projects = projectIds.length > 0 ? await db.project.findMany({
        where: {id: {in: projectIds}},
        select: {id: true, name: true}
    }) : [];

    const projectsMap = new Map(projects.map(project => [project.id, project.name]));

    const topProjects = topProjectsData.map(item => ({
        projectId: item.projectId,
        projectName: projectsMap.get(item.projectId) || 'Unknown Project',
        views: Number(item.views),
        uniqueVisitors: Number(item.unique_visitors)
    }));

    return {
        totalViews,
        uniqueVisitors,
        topCountries,
        dailyViews,
        topEntries,
        topReferrers,
        topProjects
    };
}