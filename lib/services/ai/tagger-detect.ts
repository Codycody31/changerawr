import { decryptToken } from '@/lib/utils/encryption';

// Default address of the bundled tag-ai sidecar (see docker-entrypoint.sh).
// Only used as a fallback when no explicit changelogTaggerUrl is configured.
const LOCAL_TAGGER_URL = process.env.CHANGELOG_TAGGER_URL || 'http://127.0.0.1:31672';

let cachedLocalDetection: { url: string; checkedAt: number } | null = null;
const DETECTION_TTL_MS = 60_000;

async function isLocalTaggerReachable(): Promise<boolean> {
    if (cachedLocalDetection && Date.now() - cachedLocalDetection.checkedAt < DETECTION_TTL_MS) {
        return true;
    }
    try {
        const res = await fetch(`${LOCAL_TAGGER_URL}/health`, {
            signal: AbortSignal.timeout(500),
        });
        if (!res.ok) return false;
        cachedLocalDetection = { url: LOCAL_TAGGER_URL, checkedAt: Date.now() };
        return true;
    } catch {
        return false;
    }
}

export interface ResolvedTaggerConfig {
    url: string;
    apiKey: string | null;
    /** true when this came from the bundled sidecar rather than explicit admin config */
    autoDetected: boolean;
}

/**
 * Resolves the changelog-tagger service to use. An explicitly configured
 * changelogTaggerUrl always wins (covers external/self-hosted setups). If
 * nothing is configured, probes for the tagger sidecar bundled in this
 * project's own Docker image so it works with zero setup out of the box.
 */
export async function resolveTaggerConfig(config: {
    changelogTaggerUrl: string | null;
    changelogTaggerApiKey: string | null;
}): Promise<ResolvedTaggerConfig | null> {
    if (config.changelogTaggerUrl) {
        let apiKey: string | null = null;
        if (config.changelogTaggerApiKey) {
            try {
                apiKey = decryptToken(config.changelogTaggerApiKey);
            } catch {
                apiKey = null;
            }
        }
        return { url: config.changelogTaggerUrl, apiKey, autoDetected: false };
    }

    if (await isLocalTaggerReachable()) {
        return { url: LOCAL_TAGGER_URL, apiKey: null, autoDetected: true };
    }

    return null;
}
