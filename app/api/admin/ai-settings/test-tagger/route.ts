import { NextRequest, NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';

/**
 * POST /api/admin/ai-settings/test-tagger
 * Hits the changelog-tagger /health endpoint to verify connectivity.
 * Body: { url: string, apiKey?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await validateAuthAndGetUser();
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { url, apiKey } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const base = url.replace(/\/$/, '');
    const headers: Record<string, string> = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(`${base}/health`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, message: `Service returned ${res.status}` });
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      modelLoaded: data.model_loaded ?? null,
      message: data.model_loaded ? 'Connected — model loaded and ready.' : 'Connected, but model not yet loaded.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return NextResponse.json({ success: false, message });
  }
}
