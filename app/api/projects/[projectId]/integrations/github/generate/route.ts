// app/api/projects/[projectId]/integrations/github/generate/route.ts
import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { createAuditLog } from '@/lib/utils/auditLog';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createGitHubClient, GitHubError } from '@/lib/services/github/client';
import { createGitHubChangelogGenerator, ChangelogGenerationOptions } from '@/lib/services/github/changelog-generator';
import { decryptToken } from '@/lib/utils/encryption';

// Enhanced validation schema for generation options
const generateSchema = z.object({
    // Generation method
    method: z.enum(['recent', 'between_tags', 'between_commits']),

    // For recent method
    daysBack: z.number().min(1).max(365).optional(),

    // For between methods
    fromRef: z.string().optional(),
    toRef: z.string().optional(),

    // AI options
    useAI: z.boolean().default(false),
    aiModel: z.string().optional(),

    // Code analysis options
    includeCodeAnalysis: z.boolean().default(false),
    maxCommitsToAnalyze: z.number().min(1).max(100).default(50),

    // Traditional generation options
    groupByType: z.boolean().default(true),
    includeCommitLinks: z.boolean().default(true),

    // Override integration settings
    includeBreakingChanges: z.boolean().optional(),
    includeFixes: z.boolean().optional(),
    includeFeatures: z.boolean().optional(),
    includeChores: z.boolean().optional(),
    customCommitTypes: z.array(z.string()).optional(),
});

/**
 * @method POST
 * @description Generate changelog content from GitHub commits with optional AI analysis
 */
export async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        const { projectId } = await context.params;

        console.log('Starting GitHub changelog generation for project:', projectId);

        // Get project with GitHub integration
        const project = await db.project.findUnique({
            where: { id: projectId },
            include: { gitHubIntegration: true }
        });

        if (!project) {
            console.error('Project not found:', projectId);
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (!project.gitHubIntegration) {
            console.error('No GitHub integration found for project:', projectId);
            return NextResponse.json(
                { error: 'GitHub integration not configured for this project' },
                { status: 400 }
            );
        }

        if (!project.gitHubIntegration.enabled) {
            console.error('GitHub integration disabled for project:', projectId);
            return NextResponse.json(
                { error: 'GitHub integration is disabled' },
                { status: 400 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        console.log('Request body:', body);

        const validatedData = generateSchema.parse(body);
        console.log('Validated data:', validatedData);

        // Validate method-specific requirements
        if (validatedData.method === 'recent' && !validatedData.daysBack) {
            return NextResponse.json(
                { error: 'daysBack is required for recent method' },
                { status: 400 }
            );
        }

        if (
            (validatedData.method === 'between_tags' || validatedData.method === 'between_commits') &&
            (!validatedData.fromRef || !validatedData.toRef)
        ) {
            return NextResponse.json(
                { error: 'fromRef and toRef are required for between methods' },
                { status: 400 }
            );
        }

        // Decrypt access token
        let accessToken: string;
        try {
            accessToken = decryptToken(project.gitHubIntegration.accessToken);
            console.log('Access token decrypted successfully');
        } catch (decryptError) {
            console.error('Failed to decrypt access token:', decryptError);
            return NextResponse.json(
                { error: 'Invalid access token configuration' },
                { status: 500 }
            );
        }

        // Create GitHub client and generator
        const githubClient = createGitHubClient({
            accessToken,
            repositoryUrl: project.gitHubIntegration.repositoryUrl,
            defaultBranch: project.gitHubIntegration.defaultBranch
        });

        const generator = createGitHubChangelogGenerator(githubClient);

        // Get AI settings if needed
        let aiApiKey: string | undefined;
        let aiModel: string | undefined;
        if (validatedData.useAI) {
            const systemConfig = await db.systemConfig.findFirst({
                where: { id: 1 },
                select: {
                    aiApiKey: true,
                    enableAIAssistant: true,
                    aiDefaultModel: true
                }
            });

            if (!systemConfig?.enableAIAssistant || !systemConfig.aiApiKey) {
                return NextResponse.json(
                    { error: 'AI assistant is not enabled or configured' },
                    { status: 400 }
                );
            }

            aiApiKey = systemConfig.aiApiKey;
            aiModel = validatedData.aiModel || systemConfig.aiDefaultModel || 'copilot-zero';
        }

        // Prepare generation options
        const generationOptions: ChangelogGenerationOptions = {
            includeBreakingChanges: validatedData.includeBreakingChanges ?? project.gitHubIntegration.includeBreakingChanges,
            includeFixes: validatedData.includeFixes ?? project.gitHubIntegration.includeFixes,
            includeFeatures: validatedData.includeFeatures ?? project.gitHubIntegration.includeFeatures,
            includeChores: validatedData.includeChores ?? project.gitHubIntegration.includeChores,
            customCommitTypes: validatedData.customCommitTypes ?? project.gitHubIntegration.customCommitTypes,
            useAI: validatedData.useAI,
            aiApiKey,
            aiModel,
            groupByType: validatedData.groupByType,
            includeCommitLinks: validatedData.includeCommitLinks,
            repositoryUrl: project.gitHubIntegration.repositoryUrl,
            includeCodeAnalysis: validatedData.includeCodeAnalysis,
            maxCommitsToAnalyze: validatedData.maxCommitsToAnalyze
        };

        console.log('Generation options:', {
            ...generationOptions,
            aiApiKey: generationOptions.aiApiKey ? '[REDACTED]' : undefined
        });

        // Log generation attempt
        await createAuditLog(
            'GITHUB_CHANGELOG_GENERATION_ATTEMPT',
            user.id,
            user.id,
            {
                projectId,
                projectName: project.name,
                method: validatedData.method,
                daysBack: validatedData.daysBack,
                fromRef: validatedData.fromRef,
                toRef: validatedData.toRef,
                useAI: validatedData.useAI,
                includeCodeAnalysis: validatedData.includeCodeAnalysis,
                maxCommitsToAnalyze: validatedData.maxCommitsToAnalyze,
                repositoryUrl: project.gitHubIntegration.repositoryUrl,
                timestamp: new Date().toISOString()
            }
        );

        // Generate changelog based on method
        let changelog;
        try {
            console.log(`Generating changelog using method: ${validatedData.method}`);

            switch (validatedData.method) {
                case 'recent':
                    console.log(`Fetching commits from last ${validatedData.daysBack} days`);
                    changelog = await generator.generateChangelogFromRecent(
                        project.gitHubIntegration.repositoryUrl,
                        validatedData.daysBack!,
                        generationOptions
                    );
                    break;

                case 'between_tags':
                case 'between_commits':
                    console.log(`Fetching commits between ${validatedData.fromRef} and ${validatedData.toRef}`);
                    changelog = await generator.generateChangelogBetweenRefs(
                        project.gitHubIntegration.repositoryUrl,
                        validatedData.fromRef!,
                        validatedData.toRef!,
                        generationOptions
                    );
                    break;

                default:
                    throw new Error('Invalid generation method');
            }

            console.log(`Successfully generated changelog with ${changelog.commits.length} commits`);

        } catch (error) {
            console.error('Changelog generation error:', error);

            // Log generation failure with more details
            await createAuditLog(
                'GITHUB_CHANGELOG_GENERATION_FAILED',
                user.id,
                user.id,
                {
                    projectId,
                    method: validatedData.method,
                    repositoryUrl: project.gitHubIntegration.repositoryUrl,
                    useAI: validatedData.useAI,
                    includeCodeAnalysis: validatedData.includeCodeAnalysis,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    timestamp: new Date().toISOString()
                }
            );

            // Provide better error messages based on error type
            if (error instanceof GitHubError) {
                if (error.statusCode === 404) {
                    return NextResponse.json(
                        {
                            error: 'Repository, branch, or tag not found',
                            details: 'Please check that the repository URL and references are correct'
                        },
                        { status: 404 }
                    );
                }

                if (error.statusCode === 403 || error.statusCode === 401) {
                    return NextResponse.json(
                        {
                            error: 'GitHub access denied',
                            details: 'Your access token may be invalid or lack necessary permissions'
                        },
                        { status: 401 }
                    );
                }

                if (error.message.includes('rate limit')) {
                    return NextResponse.json(
                        {
                            error: 'GitHub API rate limit exceeded',
                            details: 'Please try again later or use a different access token'
                        },
                        { status: 429 }
                    );
                }

                return NextResponse.json(
                    {
                        error: 'GitHub API error',
                        details: error.message
                    },
                    { status: error.statusCode }
                );
            }

            if (error instanceof Error) {
                return NextResponse.json(
                    {
                        error: 'Changelog generation failed',
                        details: error.message
                    },
                    { status: 500 }
                );
            }

            throw error;
        }

        // Update last sync time
        await db.gitHubIntegration.update({
            where: { projectId },
            data: {
                lastSyncAt: new Date(),
                lastCommitSha: changelog.commits[0]?.sha
            }
        });

        // Get current timestamp for logging
        const currentTimestamp = new Date().toISOString();

        // Log successful generation
        await createAuditLog(
            'GITHUB_CHANGELOG_GENERATION_SUCCESS',
            user.id,
            user.id,
            {
                projectId,
                projectName: project.name,
                method: validatedData.method,
                commitsProcessed: changelog.commits.length,
                entriesGenerated: changelog.entries.length,
                contentLength: changelog.content.length,
                inferredVersion: changelog.version,
                useAI: validatedData.useAI,
                aiGenerated: changelog.metadata.aiGenerated,
                hasCodeAnalysis: changelog.metadata.hasCodeAnalysis,
                model: changelog.metadata.model,
                timestamp: currentTimestamp
            }
        );

        // Prepare response
        const response = {
            success: true,
            changelog: {
                content: changelog.content,
                version: changelog.version,
                commitsCount: changelog.commits.length,
                entriesCount: changelog.entries.length,
                entries: changelog.entries.map(entry => ({
                    category: entry.category,
                    description: entry.description,
                    impact: entry.impact,
                    technicalDetails: entry.technicalDetails,
                    files: entry.files,
                    commit: entry.commit.substring(0, 7)
                }))
            },
            metadata: {
                method: validatedData.method,
                generatedAt: currentTimestamp,
                repositoryUrl: project.gitHubIntegration.repositoryUrl,
                fromRef: validatedData.fromRef,
                toRef: validatedData.toRef,
                daysBack: validatedData.daysBack,
                aiEnhanced: validatedData.useAI,
                codeAnalysis: validatedData.includeCodeAnalysis,
                totalCommits: changelog.metadata.totalCommits,
                analyzedCommits: changelog.metadata.analyzedCommits,
                aiGenerated: changelog.metadata.aiGenerated,
                hasCodeAnalysis: changelog.metadata.hasCodeAnalysis,
                model: changelog.metadata.model
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Failed to generate changelog from GitHub:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        // Handle other errors
        return NextResponse.json(
            {
                error: 'Failed to generate changelog from GitHub',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}