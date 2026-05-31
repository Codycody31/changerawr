import { NextRequest, NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { decryptToken } from '@/lib/utils/encryption';

const SECTON_BASE = 'https://api.secton.org/v1';

/**
 * POST /api/ai/suggest-tags
 * Priority: changelog-tagger → Secton/custom AI → 503
 *
 * Body: { content: string, tags: string[] }
 * When using changelog-tagger, tags may be empty — the tagger falls back to its own 19-tag set.
 */
export async function POST(request: NextRequest) {
  try {
    await validateAuthAndGetUser();

    const { content, tags: availableTagNames } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return NextResponse.json({ error: 'Content too short' }, { status: 400 });
    }
    if (!Array.isArray(availableTagNames)) {
      return NextResponse.json({ error: 'tags must be an array' }, { status: 400 });
    }

    const config = await db.systemConfig.findUnique({
      where: { id: 1 },
      select: {
        changelogTaggerUrl: true,
        changelogTaggerApiKey: true,
        enableAIAssistant: true,
        aiApiKey: true,
        aiApiUrl: true,
        aiDefaultModel: true,
      },
    });

    // --- Priority 1: changelog-tagger ---
    if (config?.changelogTaggerUrl) {
      const base = config.changelogTaggerUrl.replace(/\/$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (config.changelogTaggerApiKey) {
        try {
          headers['Authorization'] = `Bearer ${decryptToken(config.changelogTaggerApiKey)}`;
        } catch { /* proceed without auth */ }
      }

      // Always pass project tags so the tagger scores against them.
      // If no project tags exist yet, omit the field — tagger falls back to its built-in 19-tag set.
      const body: Record<string, unknown> = { content: content.trim(), threshold: 0.025, include_evidence: true };
      if (availableTagNames.length > 0) body.tags = availableTagNames;

      const res = await fetch(`${base}/api/v1/tag`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) throw new Error(`changelog-tagger returned ${res.status}`);

      const data = await res.json();

      // Extract a short synopsis per tag from the evidence block
      const synopsis: Record<string, string> = {};
      if (data.evidence && typeof data.evidence === 'object') {
        for (const [tagName, ev] of Object.entries(data.evidence)) {
          const e = ev as Record<string, string>;
          synopsis[tagName] = e.reason || e.narrative || '';
        }
      }

      return NextResponse.json({ tags: Array.isArray(data.tags) ? data.tags : [], source: 'tagger', synopsis });
    }

    // --- Priority 2: AI ---
    if (!config?.enableAIAssistant || !config.aiApiKey) {
      return NextResponse.json({ error: 'No tag suggestion service configured' }, { status: 503 });
    }
    if (availableTagNames.length === 0) {
      return NextResponse.json({ error: 'No tags provided' }, { status: 400 });
    }

    const baseUrl = config.aiApiUrl ? config.aiApiUrl.replace(/\/$/, '') : SECTON_BASE;
    const prompt = `Categorize this changelog with appropriate tags.\nAvailable tags: ${availableTagNames.join(', ')}\n\nReturn only matching tag names (max 3), comma-separated. No explanations.\n\n${content.trim().slice(0, 2000)}`;

    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.aiApiKey}` },
      body: JSON.stringify({
        model: config.aiDefaultModel || 'copilot-zero',
        messages: [
          { role: 'system', content: 'You are a changelog tagger. Select relevant tags from the list provided.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 40,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!aiRes.ok) throw new Error(`AI returned ${aiRes.status}`);

    const aiData = await aiRes.json();
    let responseText = '';
    if (aiData.messages?.length) responseText = aiData.messages[aiData.messages.length - 1]?.content ?? '';
    else if (aiData.choices?.length) responseText = aiData.choices[0]?.message?.content ?? '';

    const suggested = responseText
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean)
      .map((name: string) => availableTagNames.find(t => t.toLowerCase() === name.toLowerCase()))
      .filter(Boolean) as string[];

    return NextResponse.json({ tags: suggested, source: 'ai' });
  } catch (error) {
    console.error('[suggest-tags]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to suggest tags' },
      { status: 500 }
    );
  }
}
