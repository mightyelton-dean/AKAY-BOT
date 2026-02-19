// AKAY Bot Dashboard Server
// Proxies API calls to the Baileys backend on port 3001
// Serves the frontend dashboard on port 3000

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

require('./services/config').loadEnv();

const PORT = Number(process.env.PORT || 3000);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'akaybot2026';
const ROOT_DIR = __dirname;

const STATIC_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sendJson(res, code, body) {
    res.writeHead(code, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(body));
}

function collectBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

// ── Proxy request to Baileys backend ─────────────────────────────────────────
function proxyToBackend(req, res, bodyBuffer) {
    const targetUrl = new URL(req.url, BACKEND_URL);
    const isHttps = targetUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: req.method,
        headers: {
            ...req.headers,
            host: targetUrl.host
        }
    };

    const proxyReq = lib.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('Proxy error:', err.message);
        sendJson(res, 502, { error: 'Backend unavailable. Make sure the bot server is running on ' + BACKEND_URL });
    });

    if (bodyBuffer && bodyBuffer.length > 0) {
        proxyReq.write(bodyBuffer);
    }
    proxyReq.end();
}

// ── Auth endpoints ────────────────────────────────────────────────────────────
async function handleAuth(req, res, url, bodyBuffer) {
    if (req.method === 'POST' && url.pathname === '/auth/login') {
        let body = {};
        try { body = JSON.parse(bodyBuffer.toString()); } catch (_) {}

        const { password } = body;
        if (password === DASHBOARD_PASSWORD) {
            // Simple token: base64(timestamp + password hash)
            const token = Buffer.from(`${Date.now()}:${DASHBOARD_PASSWORD}`).toString('base64');
            return sendJson(res, 200, { success: true, token });
        }
        return sendJson(res, 401, { success: false, error: 'Invalid password' });
    }

    if (req.method === 'POST' && url.pathname === '/auth/verify') {
        let body = {};
        try { body = JSON.parse(bodyBuffer.toString()); } catch (_) {}
        const { token } = body;
        // Simple verification — just check token exists and decode it
        try {
            const decoded = Buffer.from(token, 'base64').toString();
            const [, pass] = decoded.split(':');
            if (pass === DASHBOARD_PASSWORD) {
                return sendJson(res, 200, { valid: true });
            }
        } catch (_) {}
        return sendJson(res, 401, { valid: false });
    }

    return null; // not an auth route
}

// ── Static file server ────────────────────────────────────────────────────────
function serveStatic(req, res, pathname) {
    if (pathname === '/') pathname = '/login.html';
    const normalized = path.normalize(pathname).replace(/^([.][.][/\\])+/, '');
    const fullPath = path.join(ROOT_DIR, normalized);

    if (!fullPath.startsWith(ROOT_DIR)) {
        return sendJson(res, 403, { error: 'Forbidden' });
    }

    fs.readFile(fullPath, (err, content) => {
        if (err) return sendJson(res, 404, { error: 'Not found' });
        const ext = path.extname(fullPath).toLowerCase();
        res.writeHead(200, { 'Content-Type': STATIC_TYPES[ext] || 'application/octet-stream' });
        res.end(content);
    });
}

// ── Main request handler ──────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' });
        return res.end();
    }

    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const bodyBuffer = await collectBody(req);

        // Auth routes (handled locally — password lives in .env on server)
        if (url.pathname.startsWith('/auth/')) {
            const handled = await handleAuth(req, res, url, bodyBuffer);
            if (handled !== null) return;
        }

        // Proxy all /api/* calls to Baileys backend
        if (url.pathname.startsWith('/api/')) {
            return proxyToBackend(req, res, bodyBuffer);
        }

        // Serve static files
        serveStatic(req, res, url.pathname);
    } catch (err) {
        console.error('Server error:', err.message);
        sendJson(res, 500, { error: 'Internal server error' });
    }
});

server.listen(PORT, () => {
    console.log(`✓ AKAY Dashboard running on http://localhost:${PORT}`);
    console.log(`  Proxying API calls to: ${BACKEND_URL}`);
});
