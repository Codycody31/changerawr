import { NextRequest, NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { decryptToken } from '@/lib/utils/encryption';

/**
 * POST /api/ai/tag-feedback
 * Forwards human-corrected tag labels to changelog-tagger for retraining.
 * Body: { content: string, tags: string[] }
 * No-ops silently if changelog-tagger is not configured.
 */
export async function POST(request: NextRequest) {
  try {
    await validateAuthAndGetUser();

    const { content, tags } = await request.json();

    if (!content || !Array.isArray(tags)) {
      return NextResponse.json({ error: 'content and tags are required' }, { status: 400 });
    }

    const config = await db.systemConfig.findUnique({
      where: { id: 1 },
      select: { changelogTaggerUrl: true, changelogTaggerApiKey: true },
    });

    if (!config?.changelogTaggerUrl) {
      return NextResponse.json({ status: 'noop', reason: 'changelog-tagger not configured' });
    }

    const base = config.changelogTaggerUrl.replace(/\/$/, '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (config.changelogTaggerApiKey) {
      try {
        headers['Authorization'] = `Bearer ${decryptToken(config.changelogTaggerApiKey)}`;
      } catch { /* proceed without auth */ }
    }

    const res = await fetch(`${base}/api/v1/feedback`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content, tags }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Tagger returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ status: 'ok', record_count: data.record_count });
  } catch (error) {
    console.error('[tag-feedback]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
