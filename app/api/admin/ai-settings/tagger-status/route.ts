import { NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { proxyTaggerStream } from '@/lib/services/ai/tagger-stream-proxy';

/**
 * GET /api/admin/ai-settings/tagger-status
 * Admin-only SSE training-progress stream, for the AI Settings page.
 */
export async function GET() {
  const user = await validateAuthAndGetUser();
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return proxyTaggerStream();
}
