import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {
    SyncRequest,
    SyncResponse,
    ProjectApiError,
    ProjectApiSuccess
} from '@/lib/types/cli/project-api';

const conventionalCommitTypes = [
    'feat', 'fix', 'docs', 'style', 'refactor', 'perf',
    'test', 'build', 'ci', 'chore', 'revert'
] as const;

// Define proper type for syncMetadata
interface SyncMetadata {
    id: string;
    lastSyncHash: string | null;
    repositoryUrl: string | null;
    lastSyncedAt: Date | null;
    totalCommitsSynced: number;
    branch: string;
    // Add other properties as needed based on your Prisma schema
}

const commitDataSchema = z.object({
    hash: z.string().min(1),
    message: z.string().min(1),
    author: z.string().min(1),
    email: z.string().email(),
    date: z.string(),
    files: z.array(z.string()),
    type: z.enum(conventionalCommitTypes).optional(),
    scope: z.string().optional(),
    breaking: z.boolean().optional(),
    body: z.string().optional(),
    footer: z.string().optional(),
});

const syncRequestSchema = z.object({
    commits: z.array(commitDataSchema),
    lastSyncHash: z.string().optional(),
    branch: z.string().min(1).default('main'),
    repositoryUrl: z.string().url().optional(),
    metadata: z.object({
        cliVersion: z.string().optional(),
        platform: z.string().optional(),
        timestamp: z.string(),
    }).optional(),
});

/**
 * @method POST
 * @description Sync commits from CLI to Changerawr project
 * @body {
 *   "type": "object",
 *   "required": ["commits", "branch"],
 *   "properties": {
 *     "commits": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "required": ["hash", "message", "author", "email", "date", "files"],
 *         "properties": {
 *           "hash": { "type": "string" },
 *           "message": { "type": "string" },
 *           "author": { "type": "string" },
 *           "email": { "type": "string", "format": "email" },
 *           "date": { "type": "string" },
 *           "files": { "type": "array", "items": { "type": "string" } },
 *           "type": { "type": "string" },
 *           "scope": { "type": "string" },
 *           "breaking": { "type": "boolean" },
 *           "body": { "type": "string" },
 *           "footer": { "type": "string" }
 *         }
 *       }
 *     },
 *     "lastSyncHash": { "type": "string" },
 *     "branch": { "type": "string" },
 *     "repositoryUrl": { "type": "string", "format": "uri" },
 *     "metadata": {
 *       "type": "object",
 *       "properties": {
 *         "cliVersion": { "type": "string" },
 *         "platform": { "type": "string" },
 *         "timestamp": { "type": "string" }
 *       }
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "data": {
 *       "type": "object",
 *       "properties": {
 *         "success": { "type": "boolean" },
 *         "processed": { "type": "number" },
 *         "skipped": { "type": "number" },
 *         "errors": { "type": "array", "items": { "type": "string" } },
 *         "warnings": { "type": "array", "items": { "type": "string" } },
 *         "newSyncHash": { "type": "string" },
 *         "syncedAt": { "type": "string" },
 *         "nextSyncRecommendedAt": { "type": "string" }
 *       }
 *     }
 *   }
 * }
 * @error 400 Invalid request data
 * @error 401 Unauthorized
 * @error 404 Project not found or not linked
 * @secure bearerAuth
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        // Validate authentication
        await validateAuthAndGetUser();
        const {projectId} = await context.params;

        // Parse and validate request body
        const body = await request.json();

        // Log the raw body for debugging
        console.log('Raw sync request body:', JSON.stringify(body, null, 2));

        const validatedData = syncRequestSchema.parse(body) as SyncRequest;

        // Check if project exists and user has access
        const project = await db.project.findFirst({
            where: {
                id: projectId,
            },
            include: {
                syncMetadata: true
            }
        });

        if (!project) {
            const errorResponse: ProjectApiError = {
                success: false,
                error: 'Project not found',
                message: 'Project not found or you do not have access to it',
                code: 'PROJECT_NOT_FOUND'
            };
            return NextResponse.json(errorResponse, {status: 404});
        }

        // Check if project is linked
        if (!project.syncMetadata) {
            const errorResponse: ProjectApiError = {
                success: false,
                error: 'Project not linked',
                message: 'This project is not linked to any repository. Please link it first.',
                code: 'PROJECT_NOT_LINKED'
            };
            return NextResponse.json(errorResponse, {status: 404});
        }

        // Process commits
        const syncResult = await processSyncRequest(project.id, validatedData, project.syncMetadata);

        // Update sync metadata
        await db.projectSyncMetadata.update({
            where: {id: project.syncMetadata.id},
            data: {
                lastSyncHash: syncResult.newSyncHash,
                lastSyncedAt: new Date(),
                totalCommitsSynced: {
                    increment: syncResult.processed
                },
                branch: validatedData.branch,
                repositoryUrl: validatedData.repositoryUrl || project.syncMetadata.repositoryUrl,
            }
        });

        const successResponse: ProjectApiSuccess<SyncResponse> = {
            success: true,
            data: syncResult,
            message: `Synced ${syncResult.processed} commits successfully`
        };

        return NextResponse.json(successResponse);

    } catch (error) {
        console.error('Project sync error:', error);

        if (error instanceof z.ZodError) {
            console.log('Zod validation errors:', error.errors);
            const errorResponse: ProjectApiError = {
                success: false,
                error: 'Validation failed',
                message: 'Invalid request data',
                code: 'VALIDATION_ERROR',
                details: {errors: error.errors}
            };
            return NextResponse.json(errorResponse, {status: 400});
        }

        if (error instanceof Error && error.message.includes('token')) {
            const errorResponse: ProjectApiError = {
                success: false,
                error: 'Unauthorized',
                message: 'Authentication required',
                code: 'AUTH_REQUIRED'
            };
            return NextResponse.json(errorResponse, {status: 401});
        }

        const errorResponse: ProjectApiError = {
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred during sync',
            code: 'SYNC_ERROR'
        };
        return NextResponse.json(errorResponse, {status: 500});
    }
}

async function processSyncRequest(
    projectId: string,
    syncData: SyncRequest,
    syncMetadata: SyncMetadata
): Promise<SyncResponse> {
    const syncedAt = new Date();
    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get existing commits to avoid duplicates
    const existingCommits = await db.syncedCommit.findMany({
        where: {projectId},
        select: {commitHash: true}
    });

    const existingHashes = new Set(existingCommits.map(c => c.commitHash));

    // Process each commit
    for (const commit of syncData.commits) {
        try {
            // Skip if commit already exists
            if (existingHashes.has(commit.hash)) {
                skipped++;
                continue;
            }

            // Validate commit date
            const commitDate = new Date(commit.date);
            if (isNaN(commitDate.getTime())) {
                errors.push(`Invalid date for commit ${commit.hash}: ${commit.date}`);
                continue;
            }

            // Create synced commit record
            await db.syncedCommit.create({
                data: {
                    projectId,
                    commitHash: commit.hash,
                    commitMessage: commit.message,
                    commitAuthor: commit.author,
                    commitEmail: commit.email,
                    commitDate,
                    commitFiles: commit.files,
                    conventionalType: commit.type,
                    conventionalScope: commit.scope,
                    isBreaking: commit.breaking || false,
                    commitBody: commit.body,
                    commitFooter: commit.footer,
                    syncedAt,
                    branch: syncData.branch,
                }
            });

            processed++;

            // Add warning for non-conventional commits
            if (!commit.type && commit.message.includes(':')) {
                warnings.push(`Commit ${commit.hash.substring(0, 7)} appears to follow conventional format but type was not parsed`);
            }

        } catch (commitError) {
            console.error(`Error processing commit ${commit.hash}:`, commitError);
            errors.push(`Failed to process commit ${commit.hash}: ${commitError instanceof Error ? commitError.message : 'Unknown error'}`);
        }
    }

    // Determine new sync hash (last processed commit or provided hash)
    const newSyncHash = syncData.commits.length > 0
        ? syncData.commits[syncData.commits.length - 1]?.hash || syncMetadata.lastSyncHash
        : syncMetadata.lastSyncHash;

    // Calculate next sync recommendation (24 hours from now)
    const nextSyncRecommendedAt = new Date();
    nextSyncRecommendedAt.setHours(nextSyncRecommendedAt.getHours() + 24);

    return {
        success: true,
        processed,
        skipped,
        errors,
        warnings,
        newSyncHash: newSyncHash || '',
        syncedAt: syncedAt.toISOString(),
        nextSyncRecommendedAt: nextSyncRecommendedAt.toISOString(),
    };
}