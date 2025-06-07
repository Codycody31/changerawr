// app/api/projects/[projectId]/integrations/github/route.ts
import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { createAuditLog } from '@/lib/utils/auditLog';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createGitHubClient } from '@/lib/services/github/client';
import { encryptToken, decryptToken } from '@/lib/utils/encryption';

// Validation schema for GitHub integration
const githubIntegrationSchema = z.object({
    repositoryUrl: z.string().url('Invalid repository URL'),
    accessToken: z.string().min(1, 'Access token is required').optional(), // Make optional for updates
    defaultBranch: z.string().default('main'),
    includeBreakingChanges: z.boolean().default(true),
    includeFixes: z.boolean().default(true),
    includeFeatures: z.boolean().default(true),
    includeChores: z.boolean().default(false),
    customCommitTypes: z.array(z.string()).default([]),
    enabled: z.boolean().default(true),
});

/**
 * @method GET
 * @description Get GitHub integration settings for a project
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const { projectId } = await context.params;

        const project = await db.project.findUnique({
            where: { id: projectId },
            include: { gitHubIntegration: true }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Return settings without sensitive data
        if (project.gitHubIntegration) {
            const { accessToken, ...safeSettings } = project.gitHubIntegration;
            return NextResponse.json({
                ...safeSettings,
                hasAccessToken: !!accessToken
            });
        }

        return NextResponse.json(null);

    } catch (error) {
        console.error('Failed to fetch GitHub integration:', error);
        return NextResponse.json(
            { error: 'Failed to fetch integration settings' },
            { status: 500 }
        );
    }
}

/**
 * @method POST
 * @description Create or update GitHub integration
 */
export async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        const { projectId } = await context.params;

        // Verify project exists
        const project = await db.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = githubIntegrationSchema.parse(body);

        // Check if we have an existing integration
        const existingIntegration = await db.gitHubIntegration.findUnique({
            where: { projectId }
        });

        // For updates without a new token, use the existing token
        let accessTokenToTest = validatedData.accessToken;
        let encryptedTokenToStore: string;

        if (!validatedData.accessToken && existingIntegration) {
            // No new token provided, use existing one for testing
            accessTokenToTest = decryptToken(existingIntegration.accessToken);
            encryptedTokenToStore = existingIntegration.accessToken; // Keep existing encrypted token
            console.log('Using existing access token for update');
        } else if (validatedData.accessToken) {
            // New token provided, encrypt it
            encryptedTokenToStore = encryptToken(validatedData.accessToken);
            console.log('Using new access token');
        } else {
            // No token at all and no existing integration
            return NextResponse.json(
                { error: 'Access token is required for new integrations' },
                { status: 400 }
            );
        }

        // Test GitHub connection with the token we're going to use
        const githubClient = createGitHubClient({
            accessToken: accessTokenToTest as string,
            repositoryUrl: validatedData.repositoryUrl,
            defaultBranch: validatedData.defaultBranch
        });

        try {
            const repoInfo = await githubClient.testConnection(validatedData.repositoryUrl);
            console.log('GitHub connection test successful:', repoInfo.name);
        } catch (githubError) {
            console.error('GitHub connection test failed:', githubError);
            return NextResponse.json(
                {
                    error: 'Failed to connect to GitHub repository',
                    details: githubError instanceof Error ? githubError.message : 'Unknown error'
                },
                { status: 400 }
            );
        }

        // Create or update integration
        const integration = await db.gitHubIntegration.upsert({
            where: { projectId },
            create: {
                projectId,
                repositoryUrl: validatedData.repositoryUrl,
                accessToken: encryptedTokenToStore,
                defaultBranch: validatedData.defaultBranch,
                includeBreakingChanges: validatedData.includeBreakingChanges,
                includeFixes: validatedData.includeFixes,
                includeFeatures: validatedData.includeFeatures,
                includeChores: validatedData.includeChores,
                customCommitTypes: validatedData.customCommitTypes,
                enabled: validatedData.enabled,
            },
            update: {
                repositoryUrl: validatedData.repositoryUrl,
                accessToken: encryptedTokenToStore, // Only update if new token provided
                defaultBranch: validatedData.defaultBranch,
                includeBreakingChanges: validatedData.includeBreakingChanges,
                includeFixes: validatedData.includeFixes,
                includeFeatures: validatedData.includeFeatures,
                includeChores: validatedData.includeChores,
                customCommitTypes: validatedData.customCommitTypes,
                enabled: validatedData.enabled,
                updatedAt: new Date(),
            }
        });

        // Log integration setup
        await createAuditLog(
            'GITHUB_INTEGRATION_CONFIGURED',
            user.id,
            user.id,
            {
                projectId,
                projectName: project.name,
                repositoryUrl: validatedData.repositoryUrl,
                defaultBranch: validatedData.defaultBranch,
                enabled: validatedData.enabled,
                timestamp: new Date().toISOString()
            }
        );

        // Return safe data
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { accessToken, ...safeIntegration } = integration;
        return NextResponse.json({
            ...safeIntegration,
            hasAccessToken: true
        });

    } catch (error) {
        console.error('Failed to configure GitHub integration:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to configure GitHub integration' },
            { status: 500 }
        );
    }
}

/**
 * @method DELETE
 * @description Remove GitHub integration
 */
export async function DELETE(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        const { projectId } = await context.params;

        const deleted = await db.gitHubIntegration.delete({
            where: { projectId }
        });

        await createAuditLog(
            'GITHUB_INTEGRATION_REMOVED',
            user.id,
            user.id,
            {
                projectId,
                repositoryUrl: deleted.repositoryUrl,
                timestamp: new Date().toISOString()
            }
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to remove GitHub integration:', error);
        return NextResponse.json(
            { error: 'Failed to remove GitHub integration' },
            { status: 500 }
        );
    }
}
