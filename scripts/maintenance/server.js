const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MAINTENANCE_HTML_PATH = path.join(__dirname, '../maintenance', 'index.html');

// Read the bundled maintenance page as an immediate fallback - this is what
// gets served if the remote fetch below fails or the deployment has no
// outbound internet access.
let maintenanceHTML = fs.readFileSync(MAINTENANCE_HTML_PATH, 'utf8');

// The maintenance page is a static loading screen with no server-side
// templating - all dynamic data comes from /startup/steps, /startup/logs and
// /api/health, which are still served locally. So it's safe to pull the
// latest copy from GitHub at boot, sidestepping any Docker build/cache issue
// that could leave a stale copy baked into the image. Override via env var
// when cutting a new release branch.
const MAINTENANCE_PAGE_URL = process.env.MAINTENANCE_PAGE_URL
    || 'https://raw.githubusercontent.com/Supernova3339/changerawr/1.0.7/scripts/maintenance/index.html';

(async () => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(MAINTENANCE_PAGE_URL, { signal: controller.signal });
        clearTimeout(timeout);
        if (response.ok) {
            const html = await response.text();
            if (html.includes('<html')) {
                maintenanceHTML = html;
                console.log('🦖 Loaded latest maintenance page from GitHub');
            }
        }
    } catch (err) {
        console.log(`🦖 Could not fetch latest maintenance page (${err.message}), using bundled copy`);
    }
})();

// Plain-text step log written directly by docker-entrypoint.sh - no HTTP
// service, no curl, no JSON server involved. Reading a file off disk is the
// one thing that can't hang or 502.
const STATUS_LOG = '/tmp/changerawr-status-log';
const STARTUP_LOG = '/tmp/changerawr-startup.log';

const SERVER_START_TIME = Date.now();

// Ordered, fixed list of deploy steps. docker-entrypoint.sh writes
// "step|state|message|timestamp" lines as each step starts/finishes; we
// just look up the latest known state per step here. Steps not yet seen
// are rendered as "pending". `estimateSeconds` is a rough typical duration,
// used only to drive the progress bar / ETA - it has no effect on when
// steps actually run.
const STEP_DEFINITIONS = [
    { id: 'prisma-generate', label: 'Generating Prisma client', estimateSeconds: 10 },
    { id: 'migrations', label: 'Running database migrations', estimateSeconds: 8 },
    { id: 'widget', label: 'Building widget', estimateSeconds: 20 },
    { id: 'swagger', label: 'Generating API documentation', estimateSeconds: 15 },
    { id: 'extensions-generate', label: 'Preparing installed extensions', estimateSeconds: 10 },
    { id: 'rebuild', label: 'Rebuilding application with extensions', estimateSeconds: 180 },
    { id: 'starting-app', label: 'Starting application services', estimateSeconds: 3 },
    { id: 'ready', label: 'Application ready', estimateSeconds: 1 },
];

const TERMINAL_STATES = new Set(['done', 'warning', 'error', 'skipped']);

function readSteps() {
    const latest = {};
    try {
        const lines = fs.readFileSync(STATUS_LOG, 'utf8').trim().split('\n').filter(Boolean);
        for (const line of lines) {
            const [id, state, message, timestamp] = line.split('|');
            latest[id] = { state, message, timestamp: Number(timestamp) * 1000 };
        }
    } catch {
        // No log yet - everything is pending
    }

    return STEP_DEFINITIONS.map((def) => {
        const entry = latest[def.id];
        return {
            id: def.id,
            label: def.label,
            state: entry ? entry.state : 'pending',
            message: entry ? entry.message : def.label,
            timestamp: entry ? entry.timestamp : null,
        };
    });
}

// Turns the step log into a single progress bar + ETA. `estimateSeconds`
// per step gives the bar's relative weights; a step that's "skipped"
// contributes nothing to either the completed or total weight, so e.g. a
// deploy with no extensions reaches 100% without ever accounting for the
// (skipped) rebuild step's weight.
function getProgress() {
    const steps = readSteps();
    const now = Date.now();
    const elapsed = Math.floor((now - SERVER_START_TIME) / 1000);

    // Percent is step-count based (each non-skipped step is an equal slice
    // of the bar) so finishing a step always produces a clearly visible
    // jump, even if that step's actual duration was way off from its
    // estimate. `estimateSeconds` is only used for the ETA and for giving
    // the currently-running step partial credit within its own slice.
    const countedSteps = steps.filter((step) => step.state !== 'skipped');
    let completedUnits = 0;
    let etaSeconds = 0;
    let currentStep = null;

    for (const step of steps) {
        const def = STEP_DEFINITIONS.find((d) => d.id === step.id);
        const estimate = def.estimateSeconds;

        if (step.state === 'skipped') {
            continue;
        }

        if (TERMINAL_STATES.has(step.state)) {
            completedUnits += 1;
        } else if (step.state === 'running') {
            currentStep = step;
            const elapsedInStep = step.timestamp ? (now - step.timestamp) / 1000 : 0;
            // Linear progress toward the estimate, capped at 95% of this
            // step's slice so a step running longer than expected doesn't
            // claim to be done.
            const fraction = Math.min(0.95, elapsedInStep / estimate);
            completedUnits += fraction;
            etaSeconds += Math.max(estimate - elapsedInStep, estimate * 0.05);
        } else {
            // pending
            etaSeconds += estimate;
        }
    }

    const readyStep = steps[steps.length - 1];
    const complete = readyStep.state === 'done';
    const percent = complete ? 100 : Math.min(99, Math.floor((completedUnits / countedSteps.length) * 100));

    if (!currentStep && !complete) {
        // Nothing "running" yet (e.g. right at startup) - the first pending
        // step is effectively next up.
        currentStep = steps.find((step) => step.state === 'pending') || null;
    }

    return {
        steps,
        elapsed,
        complete,
        percent,
        etaSeconds: complete ? 0 : Math.round(etaSeconds),
        currentStep,
    };
}

// Matches Next.js build assets and any other file-extensioned request
// (fonts, css, js, images, source maps, etc.) so they get a 503 instead of
// the maintenance HTML page.
const STATIC_ASSET_PATTERN = /^\/_next\/|\.[a-zA-Z0-9]+$/;

function isStaticAssetRequest(url) {
    const pathname = url.split('?')[0];
    return STATIC_ASSET_PATTERN.test(pathname);
}

const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Never let nginx/CDNs/browsers cache anything served while starting up.
    // Plain Cache-Control is sometimes overridden at the edge by a Cloudflare
    // "Cache Everything" rule with a fixed Edge TTL, which would otherwise
    // keep serving a stale maintenance page (e.g. from a previous deploy)
    // long after the origin has moved on. Cloudflare-CDN-Cache-Control takes
    // precedence over Cache Rules for Cloudflare's edge cache specifically.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');

    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Health check endpoint returns 503 during maintenance
    if (req.url === '/api/health') {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'starting',
            message: 'Application is starting up'
        }));
        return;
    }

    // Boot progress, polled by the maintenance page on a timer. Reading a
    // small text file off disk is cheap, so simple polling is plenty fast
    // and avoids the proxy-buffering/connection-lifecycle pitfalls of SSE.
    if (req.url === '/startup/steps') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getProgress()));
        return;
    }

    // Raw console output captured by docker-entrypoint.sh, for debugging
    // slow/stuck boots without terminal access.
    if (req.url === '/startup/logs') {
        try {
            const log = fs.readFileSync(STARTUP_LOG, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ available: true, log }));
        } catch {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ available: false }));
        }
        return;
    }

    // Static assets (_next/static chunks, fonts, css, etc.) aren't ready yet
    // either. Returning the maintenance HTML with a 200 for these is what
    // causes "Unexpected token '<'" / font decode errors in the browser once
    // Next.js comes up and the page tries to load its real chunks - and CDNs
    // may cache that bad 200 for the asset URL. Fail loudly instead so the
    // browser/CDN treats it as unavailable rather than valid content.
    if (isStaticAssetRequest(req.url)) {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('Service starting up');
        return;
    }

    // Serve maintenance page for all other (page navigation) requests
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(maintenanceHTML);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🦖 Maintenance server running on port ${PORT}`);
    console.log('Waiting for Next.js to start...');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🦖 Maintenance server shutting down...');
    // Force-close keep-alive connections too. Otherwise a browser tab with a
    // persistent socket keeps it alive to this (now zombie) process, and
    // reuses it for subsequent requests (e.g. _next/static/* chunks) that
    // should go to the Next.js server taking over this port.
    server.closeAllConnections();
    server.close(() => {
        console.log('🦖 Maintenance server stopped');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🦖 Maintenance server shutting down...');
    server.closeAllConnections();
    server.close(() => {
        console.log('🦖 Maintenance server stopped');
        process.exit(0);
    });
});

module.exports = server;
