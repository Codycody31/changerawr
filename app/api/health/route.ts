// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Always run this check live - never serve a build-time-cached response.
export const dynamic = 'force-dynamic';

/**
 * @method GET
 * @description Health check endpoint to verify application readiness
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "status": { "type": "string" },
 *     "timestamp": { "type": "string" },
 *     "services": {
 *       "type": "object",
 *       "properties": {
 *         "database": { "type": "string" },
 *         "application": { "type": "string" }
 *       }
 *     }
 *   }
 * }
 * @response 503 {
 *   "type": "object",
 *   "properties": {
 *     "status": { "type": "string" },
 *     "error": { "type": "string" }
 *   }
 * }
 */
export async function GET() {
    const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

    try {
        // Check database connectivity
        await db.$queryRaw`SELECT 1`;

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                application: 'ready'
            }
        }, { status: 200, headers });

    } catch (error) {
        console.error('Health check failed:', error);

        return NextResponse.json({
            status: 'unhealthy',
            error: 'Database connection failed'
        }, { status: 503, headers });
    }
}