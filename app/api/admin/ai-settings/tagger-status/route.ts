import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { resolveTaggerConfig } from '@/lib/services/ai/tagger-detect';

/**
 * GET /api/admin/ai-settings/tagger-status
 * Server-Sent Events proxy for the changelog-tagger's /api/v1/training/stream
 * endpoint. Proxied (rather than hit directly from the browser) because the
 * tagger may not be publicly reachable and its API key must stay server-side.
 */
export async function GET() {
  const user = await validateAuthAndGetUser();
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const config = await db.systemConfig.findUnique({
    where: { id: 1 },
    select: { changelogTaggerUrl: true, changelogTaggerApiKey: true },
  });

  const tagger = await resolveTaggerConfig({
    changelogTaggerUrl: config?.changelogTaggerUrl ?? null,
    changelogTaggerApiKey: config?.changelogTaggerApiKey ?? null,
  });

  if (!tagger) {
    return NextResponse.json({ error: 'No tagger service configured or detected' }, { status: 503 });
  }

  const base = tagger.url.replace(/\/$/, '');
  const headers: Record<string, string> = {};
  if (tagger.apiKey) headers['Authorization'] = `Bearer ${tagger.apiKey}`;

  let upstream: Response;
  try {
    // No timeout here — this is a live status feed meant to stay open for as
    // long as the admin page is. A hard deadline would kill a perfectly
    // healthy connection and force the browser's EventSource into an
    // endless reconnect loop. The upstream sends its own keep-alive
    // heartbeats, and the connection closes naturally when the client does.
    upstream = await fetch(`${base}/api/v1/training/stream`, { headers });
  } catch {
    return NextResponse.json({ error: 'Tagger service unreachable' }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `Tagger returned ${upstream.status}` }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
