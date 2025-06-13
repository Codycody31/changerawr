import {createHash} from 'crypto';

export interface GeolocationResult {
    country?: string;
    ipHash: string;
    sessionHash: string;
}

/**
 * Get country from IP address using a free geolocation service
 * This is GDPR compliant as we hash the IP and don't store it
 */
export async function getGeolocationFromIP(
    ip: string,
    userAgent?: string
): Promise<GeolocationResult> {
    // Create hashed IP for privacy (GDPR compliant)
    const ipHash = createHash('sha256').update(ip + process.env.ANALYTICS_SALT || 'changerawr-salt').digest('hex');

    // Create session hash (IP + UserAgent for unique session tracking)
    const sessionHash = createHash('sha256')
        .update(ip + (userAgent || '') + process.env.ANALYTICS_SALT || 'changerawr-salt')
        .digest('hex');

    let country: string | undefined;

    try {
        // Use a free geolocation service (cloudflare headers, ipapi, etc.)
        // First try Cloudflare CF-IPCountry header if available
        // This is commonly available in production environments

        // For localhost/development, skip geolocation
        if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
            country = 'Local';
        } else {
            // Try ipapi.co (free tier: 1000 requests/day)
            const response = await fetch(`https://ipapi.co/${ip}/country_name/`, {
                headers: {
                    'User-Agent': 'Changerawr-Analytics/1.0'
                },
                // Add timeout to prevent blocking
                signal: AbortSignal.timeout(3000)
            });

            if (response.ok) {
                const countryName = await response.text();
                if (countryName && countryName.trim() && !countryName.includes('error')) {
                    country = countryName.trim();
                }
            }
        }
    } catch (error) {
        // Geolocation failed, but we still return the hashes
        console.warn('Geolocation failed:', error);
    }

    return {
        country,
        ipHash,
        sessionHash
    };
}

/**
 * Extract real IP from request headers
 * Handles various proxy configurations
 */
export function extractIPFromRequest(request: Request): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    // Priority: Cloudflare > X-Real-IP > X-Forwarded-For > fallback
    if (cfConnectingIP) {
        return cfConnectingIP;
    }

    if (realIP) {
        return realIP;
    }

    if (forwardedFor) {
        // X-Forwarded-For can contain multiple IPs, take the first one
        return forwardedFor.split(',')[0].trim();
    }

    // Fallback for development
    return '127.0.0.1';
}

/**
 * Get country from Cloudflare headers (if available)
 * This is the most efficient method when using Cloudflare
 */
export function getCountryFromCloudflare(request: Request): string | undefined {
    return request.headers.get('cf-ipcountry') || undefined;
}