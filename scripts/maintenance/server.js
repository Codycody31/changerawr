const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BUILDER_PORT = 3010;
const MAINTENANCE_HTML_PATH = path.join(__dirname, '../maintenance', 'index.html');

// Read the maintenance page HTML
const maintenanceHTML = fs.readFileSync(MAINTENANCE_HTML_PATH, 'utf8');

// Paths that should be proxied to the (internal-only) Extension Builder Service,
// so the browser never needs to reach localhost:3010 directly.
const BUILDER_PROXY_PREFIXES = [
    '/startup/',
    '/extensions/',
    '/build/',
];

function shouldProxyToBuilder(url) {
    return BUILDER_PROXY_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function proxyToBuilder(req, res) {
    const proxyReq = http.request(
        {
            hostname: '127.0.0.1',
            port: BUILDER_PORT,
            path: req.url,
            method: req.method,
            headers: req.headers,
        },
        (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
            proxyRes.pipe(res);
        }
    );

    proxyReq.on('error', () => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Extension Builder Service unavailable' }));
    });

    req.pipe(proxyReq);
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

    // Proxy startup progress / build trigger requests to the Extension Builder
    // Service so the maintenance page can talk to it via the same origin.
    if (shouldProxyToBuilder(req.url)) {
        proxyToBuilder(req, res);
        return;
    }

    // Serve maintenance page for all other requests
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
    server.close(() => {
        console.log('🦖 Maintenance server stopped');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🦖 Maintenance server shutting down...');
    server.close(() => {
        console.log('🦖 Maintenance server stopped');
        process.exit(0);
    });
});

module.exports = server;