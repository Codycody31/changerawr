import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { createGitLabClient } from '@/lib/services/gitlab/client';
import { decryptToken } from '@/lib/utils/encryption';

export async function GET(
    _req: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const { projectId } = await context.params;

        const project = await db.project.findUnique({
            where: { id: projectId },
            include: { gitLabIntegration: true } as any
        } as any);

        if (!project || !(project as any).gitLabIntegration) {
            return NextResponse.json({ error: 'GitLab integration not configured' }, { status: 400 });
        }

        const integration = (project as any).gitLabIntegration;
        if (!integration.enabled) {
            return NextResponse.json({ error: 'GitLab integration is disabled' }, { status: 400 });
        }

        const accessToken = decryptToken(integration.accessToken);
        const client = createGitLabClient({ accessToken, repositoryUrl: integration.repositoryUrl });

        const [tags, releases] = await Promise.all([
            client.getTags(integration.repositoryUrl).catch(() => []),
            client.getReleases(integration.repositoryUrl).catch(() => [])
        ]);

        return NextResponse.json({ tags, releases });
    } catch (err) {
        console.error('Failed to fetch GitLab tags:', err);
        return NextResponse.json({ error: 'Failed to fetch repository information' }, { status: 500 });
    }
} 