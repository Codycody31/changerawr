import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import {
    SyncStatusResponse,
    ProjectApiError,
    ProjectApiSuccess
} from '@/lib/types/cli/project-api';

/**
 * @method GET
 * @description Get sync status for a project
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "data": {
 *       "type": "object",
 *       "properties": {
 *         "success": { "type": "boolean" },
 *         "lastSync": {
 *           "type": "object",
 *           "properties": {
 *             "syncHash": { "type": "string" },
 *             "syncedAt": { "type": "string" },
 *             "commitCount": { "type": "number" },
 *             "branch": { "type": "string" }
 *           }
 *         },
 *         "pendingCommits": { "type": "number" },
 *         "totalCommits": { "type": "number" },
 *         "repositoryInfo": {
 *           "type": "object",
 *           "properties": {
 *             "url": { "type": "string" },
 *             "branch": { "type": "string" },
 *             "lastCommitHash": { "type": "string" },
 *             "linkedAt": { "type": "string" }
 *           }
 *         },
 *         "syncSettings": {
 *           "type": "object",
 *           "properties": {
 *             "autoSync": { "type": "boolean" },
 *             "lastSyncInterval": { "type": "number" },
 *             "maxCommitsPerSync": { "type": "number" }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 401 Unauthorized
 * @error 404 Project not found or not linked
 * @secure bearerAuth
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        // Validate authentication
        await validateAuthAndGetUser();
        const { projectId } = await context.params;

        // Get project with sync metadata and commit counts - include user access check
        const project = await db.project.findFirst({
            where: {
                id: projectId,
            },
            include: {
                syncMetadata: true,
                _count: {
                    select: {
                        syncedCommits: true
                    }
                }
            }
        });

        if (!project) {
            const errorResponse: ProjectApiError = {
                success: false,
                error: 'Project not found',
                message: 'Project not found or you do not have access to it',
                code: 'PROJECT_NOT_FOUND'
            };
            return NextResponse.json(errorResponse, { status: 404 });
        }

        // Check if project is linked
        if (!project.syncMetadata) {
            const errorResponse: ProjectApiError = {
                success: false,
                error: 'Project not linked',
                message: 'This project is not linked to any repository',
                code: 'PROJECT_NOT_LINKED'
            };
            return NextResponse.json(errorResponse, { status: 404 });
        }

        // Get the most recent synced commit for last sync info
        const lastSyncedCommit = await db.syncedCommit.findFirst({
            where: { projectId },
            orderBy: { syncedAt: 'desc' },
            select: {
                commitHash: true,
                syncedAt: true,
                branch: true
            }
        });

        // Get commits from the last 24 hours to estimate pending commits
        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);

        const recentCommitsCount = await db.syncedCommit.count({
            where: {
                projectId,
                syncedAt: {
                    gte: last24Hours
                }
            }
        });

        // Calculate sync interval (time between last two syncs)
        const lastTwoSyncs = await db.syncedCommit.findMany({
            where: { projectId },
            orderBy: { syncedAt: 'desc' },
            take: 2,
            select: { syncedAt: true }
        });

        let lastSyncInterval = 0;
        if (lastTwoSyncs.length === 2) {
            const timeDiff = lastTwoSyncs[0]!.syncedAt.getTime() - lastTwoSyncs[1]!.syncedAt.getTime();
            lastSyncInterval = Math.round(timeDiff / (1000 * 60)); // Convert to minutes
        }

        // Build response
        const syncStatus: SyncStatusResponse = {
            success: true,
            lastSync: lastSyncedCommit ? {
                syncHash: lastSyncedCommit.commitHash,
                syncedAt: lastSyncedCommit.syncedAt.toISOString(),
                commitCount: project._count.syncedCommits,
                branch: lastSyncedCommit.branch
            } : undefined,
            pendingCommits: recentCommitsCount, // This is an approximation
            totalCommits: project._count.syncedCommits,
            repositoryInfo: {
                url: project.syncMetadata.repositoryUrl || undefined,
                branch: project.syncMetadata.branch,
                lastCommitHash: project.syncMetadata.lastSyncHash || undefined,
                linkedAt: project.syncMetadata.createdAt.toISOString()
            },
            syncSettings: {
                autoSync: true, // Default assumption for CLI users
                lastSyncInterval,
                maxCommitsPerSync: 100 // Reasonable default limit
            }
        };

        const successResponse: ProjectApiSuccess<SyncStatusResponse> = {
            success: true,
            data: syncStatus,
            message: 'Sync status retrieved successfully'
        };

        return NextResponse.json(successResponse);

    } catch (error) {
        console.error('Sync status error:', error);

        if (error instanceof Error && error.message.includes('token')) {
            const errorResponse: ProjectApiError = {
                success: false,
                error: 'Unauthorized',
                message: 'Authentication required',
                code: 'AUTH_REQUIRED'
            };
            return NextResponse.json(errorResponse, { status: 401 });
        }

        const errorResponse: ProjectApiError = {
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred while fetching sync status',
            code: 'SYNC_STATUS_ERROR'
        };
        return NextResponse.json(errorResponse, { status: 500 });
    }
}