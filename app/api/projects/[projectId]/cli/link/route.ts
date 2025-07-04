import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {
    ProjectLinkRequest,
    ProjectLinkResponse,
    ProjectApiError,
    ProjectApiSuccess
} from '@/lib/types/cli/project-api';

const linkRequestSchema = z.object({
    repositoryUrl: z.string().url().optional(),
    branch: z.string().min(1).optional(),
    localPath: z.string().optional(),
});

/**
 * @method POST
 * @description Link a project to a Git repository for CLI integration
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "repositoryUrl": {
 *       "type": "string",
 *       "format": "uri",
 *       "description": "Git repository URL"
 *     },
 *     "branch": {
 *       "type": "string",
 *       "description": "Default branch for syncing"
 *     },
 *     "localPath": {
 *       "type": "string",
 *       "description": "Local path reference"
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
 *         "message": { "type": "string" },
 *         "linkId": { "type": "string" },
 *         "linkedAt": { "type": "string" }
 *       }
 *     }
 *   }
 * }
 * @error 400 Invalid request data
 * @error 401 Unauthorized
 * @error 404 Project not found
 * @error 409 Project already linked
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
        const validatedData = linkRequestSchema.parse(body) as ProjectLinkRequest;

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

        // Check if project is already linked
        if (project.syncMetadata) {
            const errorResponse: ProjectApiError = {
                success: false,
                error: 'Project already linked',
                message: 'This project is already linked to a repository',
                code: 'PROJECT_ALREADY_LINKED',
                details: {
                    repositoryUrl: project.syncMetadata.repositoryUrl,
                    linkedAt: project.syncMetadata.createdAt.toISOString()
                }
            };
            return NextResponse.json(errorResponse, {status: 409});
        }

        // Create sync metadata
        const syncMetadata = await db.projectSyncMetadata.create({
            data: {
                projectId: project.id,
                repositoryUrl: validatedData.repositoryUrl,
                branch: validatedData.branch || 'main',
                totalCommitsSynced: 0,
            }
        });

        // Update project with link information
        await db.project.update({
            where: {id: project.id},
            data: {
                updatedAt: new Date()
            }
        });

        // Create response
        const linkResponse: ProjectLinkResponse = {
            success: true,
            message: 'Project linked successfully',
            linkId: syncMetadata.id,
            linkedAt: syncMetadata.createdAt.toISOString()
        };

        const successResponse: ProjectApiSuccess<ProjectLinkResponse> = {
            success: true,
            data: linkResponse,
            message: 'Project linked to repository'
        };

        return NextResponse.json(successResponse);

    } catch (error) {
        console.error('Project link error:', error);

        if (error instanceof z.ZodError) {
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
            message: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR'
        };
        return NextResponse.json(errorResponse, {status: 500});
    }
}