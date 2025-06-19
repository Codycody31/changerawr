import { NextRequest, NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { EasypanelService } from '@/lib/services/easypanel';
import { compareVersions } from 'compare-versions';
import { appInfo } from '@/lib/app-info';
import { generateDockerImage, validateDockerImage } from '@/lib/utils/docker';

interface PerformUpdateRequest {
    targetVersion: string;
    customImage?: string;
}

/**
 * Perform automatic update via Easypanel
 * @method POST
 * @description Automatically updates the application using Easypanel API
 * @body {
 *   "type": "object",
 *   "required": ["targetVersion"],
 *   "properties": {
 *     "targetVersion": {
 *       "type": "string",
 *       "description": "Target version to update to"
 *     },
 *     "customImage": {
 *       "type": "string",
 *       "description": "Optional custom Docker image (overrides default generation)"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "message": { "type": "string" },
 *     "fromVersion": { "type": "string" },
 *     "toVersion": { "type": "string" },
 *     "imageUsed": { "type": "string" },
 *     "estimatedRestartTime": { "type": "number" }
 *   }
 * }
 * @error 400 Invalid request or version
 * @error 401 Unauthorized - Authentication required
 * @error 403 Forbidden - Admin access required
 * @error 500 Internal server error
 * @error 503 Easypanel not configured
 * @secure cookieAuth
 */
export async function POST(request: NextRequest) {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        // Check if Easypanel is configured
        if (!EasypanelService.isConfigured()) {
            return NextResponse.json(
                {
                    error: 'Easypanel not configured',
                    details: 'EASYPANEL_PROJECT_ID, EASYPANEL_SERVICE_ID, EASYPANEL_PANEL_URL, and EASYPANEL_API_KEY must be set'
                },
                { status: 503 }
            );
        }

        const body: PerformUpdateRequest = await request.json();
        const { targetVersion, customImage } = body;

        if (!targetVersion) {
            return NextResponse.json(
                { error: 'Target version is required' },
                { status: 400 }
            );
        }

        // Validate that target version is newer than current
        if (compareVersions(targetVersion, appInfo.version) <= 0) {
            return NextResponse.json(
                {
                    error: 'Invalid target version',
                    details: `Target version ${targetVersion} is not newer than current version ${appInfo.version}`
                },
                { status: 400 }
            );
        }

        // Create Easypanel service instance
        const easypanel = EasypanelService.fromEnv();
        if (!easypanel) {
            return NextResponse.json(
                { error: 'Failed to initialize Easypanel service' },
                { status: 500 }
            );
        }

        // Determine the Docker image to use
        let dockerImage: string;
        if (customImage) {
            // Validate custom image
            const validation = validateDockerImage(customImage);
            if (!validation.valid) {
                return NextResponse.json(
                    {
                        error: 'Invalid custom Docker image',
                        details: validation.error
                    },
                    { status: 400 }
                );
            }
            dockerImage = customImage;
        } else {
            // Generate standard image
            dockerImage = generateDockerImage(targetVersion);
        }

        console.log(`Starting automatic update from ${appInfo.version} to ${targetVersion}`);
        console.log(`Using Docker image: ${dockerImage}`);
        console.log(`Easypanel config: ${JSON.stringify(easypanel.getConfig())}`);

        try {
            // Test connection first
            const connectionTest = await easypanel.testConnection();
            if (!connectionTest) {
                throw new Error('Failed to connect to Easypanel API');
            }

            // Perform the update
            await easypanel.performUpdate(targetVersion, customImage);

            return NextResponse.json({
                success: true,
                message: 'Update completed successfully. The application is being redeployed.',
                fromVersion: appInfo.version,
                toVersion: targetVersion,
                imageUsed: dockerImage,
                estimatedRestartTime: 60, // seconds
            });
        } catch (updateError) {
            console.error('Easypanel update failed:', updateError);

            return NextResponse.json(
                {
                    error: 'Update failed',
                    details: updateError instanceof Error ? updateError.message : 'Unknown error occurred'
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Error performing update:', error);
        return NextResponse.json(
            { error: 'Failed to perform update' },
            { status: 500 }
        );
    }
}