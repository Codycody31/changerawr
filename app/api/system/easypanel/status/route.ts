import {NextRequest, NextResponse} from 'next/server';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {EasypanelService} from '@/lib/services/easypanel';

interface EasypanelStatusResponse {
    configured: boolean;
    connected?: boolean;
    error?: string;
    config?: {
        projectId: string;
        serviceId: string;
        panelUrl: string;
    };
}

/**
 * Get Easypanel configuration and connection status
 * @method GET
 * @description Checks Easypanel configuration and tests connection
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "configured": { "type": "boolean" },
 *     "connected": { "type": "boolean" },
 *     "error": { "type": "string" },
 *     "config": {
 *       "type": "object",
 *       "properties": {
 *         "projectId": { "type": "string" },
 *         "serviceId": { "type": "string" },
 *         "panelUrl": { "type": "string" }
 *       }
 *     }
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
                {error: 'Admin access required'},
                {status: 403}
            );
        }

        const status: EasypanelStatusResponse = {
            configured: EasypanelService.isConfigured(),
        };

        if (status.configured) {
            // Add configuration details (without API key)
            status.config = {
                projectId: process.env.EASYPANEL_PROJECT_ID!,
                serviceId: process.env.EASYPANEL_SERVICE_ID!,
                panelUrl: process.env.EASYPANEL_PANEL_URL!,
            };

            // Test connection
            try {
                const easypanel = EasypanelService.fromEnv();
                if (easypanel) {
                    status.connected = await easypanel.testConnection();
                    if (!status.connected) {
                        status.error = 'Connection test failed - check credentials and network access';
                    }
                } else {
                    status.connected = false;
                    status.error = 'Failed to initialize Easypanel service';
                }
            } catch (error) {
                status.connected = false;
                status.error = error instanceof Error ? error.message : 'Connection test failed';
            }
        } else {
            status.error = 'Missing required environment variables: EASYPANEL_PROJECT_ID, EASYPANEL_SERVICE_ID, EASYPANEL_PANEL_URL, EASYPANEL_API_KEY';
        }

        return NextResponse.json(status);
    } catch (error) {
        console.error('Error checking Easypanel status:', error);
        return NextResponse.json(
            {error: 'Failed to check Easypanel status'},
            {status: 500}
        );
    }
}