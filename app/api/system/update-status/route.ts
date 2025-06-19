// app/api/system/update-status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { appInfo } from '@/lib/app-info';
import { EasypanelService } from '@/lib/services/easypanel';
import { UpdateStatus } from '@/lib/types/easypanel';
import { compareVersions } from 'compare-versions';

/**
 * Get update status including Easypanel configuration
 * @method GET
 * @description Checks for available updates and Easypanel configuration status
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "available": { "type": "boolean" },
 *     "currentVersion": { "type": "string" },
 *     "latestVersion": { "type": "string" },
 *     "canAutoUpdate": { "type": "boolean" },
 *     "easypanelConfigured": { "type": "boolean" }
 *   }
 * }
 * @error 401 Unauthorized - Authentication required
 * @error 403 Forbidden - Admin access required
 * @error 500 Internal server error
 * @secure cookieAuth
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Check if Easypanel is configured
        const easypanelConfigured = EasypanelService.isConfigured();

        let latestVersion = appInfo.version;
        let updateAvailable = false;

        try {
            // Fetch latest version from update server
            const response = await fetch('https://dl.supers0ft.us/changerawr/', {
                // options could go here
            });

            if (response.ok) {
                const data = await response.json();
                latestVersion = data.version || appInfo.version;
                updateAvailable = compareVersions(latestVersion, appInfo.version) > 0;
            }
        } catch (error) {
            console.warn('Failed to check for updates:', error);
            // If we can't check for updates, just use current version
        }

        const updateStatus: UpdateStatus = {
            available: updateAvailable,
            currentVersion: appInfo.version,
            latestVersion,
            canAutoUpdate: easypanelConfigured && updateAvailable,
            easypanelConfigured,
        };

        return NextResponse.json(updateStatus);
    } catch (error) {
        console.error('Error checking update status:', error);
        return NextResponse.json(
            { error: 'Failed to check update status' },
            { status: 500 }
        );
    }
}