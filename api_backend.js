// api.js
// REST API server — runs alongside the WhatsApp bot

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ChatImporter = require('./services/chatImporter');

// Ensure upload directory exists before multer uses it
const uploadDir = './data/uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer v2 compatible storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.txt', '.zip'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only .txt or .zip WhatsApp export files are accepted'));
        }
    }
});

module.exports = function startAPI({ db, knowledgeBase, sessionManager, sessionBackup, connectionState }) {
    const app = express();
    const PORT = process.env.PORT || process.env.API_PORT || 3001;

    app.use(cors());
    app.use(express.json());

    // Log every API request to Railway logs
    app.use((req, res, next) => {
        const ts = new Date().toISOString().replace('T',' ').substring(0,19);
        process.stdout.write(`[${ts}] 🌐 API ${req.method} ${req.path}\n`);
        next();
    });

    // ── POST /api/import-chat ─────────────────────────────────────────────────
    // Upload a WhatsApp exported chat .txt and train the knowledge base
    //
    // Form fields:
    //   file     — the .txt file (multipart/form-data)
    //   yourName — your name exactly as it appears in the chat (e.g. "EltonDean")
    //
    // Example curl:
    //   curl -X POST http://localhost:3001/api/import-chat \
    //     -F "file=@WhatsApp Chat.txt" \
    //     -F "yourName=EltonDean"
    app.post('/api/import-chat', upload.single('file'), async (req, res) => {
        const filePath = req.file?.path;

        try {
            const yourName = req.body.yourName?.trim();

            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }
            if (!yourName) {
                return res.status(400).json({ success: false, error: 'yourName is required' });
            }

            const importer = new ChatImporter(db, knowledgeBase);
            const result = await importer.importFromFile(filePath, yourName);

            return res.json(result);
        } catch (err) {
            console.error('Import error:', err.message);
            return res.status(500).json({ success: false, error: err.message });
        } finally {
            // Clean up temp file
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    });

    // ── POST /api/import-chat/text ────────────────────────────────────────────
    // Send raw chat text instead of uploading a file
    // Body (JSON): { "text": "...", "yourName": "EltonDean" }
    app.post('/api/import-chat/text', async (req, res) => {
        try {
            const { text, yourName } = req.body;
            if (!text) return res.status(400).json({ success: false, error: 'text is required' });
            if (!yourName) return res.status(400).json({ success: false, error: 'yourName is required' });

            const importer = new ChatImporter(db, knowledgeBase);
            const result = await importer.importFromText(text, yourName);
            return res.json(result);
        } catch (err) {
            console.error('[API ERROR]', err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    });

    // ── GET /api/knowledge-base ───────────────────────────────────────────────
    app.get('/api/knowledge-base', async (req, res) => {
        try {
            const entries = await db.all(
                'SELECT id, question, answer, category, keywords, usageCount, createdAt FROM knowledge_base ORDER BY usageCount DESC'
            );
            res.json({ success: true, count: entries.length, entries });
        } catch (err) {
            console.error('[API ERROR]', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ── POST /api/knowledge-base ──────────────────────────────────────────────
    // Body (JSON): { "question": "...", "answer": "...", "category": "general", "keywords": "..." }
    app.post('/api/knowledge-base', async (req, res) => {
        try {
            const { question, answer, category = 'general', keywords = '' } = req.body;
            if (!question || !answer) {
                return res.status(400).json({ success: false, error: 'question and answer are required' });
            }
            await db.addToKnowledgeBase(question, answer, category, keywords);
            await knowledgeBase.loadFAQs();
            res.json({ success: true });
        } catch (err) {
            console.error('[API ERROR]', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ── PUT /api/knowledge-base/:id ──────────────────────────────────────────
    app.put('/api/knowledge-base/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { question, answer, category } = req.body;
            if (!question || !answer) {
                return res.status(400).json({ success: false, error: 'question and answer required' });
            }
            await db.run(
                'UPDATE knowledge_base SET question=?, answer=?, category=?, updatedAt=? WHERE id=?',
                [question.trim(), answer.trim(), category || 'general', Date.now(), id]
            );
            // Reload knowledge base in memory
            await knowledgeBase.loadFAQs();
            res.json({ success: true });
        } catch (err) {
            console.error('[API ERROR]', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ── DELETE /api/knowledge-base/:id ────────────────────────────────────────
    app.delete('/api/knowledge-base/:id', async (req, res) => {
        try {
            await db.run('DELETE FROM knowledge_base WHERE id = ?', [req.params.id]);
            await knowledgeBase.loadFAQs();
            res.json({ success: true });
        } catch (err) {
            console.error('[API ERROR]', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ── GET /api/stats ────────────────────────────────────────────────────────
    app.get('/api/stats', async (req, res) => {
        try {
            const stats = await db.getStats();
            const botStatus = await db.getBotStatus();
            res.json({ success: true, ...stats, botStatus });
        } catch (err) {
            console.error('[API ERROR]', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });



    // ── GET /api/conversations ────────────────────────────────────────────────
    // Returns list of unique chats with last message preview
    app.get('/api/conversations', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const rows = await db.all(`
                SELECT
                    chatId,
                    userId,
                    MAX(timestamp) as lastTimestamp,
                    (SELECT message FROM messages m2 WHERE m2.chatId = m1.chatId ORDER BY timestamp DESC LIMIT 1) as lastMessage,
                    SUM(CASE WHEN fromMe = 0 THEN 1 ELSE 0 END) as unread
                FROM messages m1
                GROUP BY chatId
                ORDER BY lastTimestamp DESC
                LIMIT ?
            `, [limit]);
            res.json({ success: true, conversations: rows });
        } catch (err) {
            console.error('[API ERROR]', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ── GET /api/conversations/:chatId/messages ───────────────────────────────
    // Returns all messages for a specific chat
    app.get('/api/conversations/:chatId/messages', async (req, res) => {
        try {
            const chatId = decodeURIComponent(req.params.chatId);
            const limit = parseInt(req.query.limit) || 100;
            const rows = await db.all(
                `SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC LIMIT ?`,
                [chatId, limit]
            );
            res.json({ success: true, messages: rows });
        } catch (err) {
            console.error('[API ERROR]', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });


    // ── GET /api/connection ───────────────────────────────────────────────────
    // Returns current WhatsApp connection status + QR/pairing code if available
    app.get('/api/connection', (req, res) => {
        res.json({
            status: connectionState.status,
            phoneNumber: connectionState.phoneNumber,
            qrCode: connectionState.qrCode,
            pairingCode: connectionState.pairingCode,
        });
    });

    // ── POST /api/connection/pair ─────────────────────────────────────────────
    app.post('/api/connection/pair', async (req, res) => {
        try {
            const { phoneNumber } = req.body;
            if (!phoneNumber) {
                return res.status(400).json({ success: false, error: 'phoneNumber is required' });
            }

            let digits = phoneNumber.replace(/[^0-9]/g, '');
            // Auto-fix Nigerian 08x -> 2348x
            if (digits.startsWith('0') && digits.length === 11) {
                digits = '234' + digits.slice(1);
            }
            if (digits.length < 10) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid number. Use format: 2348012345678'
                });
            }

            if (connectionState.status === 'connected') {
                return res.status(400).json({ success: false, error: 'Already connected. Disconnect first.' });
            }

            // Kill any existing socket cleanly
            if (connectionState.sock) {
                try { connectionState.sock.ev.removeAllListeners(); } catch (_) {}
                try { connectionState.sock.ws?.close(); } catch (_) {}
                connectionState.sock = null;
            }

            // MUST clear session files before pairing — stale creds break pairing
            await sessionBackup.clearSession();

            connectionState.status = 'connecting';
            connectionState.pairingCode = null;
            connectionState.qrCode = null;

            console.log(`[PAIR] Starting bot in pairing mode for +${digits}`);
            global._startBotWithPairing(digits);

            // Wait up to 30s for pairing code
            let waited = 0;
            const maxWait = 30000;
            while (!connectionState.pairingCode && waited < maxWait) {
                await new Promise(r => setTimeout(r, 500));
                waited += 500;
                console.log(`[PAIR] Waited ${waited}ms — status: ${connectionState.status} — code: ${connectionState.pairingCode || 'none'}`);
                // Only bail if disconnected AND we've waited at least 10s
                if (connectionState.status === 'disconnected' && waited > 10000) {
                    console.error(`[PAIR] Failed — bot disconnected after ${waited}ms`);
                    return res.status(500).json({
                        success: false,
                        error: 'Could not get pairing code. Make sure the number is registered on WhatsApp and try again.'
                    });
                }
            }

            if (connectionState.pairingCode) {
                console.log(`[PAIR] Code ready: ${connectionState.pairingCode}`);
                return res.json({ success: true, pairingCode: connectionState.pairingCode });
            }

            console.error(`[PAIR] Timed out after ${maxWait}ms — status: ${connectionState.status}`);
            res.status(504).json({
                success: false,
                error: 'Timed out waiting for pairing code. Try QR code instead, or check Railway logs.'
            });
        } catch (err) {
            console.error(`[PAIR] ERROR: ${err.message}`, err.stack);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ── POST /api/connection/disconnect ───────────────────────────────────────
    app.post('/api/connection/disconnect', async (req, res) => {
        try {
            // Close socket WITHOUT calling logout() 
            // logout() permanently invalidates the session on WhatsApp servers
            // making the next QR scan also fail
            if (connectionState.sock) {
                try { connectionState.sock.ev.removeAllListeners(); } catch (_) {}
                try { connectionState.sock.ws?.close(); } catch (_) {}
                connectionState.sock = null;
            }
            // Clear saved session from disk and DB so next connect starts fresh
            if (sessionBackup) await sessionBackup.clearSession();
            connectionState.status = 'disconnected';
            connectionState.qrCode = null;
            connectionState.pairingCode = null;
            connectionState.phoneNumber = null;
            connectionState.requestPairingFn = null;
            // Preserve reconnectFn so dashboard can trigger new connection
            connectionState.reconnectFn = () => {
                connectionState.reconnectFn = null;
                global._startBot();
            };
            res.json({ success: true, message: 'Disconnected and session cleared. Ready to re-pair.' });
        } catch (err) {
            console.error('[API ERROR]', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ── POST /api/connection/reconnect ────────────────────────────────────────
    app.post('/api/connection/reconnect', async (req, res) => {
        try {
            if (connectionState.status === 'connected') {
                return res.json({ success: false, error: 'Already connected' });
            }

            // Close any broken socket cleanly
            if (connectionState.sock) {
                try { connectionState.sock.ev.removeAllListeners(); } catch (_) {}
                try { connectionState.sock.ws?.close(); } catch (_) {}
                connectionState.sock = null;
            }

            // Reset state
            connectionState.requestPairingFn = null;
            connectionState.qrCode = null;
            connectionState.pairingCode = null;
            connectionState.status = 'connecting';

            // Use reconnectFn if set, otherwise fall back to global._startBot
            const startFn = connectionState.reconnectFn || global._startBot;
            if (typeof startFn === 'function') {
                // Reset reconnectFn to point to plain startBot for future reconnects
                connectionState.reconnectFn = () => global._startBot();
                setTimeout(() => startFn(), 300);
                return res.json({ success: true, message: 'Generating QR code...' });
            }
            res.status(503).json({ success: false, error: 'Cannot start bot. Please redeploy.' });
        } catch (err) {
            console.error('[API ERROR]', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ── GET /api/sessions ─────────────────────────────────────────────────────
    // View all active sessions
    app.get('/api/sessions', async (req, res) => {
        try {
            const sessions = await sessionManager.getAllSessions();
            const count = await sessionManager.getActiveSessions();
            res.json({ success: true, active: count, sessions });
        } catch (err) {
            console.error('[API ERROR]', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ── DELETE /api/sessions/:userId ──────────────────────────────────────────
    // Force-clear a specific user's session
    app.delete('/api/sessions/:userId', async (req, res) => {
        try {
            await sessionManager.clearSession(req.params.userId);
            res.json({ success: true });
        } catch (err) {
            console.error('[API ERROR]', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ── Human Handoff API ─────────────────────────────────────────────────────

    // GET /api/handoff — list all numbers in human mode
    app.get('/api/handoff', (req, res) => {
        const sm = global._safetyManager;
        if (!sm) return res.json({ success: true, handoffs: [] });
        res.json({ success: true, handoffs: sm.getHandoffList() });
    });

    // POST /api/handoff/takeover — put a number in human mode
    app.post('/api/handoff/takeover', (req, res) => {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
        const sm = global._safetyManager;
        if (!sm) return res.status(503).json({ success: false, error: 'Safety manager not ready' });
        sm.takeoverChat(userId);

        // Notify the customer
        if (connectionState.sock && connectionState.status === 'connected') {
            const jid = userId.includes('@') ? userId : `${userId}@s.whatsapp.net`;
            connectionState.sock.sendMessage(jid, {
                text: '👋 You are now speaking with a live agent. We will get back to you shortly.'
            }).catch(() => {});
        }
        res.json({ success: true, message: `Human takeover active for ${userId}` });
    });

    // POST /api/handoff/release — return number to bot
    app.post('/api/handoff/release', (req, res) => {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
        const sm = global._safetyManager;
        if (!sm) return res.status(503).json({ success: false, error: 'Safety manager not ready' });
        sm.releaseChat(userId);

        // Notify the customer
        if (connectionState.sock && connectionState.status === 'connected') {
            const jid = userId.includes('@') ? userId : `${userId}@s.whatsapp.net`;
            connectionState.sock.sendMessage(jid, {
                text: '🤖 You are now back with our AI assistant. How can I help you?'
            }).catch(() => {});
        }
        res.json({ success: true, message: `Bot resumed for ${userId}` });
    });

    // POST /api/handoff/release-all — return ALL numbers to bot
    app.post('/api/handoff/release-all', (req, res) => {
        const sm = global._safetyManager;
        if (!sm) return res.status(503).json({ success: false, error: 'Safety manager not ready' });
        sm.releaseAll();
        res.json({ success: true, message: 'Bot resumed for all chats' });
    });

    // ── GET /api/settings ────────────────────────────────────────────────────
    // Returns current readable settings (non-secret env vars)
    app.get('/api/settings', (req, res) => {
        const keys = [
            'AI_PROVIDER','AI_MODEL','MAX_TOKENS','TEMPERATURE',
            'BOT_NAME','BUSINESS_NAME','BUSINESS_DESCRIPTION','BUSINESS_HOURS',
            'BUSINESS_PHONE','BUSINESS_EMAIL','BUSINESS_LOCATION',
            'CONTEXT_MESSAGE_LIMIT','MAX_MESSAGES_PER_MINUTE',
            'ENABLE_FAQ_MATCHING','ENABLE_INTENT_CLASSIFICATION','DEBUG_AI_ERRORS'
        ];
        const settings = {};
        keys.forEach(k => { settings[k] = process.env[k] || ''; });
        res.json({ success: true, settings });
    });

    // ── POST /api/settings ────────────────────────────────────────────────────
    // Applies settings to process.env immediately (persists until restart)
    // For permanent changes user must update Railway Variables
    app.post('/api/settings', (req, res) => {
        try {
            const { settings } = req.body;
            if (!settings) return res.status(400).json({ success: false, error: 'settings object required' });

            const allowed = [
                'AI_PROVIDER','AI_MODEL','MAX_TOKENS','TEMPERATURE',
                'BOT_NAME','BUSINESS_NAME','BUSINESS_DESCRIPTION','BUSINESS_HOURS',
                'BUSINESS_PHONE','BUSINESS_EMAIL','BUSINESS_LOCATION',
                'CONTEXT_MESSAGE_LIMIT','MAX_MESSAGES_PER_MINUTE',
                'ENABLE_FAQ_MATCHING','ENABLE_INTENT_CLASSIFICATION','DEBUG_AI_ERRORS'
            ];

            let changed = 0;
            for (const [key, value] of Object.entries(settings)) {
                if (allowed.includes(key)) {
                    process.env[key] = String(value);
                    // Update globals immediately so bot behaviour changes without restart
                    if (key === 'BOT_NAME') global.botName = value;
                    if (key === 'MAX_TOKENS') global.maxTokens = parseInt(value) || 1000;
                    if (key === 'TEMPERATURE') global.temperature = parseFloat(value) || 0.7;
                    if (key === 'ENABLE_FAQ_MATCHING') global.enableFAQMatching = value === 'true';
                    if (key === 'ENABLE_INTENT_CLASSIFICATION') global.enableIntentClassification = value !== 'false';
                    if (key === 'CONTEXT_MESSAGE_LIMIT') global.contextMessageLimit = parseInt(value) || 10;
                    if (key === 'BUSINESS_NAME') global.businessInfo = { ...global.businessInfo, name: value };
                    if (key === 'BUSINESS_DESCRIPTION') global.businessInfo = { ...global.businessInfo, description: value };
                    if (key === 'BUSINESS_HOURS') global.businessInfo = { ...global.businessInfo, businessHours: value };
                    if (key === 'BUSINESS_PHONE') global.businessInfo = { ...global.businessInfo, phone: value };
                    if (key === 'BUSINESS_EMAIL') global.businessInfo = { ...global.businessInfo, email: value };
                    if (key === 'BUSINESS_LOCATION') global.businessInfo = { ...global.businessInfo, location: value };
                    changed++;
                }
            }
            console.log(`[SETTINGS] Updated ${changed} settings`);
            res.json({ success: true, changed, note: 'Applied to running process. Update Railway Variables for permanent changes.' });
        } catch (err) {
            console.error('[API ERROR]', err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // ── GET / and /api/health ─────────────────────────────────────────────────
    app.get('/', (req, res) => {
        res.json({ status: 'ok', bot: global.botName || 'QURNEX Bot', version: '2.0.0' });
    });

    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok', connection: connectionState.status, uptime: process.uptime() });
    });

    app.listen(PORT, () => {
        console.log(`✓ API server running on http://localhost:${PORT}`);
        console.log(`  Upload endpoint: POST http://localhost:${PORT}/api/import-chat`);
    });
};
// Note: The module.exports function above already handles all routes.
// The sessions route is added inside that function automatically via the updated index.js
// which passes sessionManager to the API.
