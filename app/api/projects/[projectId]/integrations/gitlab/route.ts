import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { createAuditLog } from '@/lib/utils/auditLog';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createGitLabClient } from '@/lib/services/gitlab/client';
import { encryptToken, decryptToken } from '@/lib/utils/encryption';

const gitlabIntegrationSchema = z.object({
    repositoryUrl: z.string().url('Invalid repository URL'),
    accessToken: z.string().min(1, 'Access token is required').optional(),
    defaultBranch: z.string().default('main'),
    includeBreakingChanges: z.boolean().default(true),
    includeFixes: z.boolean().default(true),
    includeFeatures: z.boolean().default(true),
    includeChores: z.boolean().default(false),
    customCommitTypes: z.array(z.string()).default([]),
    enabled: z.boolean().default(true),
});

export async function GET(
    _request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        await validateAuthAndGetUser();
        const { projectId } = await context.params;

        const project = await db.project.findUnique({
            where: { id: projectId },
            include: { gitLabIntegration: true } as any
        } as any);

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if ((project as any).gitLabIntegration) {
            const { accessToken, ...safe } = (project as any).gitLabIntegration;
            return NextResponse.json({ ...safe, hasAccessToken: !!accessToken });
        }

        return NextResponse.json(null);
    } catch (err) {
        console.error('Failed to fetch GitLab integration:', err);
        return NextResponse.json({ error: 'Failed to fetch integration settings' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        const { projectId } = await context.params;

        const project = await db.project.findUnique({ where: { id: projectId } });
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const body = await request.json();
        const data = gitlabIntegrationSchema.parse(body);

        const existing = await (db as any).gitLabIntegration.findUnique({ where: { projectId } });

        let tokenToUse = data.accessToken;
        let encryptedToken: string;

        if (!data.accessToken && existing) {
            tokenToUse = decryptToken(existing.accessToken);
            encryptedToken = existing.accessToken;
        } else if (data.accessToken) {
            encryptedToken = encryptToken(data.accessToken);
        } else {
            return NextResponse.json({ error: 'Access token is required for new integrations' }, { status: 400 });
        }

        // Test connection
        const client = createGitLabClient({ accessToken: tokenToUse as string, repositoryUrl: data.repositoryUrl });
        try {
            await client.testConnection(data.repositoryUrl);
        } catch (error) {
            console.error('GitLab connection failed:', error);
            return NextResponse.json({ error: 'Failed to connect to GitLab repository' }, { status: 400 });
        }

        const integration = await (db as any).gitLabIntegration.upsert({
            where: { projectId },
            create: {
                projectId,
                repositoryUrl: data.repositoryUrl,
                accessToken: encryptedToken,
                defaultBranch: data.defaultBranch,
                includeBreakingChanges: data.includeBreakingChanges,
                includeFixes: data.includeFixes,
                includeFeatures: data.includeFeatures,
                includeChores: data.includeChores,
                customCommitTypes: data.customCommitTypes,
                enabled: data.enabled
            },
            update: {
                repositoryUrl: data.repositoryUrl,
                accessToken: encryptedToken,
                defaultBranch: data.defaultBranch,
                includeBreakingChanges: data.includeBreakingChanges,
                includeFixes: data.includeFixes,
                includeFeatures: data.includeFeatures,
                includeChores: data.includeChores,
                customCommitTypes: data.customCommitTypes,
                enabled: data.enabled,
                updatedAt: new Date()
            }
        });

        await createAuditLog('GITLAB_INTEGRATION_CONFIGURED', user.id, user.id, {
            projectId,
            repositoryUrl: data.repositoryUrl,
            enabled: data.enabled,
            timestamp: new Date().toISOString()
        });

        const { ...safe } = integration;
        return NextResponse.json({ ...safe, hasAccessToken: true });
    } catch (err) {
        console.error('Failed to configure GitLab integration:', err);
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to configure GitLab integration' }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        const { projectId } = await context.params;

        const deleted = await (db as any).gitLabIntegration.delete({ where: { projectId } });
        await createAuditLog('GITLAB_INTEGRATION_REMOVED', user.id, user.id, {
            projectId,
            repositoryUrl: deleted.repositoryUrl,
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Failed to remove GitLab integration:', err);
        return NextResponse.json({ error: 'Failed to remove GitLab integration' }, { status: 500 });
    }
} 