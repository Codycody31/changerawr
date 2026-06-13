const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MAINTENANCE_HTML_PATH = path.join(__dirname, '../maintenance', 'index.html');

// Read the maintenance page HTML
const maintenanceHTML = fs.readFileSync(MAINTENANCE_HTML_PATH, 'utf8');

// Plain-text step log written directly by docker-entrypoint.sh - no HTTP
// service, no curl, no JSON server involved. Reading a file off disk is the
// one thing that can't hang or 502.
const STATUS_LOG = '/tmp/changerawr-status-log';
const STARTUP_LOG = '/tmp/changerawr-startup.log';

const SERVER_START_TIME = Date.now();

// Ordered, fixed list of deploy steps. docker-entrypoint.sh writes
// "step|state|message|timestamp" lines as each step starts/finishes; we
// just look up the latest known state per step here. Steps not yet seen
// are rendered as "pending" - no progress-percentage or "stuck" inference.
const STEP_DEFINITIONS = [
    { id: 'prisma-generate', label: 'Generating Prisma client' },
    { id: 'migrations', label: 'Running database migrations' },
    { id: 'widget', label: 'Building widget' },
    { id: 'swagger', label: 'Generating API documentation' },
    { id: 'extensions-generate', label: 'Preparing installed extensions' },
    { id: 'rebuild', label: 'Rebuilding application with extensions' },
    { id: 'starting-app', label: 'Starting application services' },
    { id: 'ready', label: 'Application ready' },
];

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
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

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

    // Boot progress, read straight from the step log written by
    // docker-entrypoint.sh.
    if (req.url === '/startup/progress') {
        const steps = readSteps();
        const elapsed = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
        const readyStep = steps[steps.length - 1];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            steps,
            elapsed,
            complete: readyStep.state === 'done',
        }));
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
    // Force-close keep-alive connections too. Otherwise a browser tab that's
    // been polling /startup/progress on a persistent connection keeps that
    // socket alive to this (now zombie) process, and reuses it for
    // subsequent requests (e.g. _next/static/* chunks) that should go to the
    // Next.js server taking over this port.
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
