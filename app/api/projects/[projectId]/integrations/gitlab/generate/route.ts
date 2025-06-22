import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { createAuditLog } from '@/lib/utils/auditLog';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createGitLabClient } from '@/lib/services/gitlab/client';
import { createGitLabChangelogGenerator, ChangelogGenerationOptions } from '@/lib/services/gitlab/changelog-generator';
import { decryptToken } from '@/lib/utils/encryption';

const generateSchema = z.object({
    method: z.enum(['recent', 'between_tags', 'between_commits']),
    daysBack: z.number().min(1).max(365).optional(),
    fromRef: z.string().optional(),
    toRef: z.string().optional(),
    useAI: z.boolean().default(false),
    aiModel: z.string().optional(),
    includeCodeAnalysis: z.boolean().default(false),
    maxCommitsToAnalyze: z.number().min(1).max(100).default(50),
    groupByType: z.boolean().default(true),
    includeCommitLinks: z.boolean().default(true),
    includeBreakingChanges: z.boolean().optional(),
    includeFixes: z.boolean().optional(),
    includeFeatures: z.boolean().optional(),
    includeChores: z.boolean().optional(),
    customCommitTypes: z.array(z.string()).optional(),
});

export async function POST(
    request: Request,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await validateAuthAndGetUser();
        const { projectId } = await context.params;

        const project = await db.project.findUnique({
            where: { id: projectId },
            include: { gitLabIntegration: true } as any
        } as any);

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const integration = (project as any).gitLabIntegration;

        if (!integration) {
            return NextResponse.json({ error: 'GitLab integration not configured' }, { status: 400 });
        }
        if (!integration.enabled) {
            return NextResponse.json({ error: 'GitLab integration is disabled' }, { status: 400 });
        }

        const body = await request.json();
        const data = generateSchema.parse(body);

        if (data.method === 'recent' && !data.daysBack) {
            return NextResponse.json({ error: 'daysBack is required for recent method' }, { status: 400 });
        }
        if ((data.method === 'between_tags' || data.method === 'between_commits') && (!data.fromRef || !data.toRef)) {
            return NextResponse.json({ error: 'fromRef and toRef required for between methods' }, { status: 400 });
        }

        const accessToken = decryptToken(integration.accessToken);
        const client = createGitLabClient({ accessToken, repositoryUrl: integration.repositoryUrl });
        const generator = createGitLabChangelogGenerator(client);

        const generationOptions: ChangelogGenerationOptions = {
            includeBreakingChanges: data.includeBreakingChanges ?? integration.includeBreakingChanges,
            includeFixes: data.includeFixes ?? integration.includeFixes,
            includeFeatures: data.includeFeatures ?? integration.includeFeatures,
            includeChores: data.includeChores ?? integration.includeChores,
            customCommitTypes: data.customCommitTypes ?? integration.customCommitTypes,
            useAI: data.useAI,
            groupByType: data.groupByType,
            includeCommitLinks: data.includeCommitLinks,
            repositoryUrl: integration.repositoryUrl,
            includeCodeAnalysis: data.includeCodeAnalysis,
            maxCommitsToAnalyze: data.maxCommitsToAnalyze,
        };

        let changelog;
        if (data.method === 'recent') {
            changelog = await generator.generateChangelogFromRecent(integration.repositoryUrl, data.daysBack!, generationOptions);
        } else {
            changelog = await generator.generateChangelogBetweenRefs(integration.repositoryUrl, data.fromRef!, data.toRef!, generationOptions);
        }

        await (db as any).gitLabIntegration.update({
            where: { projectId },
            data: { lastSyncAt: new Date(), lastCommitSha: changelog.commits[0]?.sha }
        });

        await createAuditLog('GITLAB_CHANGELOG_GENERATION_SUCCESS', user.id, user.id, {
            projectId,
            commitsProcessed: changelog.commits.length,
            entriesGenerated: changelog.entries.length,
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({ success: true, changelog });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 });
        }
        console.error('Failed to generate GitLab changelog:', err);
        return NextResponse.json({ error: 'Failed to generate changelog from GitLab' }, { status: 500 });
    }
} 