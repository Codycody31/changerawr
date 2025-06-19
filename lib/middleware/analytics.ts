import { db } from '@/lib/db';
import { extractIPFromRequest, getGeolocationFromIP, getCountryFromCloudflare } from '@/lib/services/analytics/geolocation';

export interface AnalyticsTrackingOptions {
    projectId: string;
    changelogEntryId?: string;
    userAgent?: string;
    referrer?: string;
}

/**
 * Track a public changelog view
 * This is GDPR compliant and cookieless
 */
export async function trackChangelogView(
    request: Request,
    options: AnalyticsTrackingOptions
): Promise<void> {
    try {
        // Check if analytics are enabled
        const systemConfig = await db.systemConfig.findFirst();
        if (!systemConfig?.enableAnalytics) {
            return; // Analytics disabled, skip tracking
        }

        // Extract IP and get geolocation data
        const ip = extractIPFromRequest(request);
        const userAgent = options.userAgent || request.headers.get('user-agent') || undefined;
        const referrer = options.referrer || request.headers.get('referer') || undefined;

        // Try to get country from Cloudflare headers first (most efficient)
        let country = getCountryFromCloudflare(request);

        let geolocationData;
        if (!country) {
            // Fallback to IP geolocation service
            geolocationData = await getGeolocationFromIP(ip, userAgent);
            country = geolocationData.country;
        } else {
            // Still need to generate hashes even if we have country from Cloudflare
            geolocationData = await getGeolocationFromIP(ip, userAgent);
        }

        // Store the analytics data
        await db.publicChangelogAnalytics.create({
            data: {
                projectId: options.projectId,
                changelogEntryId: options.changelogEntryId,
                ipHash: geolocationData.ipHash,
                country: country || undefined,
                userAgent: userAgent || undefined,
                referrer: referrer || undefined,
                sessionHash: geolocationData.sessionHash,
                viewedAt: new Date()
            }
        });
    } catch (error) {
        // Don't let analytics tracking break the main request
        console.error('Failed to track changelog view:', error);
    }
}

/**
 * Track multiple views in batch (for performance)
 */
export async function trackChangelogViewsBatch(
    request: Request,
    views: AnalyticsTrackingOptions[]
): Promise<void> {
    try {
        // Check if analytics are enabled
        const systemConfig = await db.systemConfig.findFirst();
        if (!systemConfig?.enableAnalytics) {
            return; // Analytics disabled, skip tracking
        }

        // Extract IP and get geolocation data once
        const ip = extractIPFromRequest(request);
        const userAgent = request.headers.get('user-agent') || undefined;
        const referrer = request.headers.get('referer') || undefined;

        // Try to get country from Cloudflare headers first
        let country = getCountryFromCloudflare(request);

        let geolocationData;
        if (!country) {
            geolocationData = await getGeolocationFromIP(ip, userAgent);
            country = geolocationData.country;
        } else {
            geolocationData = await getGeolocationFromIP(ip, userAgent);
        }

        // Create analytics records for all views
        const analyticsData = views.map(view => ({
            projectId: view.projectId,
            changelogEntryId: view.changelogEntryId,
            ipHash: geolocationData.ipHash,
            country: country || undefined,
            userAgent: view.userAgent || userAgent || undefined,
            referrer: view.referrer || referrer || undefined,
            sessionHash: geolocationData.sessionHash,
            viewedAt: new Date()
        }));

        await db.publicChangelogAnalytics.createMany({
            data: analyticsData
        });
    } catch (error) {
        console.error('Failed to track changelog views batch:', error);
    }
}