import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveTaggerConfig } from '@/lib/services/ai/tagger-detect'

export const runtime = 'nodejs'

/**
 * Public API to fetch changelog-tagger status for the About page, mirroring
 * the pattern used by /api/system/agent-version.
 */
export async function GET() {
    const config = await db.systemConfig.findUnique({
        where: { id: 1 },
        select: { changelogTaggerUrl: true, changelogTaggerApiKey: true },
    })

    const tagger = await resolveTaggerConfig({
        changelogTaggerUrl: config?.changelogTaggerUrl ?? null,
        changelogTaggerApiKey: config?.changelogTaggerApiKey ?? null,
    })

    if (!tagger) {
        return NextResponse.json({ configured: false })
    }

    const headers: Record<string, string> = {}
    if (tagger.apiKey) headers['Authorization'] = `Bearer ${tagger.apiKey}`

    try {
        const res = await fetch(`${tagger.url.replace(/\/$/, '')}/health`, {
            headers,
            signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) {
            return NextResponse.json({ configured: true, autoDetected: tagger.autoDetected, reachable: false })
        }
        const health = await res.json()
        return NextResponse.json({
            configured: true,
            autoDetected: tagger.autoDetected,
            reachable: true,
            modelLoaded: !!health.model_loaded,
            training: !!health.training,
            version: health.version ?? null,
        })
    } catch {
        return NextResponse.json({ configured: true, autoDetected: tagger.autoDetected, reachable: false })
    }
}
