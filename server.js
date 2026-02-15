const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { addMessage, getMessages, getStatus, setConnectionStatus } = require('./services/store');
const { generateReply } = require('./services/ai');
const { loadEnv } = require('./services/config');
const { sendWhatsAppMessage, hasTwilioConfig } = require('./services/whatsapp');

loadEnv();

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const STATIC_FILE_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

function sendJson(res, code, body) {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
}

function collectBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
            if (data.length > 1e6) {
                reject(new Error('Request body too large'));
            }
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

async function parseRequestBody(req) {
    const raw = await collectBody(req);
    if (!raw) return {};

    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
        return Object.fromEntries(new URLSearchParams(raw).entries());
    }

    return JSON.parse(raw);
}

function safePathname(pathname) {
    if (pathname === '/') return '/login.html';

    const normalized = path.normalize(pathname).replace(/^([.][.][/\\])+/, '');
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function serveStatic(req, res, pathname) {
    const safePath = safePathname(pathname);
    const fullPath = path.join(ROOT_DIR, safePath);

    if (!fullPath.startsWith(ROOT_DIR)) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
    }

    fs.readFile(fullPath, (err, content) => {
        if (err) {
            sendJson(res, 404, { error: 'Not Found' });
            return;
        }

        const ext = path.extname(fullPath).toLowerCase();
        const contentType = STATIC_FILE_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
}

async function handleApi(req, res, url) {
    if (req.method === 'GET' && url.pathname === '/api/health') {
        return sendJson(res, 200, {
            ok: true,
            service: 'akay-bot-api',
            twilioConfigured: hasTwilioConfig(),
            timestamp: new Date().toISOString()
        });
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
        return sendJson(res, 200, {
            ...getStatus(),
            transport: hasTwilioConfig() ? 'twilio' : 'simulator'
        });
    }

    if (req.method === 'POST' && url.pathname === '/api/connect') {
        const body = await parseRequestBody(req).catch(() => ({}));
        const phone = body.phone || process.env.TWILIO_WHATSAPP_FROM || '+2340000000000';
        setConnectionStatus(true, phone);
        return sendJson(res, 200, { success: true, status: getStatus() });
    }

    if (req.method === 'POST' && url.pathname === '/api/disconnect') {
        setConnectionStatus(false);
        return sendJson(res, 200, { success: true, status: getStatus() });
    }

    if (req.method === 'GET' && url.pathname === '/api/messages') {
        const limit = Number(url.searchParams.get('limit') || 50);
        return sendJson(res, 200, { messages: getMessages(limit) });
    }

    if (req.method === 'POST' && url.pathname === '/api/messages/incoming') {
        const body = await parseRequestBody(req);
        const from = body.from;
        const text = body.text;

        if (!from || !text) {
            return sendJson(res, 400, { error: 'from and text are required' });
        }

        const inbound = addMessage({ from, text, direction: 'inbound', source: 'webhook' });

        try {
            const reply = await generateReply({ incomingText: text, sender: from });
            const delivery = await sendWhatsAppMessage({ to: from, body: reply });
            const outbound = addMessage({
                from: 'AKAY-BOT',
                to: from,
                text: reply,
                direction: 'outbound',
                source: delivery.delivered ? 'twilio' : 'ai'
            });

            return sendJson(res, 200, { success: true, inbound, outbound, delivery });
        } catch (error) {
            return sendJson(res, 500, {
                success: false,
                inbound,
                error: error.message
            });
        }
    }

    if (req.method === 'POST' && url.pathname === '/webhooks/twilio/whatsapp') {
        const body = await parseRequestBody(req);
        const from = body.From || body.WaId || 'unknown';
        const text = body.Body || '';

        if (!text) {
            return sendJson(res, 200, { received: true, ignored: true, reason: 'No text body' });
        }

        const inbound = addMessage({ from, text, direction: 'inbound', source: 'twilio-webhook' });

        try {
            const reply = await generateReply({ incomingText: text, sender: from });
            const delivery = await sendWhatsAppMessage({ to: from, body: reply });
            const outbound = addMessage({
                from: 'AKAY-BOT',
                to: from,
                text: reply,
                direction: 'outbound',
                source: delivery.delivered ? 'twilio' : 'ai'
            });

            return sendJson(res, 200, { received: true, inbound, outbound, delivery });
        } catch (error) {
            return sendJson(res, 500, { received: true, inbound, error: error.message });
        }
    }

    return sendJson(res, 404, { error: 'API route not found' });
}

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);

        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/webhooks/')) {
            await handleApi(req, res, url);
            return;
        }

        serveStatic(req, res, url.pathname);
    } catch (error) {
        sendJson(res, 500, { error: 'Internal server error', detail: error.message });
    }
});

server.listen(PORT, () => {
    console.log(`AKAY Bot server running on http://localhost:${PORT}`);
});
