import type { NextConfig } from "next";
import path from "node:path";

// Reports webpack compile progress to the Extension Builder Service during
// Docker builds, so the maintenance page can show a live percentage + ETA for
// the "Creating an optimized production build" step instead of jumping
// straight from 78% to 81% with no feedback in between.
// Matches docker-entrypoint.sh's own reports: "Creating an optimized
// production build" -> 79, "Compiled successfully" -> 81. Webpack progress
// fills in the gap between those two with finer-grained updates + an ETA.
const BUILD_PROGRESS_MIN = 79;
const BUILD_PROGRESS_MAX = 81;

const compilerPercents: Record<'server' | 'client', number> = { server: 0, client: 0 };
let buildProgressStart: number | null = null;
let lastReportedProgress = -1;
let lastReportTime = 0;

function reportBuildProgress(compiler: 'server' | 'client', percentage: number, message: string) {
    const now = Date.now();
    if (buildProgressStart === null) buildProgressStart = now;

    compilerPercents[compiler] = percentage;
    const combined = (compilerPercents.server + compilerPercents.client) / 2;
    const progress = Math.min(
        BUILD_PROGRESS_MAX,
        Math.round(BUILD_PROGRESS_MIN + combined * (BUILD_PROGRESS_MAX - BUILD_PROGRESS_MIN))
    );

    // Throttle: only post when the rounded progress changes, or every 2s as a heartbeat
    if (progress === lastReportedProgress && now - lastReportTime < 2000) {
        return;
    }
    lastReportedProgress = progress;
    lastReportTime = now;

    let eta: number | null = null;
    if (combined > 0.02) {
        const elapsedSeconds = (now - buildProgressStart) / 1000;
        const estimatedTotal = elapsedSeconds / combined;
        eta = Math.max(0, Math.round(estimatedTotal - elapsedSeconds));
    }

    fetch('http://localhost:3010/startup/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            phase: 'build',
            progress,
            message: message ? `Compiling: ${message}` : 'Compiling application',
            eta,
        }),
    }).catch(() => {
        // Builder service isn't running (e.g. local `npm run build`), that's fine
    });
}

const nextConfig: NextConfig = {
    reactStrictMode: false,
    // Exclude extensions/ — they are symlinked and Turbopack's filesystem classification
    // for that subtree breaks PlainSource::from_source when any diagnostic is emitted.
    transpilePackages: ['@changerawr/markdown'],
    reactCompiler: {
        sources: (filename: string) => !/[/\\]extensions[/\\]/.test(filename),
    },
    images: {
        formats: ["image/avif", "image/webp"],
        // No remote patterns needed - avatars are proxied through /api/avatar/[hash]
        remotePatterns: [],
    },
    turbopack: {},
    webpack: (config, { isServer, dev, webpack }) => {
        // Exclude extensions folder from type checking and compilation
        config.module = config.module || {};
        config.module.rules = config.module.rules || [];

        config.module.rules.push({
            test: /\.(ts|tsx|js|jsx)$/,
            include: [path.join(__dirname, 'extensions')],
            use: 'ignore-loader',
        });

        // Only during the Docker entrypoint's production rebuild - reports
        // live compile progress + ETA to the maintenance page (see
        // BUILD_PROGRESS_MIN/MAX above and docker-entrypoint.sh's "build" phase).
        if (process.env.DOCKER_BUILD === '1' && !dev) {
            config.plugins = config.plugins || [];
            config.plugins.push(new webpack.ProgressPlugin((percentage: number, message: string) => {
                reportBuildProgress(isServer ? 'server' : 'client', percentage, message);
            }));
        }

        return config;
    },
    typescript: {
        // Ignore build errors (extensions folder will always have errors)
        ignoreBuildErrors: true,
    },
    experimental: {
        // Enable optimized Fast Refresh for faster development
        optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', '@heroicons/react'],
        // Turbo mode for faster builds
    },
    typedRoutes: false,
    // output: 'standalone', uses next-start, leave commented-out
    async headers() {
        return [
            {
                // All page routes (no file extension, not _next/* or /api/*).
                // Cloudflare's Rocket Loader rewrites <script> tags in HTML
                // responses, which breaks Next's chunk loading
                // ("Unexpected token '<'", font OTS errors). `no-transform`
                // tells Cloudflare to pass the response through untouched -
                // this disables Rocket Loader (and Polish/Auto-Minify) for
                // these responses regardless of the zone's dashboard config.
                source: '/((?!_next/|api/|.*\\..*).*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-transform',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;