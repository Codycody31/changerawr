// app/api/projects/[projectId]/integrations/github/tags/route.ts
import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { createGitHubClient } from '@/lib/services/github/client';
import { createGitHubChangelogGenerator } from '@/lib/services/github/changelog-generator';
import { decryptToken } from '@/lib/utils/encryption';

/**
 * @method GET
 * @description Get available tags and releases from GitHub repository
 */
export async function GET(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const { projectId } = await context.params;

        console.log('Fetching GitHub tags for project:', projectId);

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
                { error: 'GitHub integration not configured' },
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

        if (!project.gitHubIntegration.accessToken) {
            console.error('No access token configured for project:', projectId);
            return NextResponse.json(
                { error: 'No access token configured' },
                { status: 400 }
            );
        }

        console.log('GitHub integration config:', {
            repositoryUrl: project.gitHubIntegration.repositoryUrl,
            defaultBranch: project.gitHubIntegration.defaultBranch,
            enabled: project.gitHubIntegration.enabled
        });

        // Decrypt access token and create client
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

        const githubClient = createGitHubClient({
            accessToken,
            repositoryUrl: project.gitHubIntegration.repositoryUrl,
            defaultBranch: project.gitHubIntegration.defaultBranch
        });

        const generator = createGitHubChangelogGenerator(githubClient);

        try {
            console.log('Fetching tags and releases from GitHub...');

            // Get tags and releases in parallel
            const [tags, releases] = await Promise.all([
                generator.getAvailableTags(project.gitHubIntegration.repositoryUrl).catch(error => {
                    console.error('Failed to fetch tags:', error);
                    return [];
                }),
                generator.getAvailableReleases(project.gitHubIntegration.repositoryUrl).catch(error => {
                    console.error('Failed to fetch releases:', error);
                    return [];
                })
            ]);

            console.log('Successfully fetched:', {
                tagsCount: tags.length,
                releasesCount: releases.length
            });

            return NextResponse.json({
                tags: tags || [],
                releases: releases || []
            });

        } catch (githubError) {
            console.error('GitHub API Error:', githubError);

            // Provide more specific error messages
            if (githubError instanceof Error) {
                if (githubError.message.includes('404')) {
                    return NextResponse.json(
                        {
                            error: 'Repository not found',
                            details: 'The repository URL may be incorrect or the token may not have access'
                        },
                        { status: 404 }
                    );
                }

                if (githubError.message.includes('401')) {
                    return NextResponse.json(
                        {
                            error: 'Authentication failed',
                            details: 'The access token is invalid or expired'
                        },
                        { status: 401 }
                    );
                }

                if (githubError.message.includes('403')) {
                    return NextResponse.json(
                        {
                            error: 'Access forbidden',
                            details: 'The access token does not have permission to access this repository'
                        },
                        { status: 403 }
                    );
                }
            }

            return NextResponse.json(
                {
                    error: 'Failed to fetch repository data from GitHub',
                    details: githubError instanceof Error ? githubError.message : 'Unknown error'
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Failed to fetch GitHub tags/releases:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch repository information',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}