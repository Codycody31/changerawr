import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { z } from 'zod';
import { createGitLabClient } from '@/lib/services/gitlab/client';

const testSchema = z.object({
    repositoryUrl: z.string().url('Invalid repository URL'),
    accessToken: z.string().min(1, 'Access token is required'),
});

export async function POST(
    request: Request,
) {
    try {
        await validateAuthAndGetUser();
        
        const body = await request.json();
        const data = testSchema.parse(body);

        const client = createGitLabClient({ accessToken: data.accessToken, repositoryUrl: data.repositoryUrl });

        try {
            const user = await client.getUser();
            const repo = await client.testConnection(data.repositoryUrl);
            const commits = await client.getCommits(data.repositoryUrl, { per_page: 5 });

            return NextResponse.json({
                success: true,
                user: {
                    username: user.username,
                    id: user.id
                },
                repository: {
                    name: repo.name,
                    fullName: repo.path_with_namespace,
                    private: repo.visibility !== 'public',
                    defaultBranch: repo.default_branch || 'main'
                },
                commitsCount: commits.length,
                message: 'GitLab connection successful'
            });
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
        }
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Validation failed', details: err.errors }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Failed to test GitLab connection' }, { status: 500 });
    }
} 