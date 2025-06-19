// types/analytics.ts

export interface AnalyticsView {
    id: string;
    projectId: string;
    changelogEntryId?: string;
    ipHash: string;
    country?: string;
    userAgent?: string;
    referrer?: string;
    viewedAt: Date;
    sessionHash: string;
}

export interface AnalyticsTimeRange {
    start: Date;
    end: Date;
}

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '1y';

export interface DailyAnalytics {
    date: string;
    views: number;
    uniqueVisitors: number;
}

export interface CountryAnalytics {
    country: string;
    count: number;
    percentage?: number;
}

export interface EntryAnalytics {
    entryId: string;
    title: string;
    views: number;
    uniqueVisitors: number;
    percentage?: number;
}

export interface ReferrerAnalytics {
    referrer: string;
    count: number;
    percentage?: number;
}

export interface ProjectAnalyticsData {
    totalViews: number;
    uniqueVisitors: number;
    topCountries: CountryAnalytics[];
    dailyViews: DailyAnalytics[];
    topEntries: EntryAnalytics[];
    topReferrers: ReferrerAnalytics[];
    period: AnalyticsPeriod;
    timeRange: AnalyticsTimeRange;
    projectName?: string;
}

export interface ProjectAnalyticsSummary {
    projectId: string;
    projectName: string;
    views: number;
    uniqueVisitors: number;
    percentage?: number;
}

export interface SystemAnalyticsData extends ProjectAnalyticsData {
    topProjects: ProjectAnalyticsSummary[];
}

export interface AnalyticsMetric {
    label: string;
    value: number;
    change?: number; // Percentage change from previous period
    changeType?: 'increase' | 'decrease' | 'neutral';
}

export interface AnalyticsChartData {
    labels: string[];
    datasets: Array<{
        label: string;
        data: number[];
        borderColor?: string;
        backgroundColor?: string;
        fill?: boolean;
    }>;
}

export interface AnalyticsExportData {
    projectId?: string;
    projectName?: string;
    period: AnalyticsPeriod;
    timeRange: AnalyticsTimeRange;
    exportedAt: Date;
    data: {
        summary: {
            totalViews: number;
            uniqueVisitors: number;
        };
        daily: DailyAnalytics[];
        countries: CountryAnalytics[];
        entries?: EntryAnalytics[];
        referrers: ReferrerAnalytics[];
        projects?: ProjectAnalyticsSummary[];
    };
}

// API Response types
export interface AnalyticsApiResponse<T = ProjectAnalyticsData> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface AnalyticsApiError {
    success: false;
    error: string;
    code?: number;
}

// Request types
export interface AnalyticsQueryParams {
    period?: AnalyticsPeriod;
    startDate?: string;
    endDate?: string;
}

export interface TrackingEventData {
    projectId: string;
    changelogEntryId?: string;
    timestamp?: Date;
    metadata?: Record<string, unknown>;
}