import { decryptToken } from '@/lib/utils/encryption';

// Default address of the bundled tag-ai sidecar (see docker-entrypoint.sh).
// Only used as a fallback when no explicit changelogTaggerUrl is configured.
const LOCAL_TAGGER_URL = process.env.CHANGELOG_TAGGER_URL || 'http://127.0.0.1:31672';

let cachedLocalDetection: { reachable: boolean; checkedAt: number } | null = null;
// Cache a positive result longer than a negative one — a container that's
// briefly slow (e.g. mid-training, or just starting up) shouldn't get
// written off for a full minute after one bad probe.
const POSITIVE_TTL_MS = 60_000;
const NEGATIVE_TTL_MS = 5_000;

async function isLocalTaggerReachable(): Promise<boolean> {
    if (cachedLocalDetection) {
        const ttl = cachedLocalDetection.reachable ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS;
        if (Date.now() - cachedLocalDetection.checkedAt < ttl) {
            return cachedLocalDetection.reachable;
        }
    }
    try {
        // 500ms was too tight for a real production container (network
        // latency, a busy event loop mid-training, cold start) — false
        // negatives here silently disable the tagger instead of just being
        // slow to detect it.
        const res = await fetch(`${LOCAL_TAGGER_URL}/health`, {
            signal: AbortSignal.timeout(2_000),
        });
        const reachable = res.ok;
        cachedLocalDetection = { reachable, checkedAt: Date.now() };
        return reachable;
    } catch {
        cachedLocalDetection = { reachable: false, checkedAt: Date.now() };
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
