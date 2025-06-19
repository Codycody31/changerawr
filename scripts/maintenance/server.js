const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MAINTENANCE_HTML_PATH = path.join(__dirname, '../maintenance', 'index.html');

// Read the maintenance page HTML
const maintenanceHTML = fs.readFileSync(MAINTENANCE_HTML_PATH, 'utf8');

const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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