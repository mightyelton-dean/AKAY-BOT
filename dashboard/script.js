// AKAY Bot Dashboard - Main Script
// All data fetched from real backend via /api/*

const BACKEND = 'https://talented-connection-env.up.railway.app'; // direct backend URL

// ── Theme System (Light / Dark / System) ─────────────────────────────────────
function setTheme(mode) {
    localStorage.setItem('qurnex-theme', mode);
    applyTheme(mode);
    updateThemeBtns(mode);
}

function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === 'dark') {
        root.setAttribute('data-theme', 'dark');
    } else if (mode === 'light') {
        root.removeAttribute('data-theme');
    } else {
        // System: follow OS preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }
    }
}

function updateThemeBtns(mode) {
    // Update sidebar buttons
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    const map = { light: 'themeBtnLight', dark: 'themeBtnDark', system: 'themeBtnSystem' };
    const btn = document.getElementById(map[mode]);
    if (btn) btn.classList.add('active');

    // Update header buttons
    document.querySelectorAll('.header-theme-btn').forEach(b => b.classList.remove('active'));
    const hmap = { light: 'hThemeBtnLight', dark: 'hThemeBtnDark', system: 'hThemeBtnSystem' };
    const hbtn = document.getElementById(hmap[mode]);
    if (hbtn) hbtn.classList.add('active');
}

function initTheme() {
    const saved = localStorage.getItem('qurnex-theme') || 'system';
    applyTheme(saved);
    updateThemeBtns(saved);
    // Listen for OS theme changes when in system mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const current = localStorage.getItem('qurnex-theme') || 'system';
        if (current === 'system') applyTheme('system');
    });
}

// Init theme immediately on load
initTheme();



// ── API helper ────────────────────────────────────────────────────────────────
async function api(path, options = {}) {
    const res = await fetch(BACKEND + path, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
}

// ── Page Navigation ───────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelector('.page-title').textContent = item.querySelector('span').textContent;
        const page = item.dataset.page;
        document.querySelectorAll('.content').forEach(c => c.style.display = 'none');
        document.getElementById(page + '-page').style.display = 'block';

        // Load data for the page being opened
        if (page === 'connect') loadConnectPage();
        if (page === 'overview') loadDashboard();
        if (page === 'conversations') { loadConversations(); loadHandoffs(); }
        if (page === 'knowledge') loadKnowledgeBase();
        if (page === 'sessions') loadSessions();
        if (page === 'settings') loadSettings();
        if (page === 'broadcast') loadBroadcastPage();
    });
});

// ── Connection status ─────────────────────────────────────────────────────────
async function refreshStatus() {
    try {
        const data = await api('/api/stats');
        const connected = data.botStatus?.connected === 1;
        updateConnectionUI(connected);
    } catch (_) {
        updateConnectionUI(false);
    }
}

function updateConnectionUI(connected) {
    const badge = document.getElementById('connectionStatus');
    const text = document.getElementById('statusText');
    badge.classList.remove('disconnected', 'online');
    badge.classList.add(connected ? 'online' : 'disconnected');
    text.textContent = connected ? 'Connected' : 'Disconnected';
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
async function loadDashboard() {
    try {
        const data = await api('/api/stats');
        setEl('statTotalMessages', data.totalMessages?.toLocaleString() || '0');
        setEl('statActiveUsers', data.activeUsers?.toLocaleString() || '0');
        setEl('statTotalUsers', data.totalUsers?.toLocaleString() || '0');
        setEl('statTotalConversations', data.totalConversations?.toLocaleString() || '0');
    } catch (err) {
        console.error('Failed to load dashboard stats:', err.message);
    }
}

// ── Conversations ─────────────────────────────────────────────────────────────
// Cached conversations for search
let _allConversations = [];

function renderConversations(convs) {
    const list = document.getElementById('conversationsList');
    if (!convs || convs.length === 0) {
        list.innerHTML = `<div class="empty-state">
            <h3>No conversations found</h3>
            <p>Try a different search term</p>
        </div>`;
        return;
    }
    list.innerHTML = convs.map(c => `
        <div class="conversation-item" onclick="loadMessages('${c.chatId}', '${c.userId}')">
            <div class="conv-avatar">${c.userId.substring(0, 2).toUpperCase()}</div>
            <div class="conv-info">
                <div class="conv-name">+${c.userId}</div>
                <div class="conv-preview">${escHtml(c.lastMessage || '')}</div>
            </div>
            <div class="conv-meta">
                <div class="conv-time">${timeAgo(c.lastTimestamp)}</div>
                ${c.unread > 0 ? `<div class="conv-badge">${c.unread}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function filterConversations(query) {
    if (!query.trim()) { renderConversations(_allConversations); return; }
    const q = query.toLowerCase();
    const filtered = _allConversations.filter(c =>
        c.userId.includes(q) ||
        (c.lastMessage || '').toLowerCase().includes(q)
    );
    renderConversations(filtered);
}

async function loadConversations() {
    const list = document.getElementById('conversationsList');
    list.innerHTML = '<p class="loading-text">Loading...</p>';
    try {
        const data = await api('/api/conversations?limit=100');
        if (!data.conversations || data.conversations.length === 0) {
            list.innerHTML = `<div class="empty-state">
                <h3>No conversations yet</h3>
                <p>Connect WhatsApp to start receiving messages</p>
            </div>`;
            return;
        }
        _allConversations = data.conversations;
        renderConversations(_allConversations);
    } catch (err) {
        list.innerHTML = `<div class="empty-state"><p>⚠️ Could not load conversations. Is the bot running?</p></div>`;
    }
}

async function loadMessages(chatId, userId) {
    // Store for export and handoff functions
    _currentChatId = chatId;
    _currentChatUserId_export = userId;
    currentChatUserId = userId + '@s.whatsapp.net';

    const panel = document.getElementById('messagePanel');
    const title = document.getElementById('messagePanelTitle');
    panel.style.display = 'flex';
    title.textContent = '+' + userId;

    // Show reply box only if in takeover mode
    const handoffData = await api('/api/handoff').catch(() => ({ handoffs: [] }));
    const inHuman = (handoffData.handoffs || []).some(u =>
        u.replace('@s.whatsapp.net','').replace('@c.us','') === userId.replace('@s.whatsapp.net','')
    );
    const replyBox = document.getElementById('replyBox');
    const takeoverBtn = document.getElementById('takeoverBtn');
    const releaseBtn = document.getElementById('releaseBtn');
    if (replyBox) replyBox.style.display = inHuman ? 'block' : 'none';
    if (takeoverBtn) takeoverBtn.style.display = inHuman ? 'none' : '';
    if (releaseBtn) releaseBtn.style.display = inHuman ? '' : 'none';

    // Load saved notes for this user
    loadNotes(userId);

    const msgs = document.getElementById('messagesList');
    msgs.innerHTML = '<p class="loading-text">Loading...</p>';

    try {
        const data = await api(`/api/conversations/${encodeURIComponent(chatId)}/messages`);
        if (!data.messages || data.messages.length === 0) {
            msgs.innerHTML = '<p class="loading-text">No messages found</p>';
            return;
        }
        msgs.innerHTML = data.messages.map(m => `
            <div class="message-bubble ${m.fromMe ? 'outbound' : 'inbound'}">
                <div class="message-text">${escHtml(m.message || '')}</div>
                <div class="message-time">${timeAgo(m.timestamp)}</div>
            </div>
        `).join('');
        msgs.scrollTop = msgs.scrollHeight;
    } catch (err) {
        msgs.innerHTML = '<p class="loading-text">Failed to load messages</p>';
    }
}

// ── Export current chat as .txt ───────────────────────────────────────────────
let _currentChatId = null;
let _currentChatUserId_export = null;

async function exportCurrentChat() {
    if (!_currentChatId) return showToast('No chat open to export');
    try {
        const data = await api(`/api/conversations/${encodeURIComponent(_currentChatId)}/messages?limit=1000`);
        if (!data.messages || data.messages.length === 0) return showToast('No messages to export');

        const lines = [`Chat export: +${_currentChatUserId_export}`, `Exported: ${new Date().toLocaleString()}`, '─'.repeat(50), ''];
        data.messages.forEach(m => {
            const time = new Date(m.timestamp).toLocaleString();
            const who = m.fromMe ? `[${global?.botName || 'Bot'}]` : `[+${_currentChatUserId_export}]`;
            lines.push(`${time} ${who}`);
            lines.push(m.message || '');
            lines.push('');
        });

        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_${_currentChatUserId_export}_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Chat exported ✓');
    } catch (err) {
        showToast('Export failed: ' + err.message);
    }
}

// ── Knowledge Base ────────────────────────────────────────────────────────────
async function loadKnowledgeBase() {
    const tbody = document.getElementById('kbTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-text">Loading...</td></tr>';

    try {
        const data = await api('/api/knowledge-base');
        if (!data.entries || data.entries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading-text">No FAQ entries yet. Upload a chat export or add manually.</td></tr>';
            return;
        }
        tbody.innerHTML = data.entries.map(e => `
            <tr>
                <td style="max-width:200px;">${escHtml(e.question)}</td>
                <td style="max-width:280px;color:var(--color-text-secondary);font-size:13px;">${escHtml(e.answer.substring(0, 100))}${e.answer.length > 100 ? '…' : ''}</td>
                <td><span class="badge">${e.category || 'general'}</span></td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon-small" onclick="editKB(${e.id}, ${JSON.stringify(escHtml(e.question))}, ${JSON.stringify(escHtml(e.answer))}, '${e.category || 'general'}')" title="Edit" style="margin-right:4px;">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5L11.5 4.5L4.5 11.5H2.5V9.5L9.5 2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button class="btn-icon-small danger" onclick="deleteKB(${e.id})" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5H12M5 3.5V2.5H9V3.5M5.5 6V10.5M8.5 6V10.5M3 3.5L3.5 11.5H10.5L11 3.5H3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="loading-text">⚠️ Failed to load. Is the bot running?</td></tr>`;
    }
}

async function deleteKB(id) {
    if (!confirm('Delete this FAQ entry?')) return;
    try {
        await api(`/api/knowledge-base/${id}`, { method: 'DELETE' });
        showToast('FAQ entry deleted');
        loadKnowledgeBase();
    } catch (err) {
        alert('Failed to delete: ' + err.message);
    }
}

function editKB(id, question, answer, category) {
    // Fill the Add form with existing data and switch to edit mode
    document.getElementById('kbQuestion').value = question;
    document.getElementById('kbAnswer').value = answer;
    document.getElementById('kbCategory').value = category || 'general';

    // Change button to Save Edit
    const btn = document.querySelector('#knowledge-page .btn-primary');
    btn.textContent = 'Save Changes';
    btn.onclick = () => saveKBEdit(id);

    // Add cancel button if not already there
    if (!document.getElementById('kbCancelBtn')) {
        const cancel = document.createElement('button');
        cancel.id = 'kbCancelBtn';
        cancel.className = 'btn-secondary';
        cancel.textContent = 'Cancel';
        cancel.style.marginLeft = '8px';
        cancel.onclick = cancelKBEdit;
        btn.after(cancel);
    }

    // Scroll to form
    document.getElementById('kbQuestion').scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('kbQuestion').focus();
    showToast('Editing FAQ — make changes and click Save');
}

async function saveKBEdit(id) {
    const question = document.getElementById('kbQuestion').value.trim();
    const answer = document.getElementById('kbAnswer').value.trim();
    const category = document.getElementById('kbCategory').value;

    if (!question || !answer) return alert('Question and answer are required');

    try {
        await api(`/api/knowledge-base/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ question, answer, category })
        });
        showToast('FAQ entry updated ✓');
        cancelKBEdit();
        loadKnowledgeBase();
    } catch (err) {
        alert('Failed to update: ' + err.message);
    }
}

function cancelKBEdit() {
    document.getElementById('kbQuestion').value = '';
    document.getElementById('kbAnswer').value = '';
    const btn = document.querySelector('#knowledge-page .btn-primary');
    btn.textContent = 'Add Entry';
    btn.onclick = addKBEntry;
    const cancel = document.getElementById('kbCancelBtn');
    if (cancel) cancel.remove();
}

async function addKBEntry() {
    const question = document.getElementById('kbQuestion').value.trim();
    const answer = document.getElementById('kbAnswer').value.trim();
    const category = document.getElementById('kbCategory').value;

    if (!question || !answer) return alert('Question and answer are required');

    try {
        await api('/api/knowledge-base', {
            method: 'POST',
            body: JSON.stringify({ question, answer, category })
        });
        document.getElementById('kbQuestion').value = '';
        document.getElementById('kbAnswer').value = '';
        loadKnowledgeBase();
        showToast('FAQ entry added ✓');
    } catch (err) {
        alert('Failed to add: ' + err.message);
    }
}

// ── Chat Import ───────────────────────────────────────────────────────────────
async function importChatExport() {
    const fileInput = document.getElementById('chatExportFile');
    const yourName = document.getElementById('yourName').value.trim();
    const statusEl = document.getElementById('importStatus');

    if (!fileInput.files[0]) return showImportStatus('error', 'Please select a file first');
    if (!yourName) return showImportStatus('error', 'Enter your name as it appears in the chat');

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('yourName', yourName);

    showImportStatus('loading', 'Importing... this may take a moment');

    try {
        const res = await fetch(BACKEND + '/api/import-chat', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            showImportStatus('success',
                `✓ Done! Imported ${data.imported} FAQ entries from ${data.totalMessages} messages. ` +
                `(${data.duplicatesSkipped || 0} duplicates skipped)`
            );
            fileInput.value = '';
            loadKnowledgeBase();
        } else {
            showImportStatus('error', data.reason || data.error || 'Import failed');
        }
    } catch (err) {
        showImportStatus('error', 'Network error — is the bot server running?');
    }
}

function showImportStatus(type, message) {
    const el = document.getElementById('importStatus');
    el.className = `import-status ${type}`;
    el.textContent = message;
    el.style.display = 'block';
}

// ── Sessions ──────────────────────────────────────────────────────────────────
async function loadSessions() {
    const tbody = document.getElementById('sessionsTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-text">Loading...</td></tr>';

    try {
        const data = await api('/api/sessions');
        document.getElementById('activeSessionsCount').textContent = data.active || 0;

        if (!data.sessions || data.sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading-text">No active sessions</td></tr>';
            return;
        }
        tbody.innerHTML = data.sessions.map(s => `
            <tr>
                <td>+${s.userId}</td>
                <td><span class="badge">${s.state}</span></td>
                <td>${timeAgo(s.lastActivity)}</td>
                <td>
                    <button class="btn-icon-small danger" onclick="clearSession('${s.userId}')" title="Clear">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M2 12L12 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="loading-text">⚠️ Failed to load sessions</td></tr>`;
    }
}

async function clearSession(userId) {
    if (!confirm(`Clear session for +${userId}?`)) return;
    try {
        await api(`/api/sessions/${userId}`, { method: 'DELETE' });
        loadSessions();
        showToast('Session cleared ✓');
    } catch (err) {
        alert('Failed: ' + err.message);
    }
}

// ── Settings ──────────────────────────────────────────────────────────────────

const GROQ_MODELS = [
    { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile (Best quality)' },
    { value: 'llama-3.1-8b-instant',    label: 'llama-3.1-8b-instant (Fastest)' },
    { value: 'mixtral-8x7b-32768',      label: 'mixtral-8x7b-32768 (Long context)' },
    { value: 'gemma2-9b-it',            label: 'gemma2-9b-it (Google / efficient)' },
];
const GEMINI_MODELS = [
    { value: 'gemini-2.0-flash',        label: 'gemini-2.0-flash (Fast & free)' },
    { value: 'gemini-1.5-pro',          label: 'gemini-1.5-pro (Most capable)' },
    { value: 'gemini-1.5-flash',        label: 'gemini-1.5-flash (Balanced)' },
];
function updateModelOptions() {
    const provider = document.getElementById('settingProvider')?.value || 'groq';
    const modelSel = document.getElementById('settingModel');
    if (!modelSel) return;
    const models = provider === 'groq' ? GROQ_MODELS : GEMINI_MODELS;
    const current = modelSel.value;
    modelSel.innerHTML = models.map(m =>
        `<option value="${m.value}" ${m.value === current ? 'selected' : ''}>${m.label}</option>`
    ).join('');
}

async function loadSettings() {
    // Set backend URL display
    const urlEl = document.getElementById('settingBackendUrl');
    if (urlEl) urlEl.value = BACKEND;

    try {
        // Load live settings from backend
        const data = await api('/api/settings');
        const env = data.settings || {};

        // Provider & model
        const provider = env.AI_PROVIDER || 'groq';
        if (document.getElementById('settingProvider')) {
            document.getElementById('settingProvider').value = provider;
            updateModelOptions();
            document.getElementById('settingModel').value = env.AI_MODEL || 'llama-3.3-70b-versatile';
        }

        // Tokens & temperature
        if (document.getElementById('settingMaxTokens')) document.getElementById('settingMaxTokens').value = env.MAX_TOKENS || 1000;
        if (document.getElementById('settingTemperature')) document.getElementById('settingTemperature').value = env.TEMPERATURE || 0.7;

        // Bot identity
        if (document.getElementById('settingBotName')) document.getElementById('settingBotName').value = env.BOT_NAME || '';
        if (document.getElementById('settingBusinessName')) document.getElementById('settingBusinessName').value = env.BUSINESS_NAME || '';
        if (document.getElementById('settingBusinessDesc')) document.getElementById('settingBusinessDesc').value = env.BUSINESS_DESCRIPTION || '';
        if (document.getElementById('settingBusinessHours')) document.getElementById('settingBusinessHours').value = env.BUSINESS_HOURS || '';
        if (document.getElementById('settingBusinessPhone')) document.getElementById('settingBusinessPhone').value = env.BUSINESS_PHONE || '';
        if (document.getElementById('settingBusinessEmail')) document.getElementById('settingBusinessEmail').value = env.BUSINESS_EMAIL || '';
        if (document.getElementById('settingBusinessLocation')) document.getElementById('settingBusinessLocation').value = env.BUSINESS_LOCATION || '';

        // Behaviour
        if (document.getElementById('settingContextLimit')) document.getElementById('settingContextLimit').value = env.CONTEXT_MESSAGE_LIMIT || 10;
        if (document.getElementById('settingRateLimit')) document.getElementById('settingRateLimit').value = env.MAX_MESSAGES_PER_MINUTE || 30;
        if (document.getElementById('settingFAQ')) document.getElementById('settingFAQ').checked = env.ENABLE_FAQ_MATCHING !== 'false';
        if (document.getElementById('settingIntent')) document.getElementById('settingIntent').checked = env.ENABLE_INTENT_CLASSIFICATION !== 'false';
        if (document.getElementById('settingDebug')) document.getElementById('settingDebug').checked = env.DEBUG_AI_ERRORS === 'true';

        showSettingsStatus('success', '✓ Settings loaded from bot');
    } catch (err) {
        // Fallback to localStorage if backend not reachable
        try {
            const saved = JSON.parse(localStorage.getItem('akay_settings') || '{}');
            if (saved.AI_PROVIDER && document.getElementById('settingProvider')) {
                document.getElementById('settingProvider').value = saved.AI_PROVIDER;
                updateModelOptions();
            }
            if (saved.AI_MODEL && document.getElementById('settingModel')) document.getElementById('settingModel').value = saved.AI_MODEL;
        } catch (_) {}
        showSettingsStatus('warning', '⚠️ Could not reach backend — showing last saved values');
    }
}

async function saveSettings() {
    const btn = document.getElementById('saveSettingsBtn');
    if (btn) { btn.textContent = '⏳ Saving...'; btn.disabled = true; }

    const settings = {
        AI_PROVIDER:                document.getElementById('settingProvider')?.value || 'groq',
        AI_MODEL:                   document.getElementById('settingModel')?.value || 'llama-3.3-70b-versatile',
        MAX_TOKENS:                 document.getElementById('settingMaxTokens')?.value || '1000',
        TEMPERATURE:                document.getElementById('settingTemperature')?.value || '0.7',
        BOT_NAME:                   document.getElementById('settingBotName')?.value || '',
        BUSINESS_NAME:              document.getElementById('settingBusinessName')?.value || '',
        BUSINESS_DESCRIPTION:       document.getElementById('settingBusinessDesc')?.value || '',
        BUSINESS_HOURS:             document.getElementById('settingBusinessHours')?.value || '',
        BUSINESS_PHONE:             document.getElementById('settingBusinessPhone')?.value || '',
        BUSINESS_EMAIL:             document.getElementById('settingBusinessEmail')?.value || '',
        BUSINESS_LOCATION:          document.getElementById('settingBusinessLocation')?.value || '',
        CONTEXT_MESSAGE_LIMIT:      document.getElementById('settingContextLimit')?.value || '10',
        MAX_MESSAGES_PER_MINUTE:    document.getElementById('settingRateLimit')?.value || '30',
        ENABLE_FAQ_MATCHING:        document.getElementById('settingFAQ')?.checked ? 'true' : 'false',
        ENABLE_INTENT_CLASSIFICATION: document.getElementById('settingIntent')?.checked ? 'true' : 'false',
        DEBUG_AI_ERRORS:            document.getElementById('settingDebug')?.checked ? 'true' : 'false',
    };

    // Always save to localStorage as backup
    localStorage.setItem('akay_settings', JSON.stringify(settings));

    try {
        await api('/api/settings', {
            method: 'POST',
            body: JSON.stringify({ settings })
        });
        showSettingsStatus('success', '✅ Settings saved! Bot will apply changes immediately.');
        showToast('Settings saved ✓');
    } catch (err) {
        showSettingsStatus('warning',
            `⚠️ Saved locally but could not push to backend: ${err.message}. Update your Railway Variables manually.`
        );
        showToast('Saved locally (backend unreachable)');
    }

    if (btn) { btn.textContent = '💾 Save & Apply'; btn.disabled = false; }
}

function showSettingsStatus(type, msg) {
    const el = document.getElementById('settingsSaveStatus');
    if (!el) return;
    el.style.display = 'block';
    el.textContent = msg;
    const colors = {
        success: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', border: 'var(--color-success)' },
        warning: { bg: '#fefce8', color: '#854d0e', border: '#ca8a04' },
        error:   { bg: '#fef2f2', color: 'var(--color-danger)', border: 'var(--color-danger)' },
    };
    const c = colors[type] || colors.error;
    el.style.background = c.bg;
    el.style.color = c.color;
    el.style.border = `1px solid ${c.border}`;
    if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 4000);
}

async function testConnection() {
    const el = document.getElementById('connectionTestResult');
    if (el) { el.style.display = 'block'; el.textContent = '⏳ Testing...'; el.style.background = '#fefce8'; el.style.color = '#854d0e'; }
    try {
        const data = await api('/api/health');
        const msg = `✅ Connected! Bot status: ${data.connection} | Uptime: ${Math.floor(data.uptime/60)}m`;
        if (el) { el.textContent = msg; el.style.background = 'var(--color-success-bg)'; el.style.color = 'var(--color-success)'; }
        showToast('Backend reachable ✓');
    } catch (err) {
        if (el) { el.textContent = `❌ Cannot reach backend: ${err.message}`; el.style.background = '#fef2f2'; el.style.color = 'var(--color-danger)'; }
    }
}

async function clearAllSessions() {
    if (!confirm('Clear ALL user conversation sessions? This resets multi-step flows for all users.')) return;
    try {
        const sessions = await api('/api/sessions');
        let cleared = 0;
        for (const s of (sessions.sessions || [])) {
            await api(`/api/sessions/${s.userId}`, { method: 'DELETE' });
            cleared++;
        }
        showToast(`Cleared ${cleared} sessions ✓`);
    } catch (err) {
        showToast('Failed: ' + err.message);
    }
}

// ── Chart ─────────────────────────────────────────────────────────────────────
function initCharts() {
    const canvas = document.getElementById('messageChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.offsetWidth * 2);
    canvas.height = 400;

    // Use real data if available, fallback to empty
    const data = canvas.dataset.values
        ? JSON.parse(canvas.dataset.values)
        : [0, 0, 0, 0, 0, 0, 0];
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    ctx.clearRect(0, 0, width, 400);
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = 40 + (300 / 4) * i;
        ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(width - 40, y); ctx.stroke();
    }

    const maxValue = Math.max(...data, 1);
    const step = (width - 80) / (data.length - 1);
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    data.forEach((v, i) => {
        const x = 40 + step * i;
        const y = 40 + 300 - (v / maxValue) * 300;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    data.forEach((v, i) => {
        const x = 40 + step * i;
        const y = 40 + 300 - (v / maxValue) * 300;
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    });

    ctx.fillStyle = '#737373';
    ctx.font = '24px IBM Plex Sans';
    ctx.textAlign = 'center';
    labels.forEach((l, i) => ctx.fillText(l, 40 + step * i, 370));
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - (typeof ts === 'number' ? ts : new Date(ts).getTime());
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
    await requireAuth();

    const user = getCurrentUser();
    if (user) {
        setEl('userName', user.username);
        const initials = user.username.substring(0, 2).toUpperCase();
        setEl('userAvatar', initials);
    }

    loadSettings();
    initCharts();
    loadDashboard();
    refreshStatus();
    setInterval(refreshStatus, 10000);
    setInterval(loadDashboard, 30000);
});

window.addEventListener('resize', initCharts);

// ── WhatsApp Connection ───────────────────────────────────────────────────────
let connectionPoller = null;

async function loadConnectPage() {
    try {
        const data = await api('/api/connection');
        updateConnectUI(data);
    } catch (err) {
        showConnectBanner('error', '⚠️ Cannot reach bot backend. Is it running?');
    }
}

function updateConnectUI(data) {
    const { status, qrCode, pairingCode, phoneNumber } = data;

    const qrWrapper = document.getElementById('qrWrapper');
    const pairingWrapper = document.getElementById('pairingWrapper');
    const connectedWrapper = document.getElementById('connectedWrapper');
    const connectActions = document.getElementById('connectActions');
    const disconnectSection = document.getElementById('disconnectSection');

    // Reset all panels
    qrWrapper.style.display = 'none';
    pairingWrapper.style.display = 'none';
    connectedWrapper.style.display = 'none';
    document.getElementById('connectStatusBanner').style.display = 'none';
    disconnectSection.style.display = 'none';

    if (status === 'connected') {
        connectedWrapper.style.display = 'block';
        connectActions.style.display = 'block';
        disconnectSection.style.display = 'block';
        document.getElementById('connectedPhone').textContent = `Connected: +${phoneNumber}`;
        updateConnectionUI(true);
        stopConnectionPoller();

    } else if (status === 'qr' && qrCode) {
        qrWrapper.style.display = 'block';
        connectActions.style.display = 'none';
        const img = document.getElementById('qrImage');
        // Handle both base64 data URL and raw QR string
        img.src = qrCode.startsWith('data:') ? qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCode)}`;
        showConnectBanner('loading', '📷 QR code ready — scan with WhatsApp now');

    } else if (status === 'pairing' && pairingCode) {
        pairingWrapper.style.display = 'block';
        connectActions.style.display = 'none';
        document.getElementById('pairingCodeDisplay').textContent = pairingCode;
        showConnectBanner('loading', '🔢 Enter this code in WhatsApp now');

    } else if (status === 'connecting') {
        connectActions.style.display = 'block';
        showConnectBanner('loading', '⏳ Bot is starting up...');

    } else {
        // disconnected
        connectActions.style.display = 'block';
        updateConnectionUI(false);
    }
}

function showConnectBanner(type, message) {
    const el = document.getElementById('connectStatusBanner');
    el.className = `connect-banner ${type}`;
    el.textContent = message;
    el.style.display = 'block';
}

async function requestQR() {
    showConnectBanner('loading', '⏳ Starting bot...');
    document.getElementById('connectActions').style.display = 'none';

    try {
        const status = await api('/api/connection');
        if (status.status === 'connected') {
            updateConnectUI(status);
            return;
        }

        // Clear any existing QR/pairing first then trigger fresh bot start
        await api('/api/connection/reconnect', { method: 'POST' });
        showConnectBanner('loading', '⏳ Waiting for QR code (up to 15s)...');

        // Poll every 2 seconds for up to 30 seconds
        let attempts = 0;
        const maxAttempts = 15;
        const poll = setInterval(async () => {
            attempts++;
            try {
                const s = await api('/api/connection');
                if (s.status === 'connected') {
                    clearInterval(poll);
                    updateConnectUI(s);
                    return;
                }
                if (s.status === 'qr' && s.qrCode) {
                    clearInterval(poll);
                    updateConnectUI(s);
                    showConnectBanner('loading', '📸 Scan the QR code with WhatsApp → Settings → Linked Devices → Link a Device');
                    startConnectionPoller();
                    return;
                }
            } catch (_) {}
            if (attempts >= maxAttempts) {
                clearInterval(poll);
                showConnectBanner('error', '❌ QR not generated. Check Railway logs and try again.');
                document.getElementById('connectActions').style.display = 'block';
            }
        }, 2000);
    } catch (err) {
        showConnectBanner('error', '❌ ' + err.message);
        document.getElementById('connectActions').style.display = 'block';
    }
}

async function requestPairingCode() {
    const input = document.getElementById('pairingPhoneInput');
    // Strip everything except digits
    let phone = input.value.replace(/[^0-9]/g, '');

    // Auto-add country code 234 if starts with 0 (Nigerian number)
    if (phone.startsWith('0') && phone.length === 11) {
        phone = '234' + phone.slice(1);
    }

    if (!phone || phone.length < 10) {
        showConnectBanner('error', '❌ Enter your WhatsApp number with country code. Example: 2348012345678');
        return;
    }

    document.getElementById('connectActions').style.display = 'none';

    try {
        const status = await api('/api/connection');

        if (status.status === 'connected') {
            showConnectBanner('error', '❌ Already connected. Disconnect first then try pairing.');
            document.getElementById('connectActions').style.display = 'block';
            return;
        }

        // Start fresh bot then immediately request pairing code
        // (pairing code must be requested BEFORE QR is shown)
        showConnectBanner('loading', '⏳ Starting bot...');
        await api('/api/connection/reconnect', { method: 'POST' });

        // Wait for socket to open (bot needs ~3-6 seconds to initialize)
        showConnectBanner('loading', '⏳ Waiting for connection (up to 10s)...');
        let waited = 0;
        while (waited < 10000) {
            await new Promise(r => setTimeout(r, 1000));
            waited += 1000;
            try {
                const s = await api('/api/connection');
                if (s.status === 'connected') { updateConnectUI(s); return; }
                // Once socket is connecting/qr, we can request pairing code
                if (s.status === 'connecting' || s.status === 'qr') break;
            } catch (_) {}
        }

        showConnectBanner('loading', `⏳ Requesting pairing code for ${phone}...`);
        const data = await api('/api/connection/pair', {
            method: 'POST',
            body: JSON.stringify({ phoneNumber: phone })
        });

        if (data.success && data.pairingCode) {
            const code = data.pairingCode;
            document.getElementById('pairingCodeDisplay').textContent = code;
            document.getElementById('pairingWrapper').style.display = 'block';
            document.getElementById('connectActions').style.display = 'none';
            showConnectBanner('loading',
                '📱 Open WhatsApp → Menu (⋮) → Linked Devices → Link a Device → "Link with phone number instead" → enter this code'
            );
            startConnectionPoller();
        } else {
            const errMsg = data.error || 'Failed to get pairing code';
            showConnectBanner('error', `❌ ${errMsg}`);
            document.getElementById('connectActions').style.display = 'block';
        }
    } catch (err) {
        showConnectBanner('error', '❌ ' + err.message);
        document.getElementById('connectActions').style.display = 'block';
    }
}

async function disconnectWhatsApp() {
    if (!confirm('Disconnect WhatsApp? You will need to re-pair after this.')) return;
    try {
        await api('/api/connection/disconnect', { method: 'POST' });
        showToast('Disconnected ✓');
        loadConnectPage();
        updateConnectionUI(false);
    } catch (err) {
        showConnectBanner('error', '❌ ' + err.message);
    }
}

function startConnectionPoller() {
    stopConnectionPoller();
    connectionPoller = setInterval(async () => {
        try {
            const data = await api('/api/connection');
            updateConnectUI(data);
            // NOTE: do NOT stop polling when connected
            // We need to keep polling to detect disconnects
        } catch (_) {}
    }, 2000);
}

function stopConnectionPoller() {
    if (connectionPoller) {
        clearInterval(connectionPoller);
        connectionPoller = null;
    }
}



// ── Live phone number preview ─────────────────────────────────────────────────
function previewPhoneNumber(input) {
    const raw = input.value.replace(/[^0-9]/g, '');
    const preview = document.getElementById('phonePreview');
    if (!preview) return;

    if (!raw) { preview.textContent = ''; return; }

    let formatted = raw;
    // Auto-fix: Nigerian 080/090/081 → 234...
    if (raw.startsWith('0') && raw.length <= 11) {
        formatted = '234' + raw.slice(1);
    }
    // Show formatted version
    if (formatted.length >= 10) {
        preview.innerHTML = `✓ Will use: <strong>+${formatted}</strong> &nbsp;(${formatted.length} digits)`;
        preview.style.color = 'var(--color-success)';
    } else {
        preview.innerHTML = `Formatted: +${formatted} &nbsp;— need ${10 - formatted.length} more digits`;
        preview.style.color = 'var(--color-warning)';
    }
}


// ── Human Handoff ─────────────────────────────────────────────────────────────
let currentChatUserId = null;

async function loadHandoffs() {
    try {
        const data = await api('/api/handoff');
        const list = document.getElementById('handoffList');
        if (!list) return;
        if (!data.handoffs || data.handoffs.length === 0) {
            list.innerHTML = '<p style="font-size:12px; color:var(--color-text-tertiary); margin:0;">No active handoffs — bot is handling all chats.</p>';
            return;
        }
        list.innerHTML = `
            <p style="font-size:12px; font-weight:600; margin:0 0 8px; color:var(--color-warning);">
                👤 ${data.handoffs.length} chat(s) in human mode:
            </p>
            ${data.handoffs.map(u => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px; background:var(--color-bg); border-radius:6px; margin-bottom:4px;">
                    <span style="font-size:13px; font-family:monospace;">+${u.replace('@s.whatsapp.net','').replace('@c.us','')}</span>
                    <button class="btn-sm btn-secondary" onclick="releaseSpecific('${u}')">🤖 Release</button>
                </div>
            `).join('')}
            <button class="btn-sm btn-secondary" onclick="releaseAll()" style="margin-top:8px; width:100%;">
                🤖 Release ALL to bot
            </button>
        `;
    } catch (_) {}
}

async function takeoverChat() {
    let num = document.getElementById('handoffNumber')?.value?.replace(/[^0-9]/g, '') || '';
    if (num.startsWith('0') && num.length === 11) num = '234' + num.slice(1);
    if (!num || num.length < 10) return showHandoffBanner('Enter a valid WhatsApp number', 'error');

    const userId = num + '@s.whatsapp.net';
    try {
        await api('/api/handoff/takeover', { method: 'POST', body: JSON.stringify({ userId }) });
        showHandoffBanner(`✓ You now control +${num}. Bot is silent for this chat.`, 'success');
        document.getElementById('handoffNumber').value = '';
        loadHandoffs();
    } catch (err) {
        showHandoffBanner('Failed: ' + err.message, 'error');
    }
}

async function releaseChat() {
    let num = document.getElementById('handoffNumber')?.value?.replace(/[^0-9]/g, '') || '';
    if (num.startsWith('0') && num.length === 11) num = '234' + num.slice(1);
    if (!num || num.length < 10) return showHandoffBanner('Enter a valid WhatsApp number', 'error');

    const userId = num + '@s.whatsapp.net';
    try {
        await api('/api/handoff/release', { method: 'POST', body: JSON.stringify({ userId }) });
        showHandoffBanner(`✓ Bot resumed for +${num}`, 'success');
        document.getElementById('handoffNumber').value = '';
        loadHandoffs();
    } catch (err) {
        showHandoffBanner('Failed: ' + err.message, 'error');
    }
}

async function releaseSpecific(userId) {
    try {
        await api('/api/handoff/release', { method: 'POST', body: JSON.stringify({ userId }) });
        loadHandoffs();
        showHandoffBanner('✓ Bot resumed', 'success');
    } catch (_) {}
}

async function releaseAll() {
    if (!confirm('Release ALL chats back to bot?')) return;
    try {
        await api('/api/handoff/release-all', { method: 'POST' });
        showHandoffBanner('✓ Bot resumed for all chats', 'success');
        loadHandoffs();
    } catch (_) {}
}

// Take over from message panel (when viewing a specific chat)
async function takeoverCurrentChat() {
    if (!currentChatUserId) return;
    try {
        await api('/api/handoff/takeover', { method: 'POST', body: JSON.stringify({ userId: currentChatUserId }) });
        document.getElementById('takeoverBtn').style.display = 'none';
        document.getElementById('releaseBtn').style.display = '';
        const replyBox = document.getElementById('replyBox');
        if (replyBox) replyBox.style.display = 'block';
        document.getElementById('replyInput')?.focus();
        showToast('👤 You now control this chat — bot is silent');
    } catch (_) {}
}

async function releaseCurrentChat() {
    if (!currentChatUserId) return;
    try {
        await api('/api/handoff/release', { method: 'POST', body: JSON.stringify({ userId: currentChatUserId }) });
        document.getElementById('takeoverBtn').style.display = '';
        document.getElementById('releaseBtn').style.display = 'none';
        const replyBox = document.getElementById('replyBox');
        if (replyBox) replyBox.style.display = 'none';
        showToast('🤖 Bot resumed for this chat');
    } catch (_) {}
}

function showHandoffBanner(msg, type) {
    const el = document.getElementById('handoffBanner');
    if (!el) return;
    el.style.display = 'block';
    el.textContent = msg;
    el.style.background = type === 'success' ? 'var(--color-success-bg, #f0fdf4)' : 'var(--color-danger-bg, #fef2f2)';
    el.style.color = type === 'success' ? 'var(--color-success)' : 'var(--color-danger)';
    el.style.border = `1px solid ${type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`;
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ── Close sidebar on nav click (mobile) ──────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeSidebar();
    });
});
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeSidebar();
});

// ── Auto-init: silently check status only — never auto-trigger QR ────────────
(async function autoInit() {
    try {
        const data = await api('/api/connection');
        // Only update UI if already in an active state (connected/qr/pairing)
        // Never auto-trigger QR — user must choose QR or Pairing Code themselves
        if (data.status === 'connected') {
            updateConnectionUI(true);
            // If user is on connect page, show connected state
            const connectPage = document.getElementById('connect-page');
            if (connectPage && connectPage.style.display !== 'none') {
                updateConnectUI(data);
            }
        } else if (data.status === 'qr' || data.status === 'pairing') {
            // Already in progress — resume polling so UI catches up
            // but only if user is already on the connect page
            const connectPage = document.getElementById('connect-page');
            if (connectPage && connectPage.style.display !== 'none') {
                updateConnectUI(data);
                startConnectionPoller();
            }
        }
        // If disconnected — do nothing, let user choose their method
    } catch (err) {
        console.warn('Auto-init failed:', err.message);
    }
})();


// ══════════════════════════════════════════════════════════════════════════════
// REPLY FROM DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

async function sendReply() {
    const input = document.getElementById('replyInput');
    const message = input?.value?.trim();
    if (!message) return;
    if (!currentChatUserId) return showToast('No chat selected');

    const chatId = _currentChatId;
    try {
        input.value = '';
        input.style.height = 'auto';

        await api('/api/conversations/send', {
            method: 'POST',
            body: JSON.stringify({ chatId, userId: currentChatUserId, message })
        });

        // Optimistically render the sent message
        const msgs = document.getElementById('messagesList');
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble outbound';
        bubble.innerHTML = `<div class="message-text">${escHtml(message)}</div><div class="message-time">just now</div>`;
        msgs.appendChild(bubble);
        msgs.scrollTop = msgs.scrollHeight;
    } catch (err) {
        showToast('Failed to send: ' + err.message);
        input.value = message; // restore on fail
    }
}

function handleReplyKey(e) {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendReply();
    }
}

function autoResizeReply(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMER NOTES
// ══════════════════════════════════════════════════════════════════════════════

let _notesVisible = false;

function toggleNotes() {
    const panel = document.getElementById('notesPanel');
    if (!panel) return;
    _notesVisible = !_notesVisible;
    panel.style.display = _notesVisible ? 'block' : 'none';
    if (_notesVisible && _currentChatUserId_export) {
        loadNotes(_currentChatUserId_export);
    }
}

async function loadNotes(userId) {
    try {
        const data = await api(`/api/customers/${userId}/notes`);
        const el = document.getElementById('customerNotesInput');
        if (el) el.value = data.notes || '';
    } catch (_) {
        // No notes yet — that's fine
        const el = document.getElementById('customerNotesInput');
        if (el) el.value = '';
    }
}

async function saveNotes() {
    const notes = document.getElementById('customerNotesInput')?.value || '';
    const userId = _currentChatUserId_export;
    if (!userId) return;
    try {
        await api(`/api/customers/${userId}/notes`, {
            method: 'POST',
            body: JSON.stringify({ notes })
        });
        showToast('Notes saved ✓');
    } catch (err) {
        showToast('Failed to save notes: ' + err.message);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// BROADCAST
// ══════════════════════════════════════════════════════════════════════════════

let _broadcastContacts = [];
let _broadcastSending  = false;

async function loadBroadcastPage() {
    await fetchBroadcastContacts();
    await loadBroadcastHistory();
}

async function fetchBroadcastContacts() {
    try {
        const data = await api('/api/conversations?limit=500');
        _broadcastContacts = (data.conversations || []).map(c => c.userId);
        updateBroadcastCount();
    } catch (_) {}
}

function onBroadcastTargetChange() {
    const target = document.getElementById('broadcastTarget').value;
    const customWrap = document.getElementById('customRecipientsWrap');
    customWrap.style.display = target === 'custom' ? 'block' : 'none';
    updateBroadcastCount();
}

async function updateBroadcastCount() {
    const target = document.getElementById('broadcastTarget')?.value;
    const el = document.getElementById('broadcastCount');
    if (!el) return;
    let count = 0;
    if (target === 'all') {
        count = _broadcastContacts.length;
    } else if (target === 'recent') {
        // Filter to contacts active in last 7 days
        try {
            const data = await api('/api/conversations?limit=500');
            const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
            count = (data.conversations || []).filter(c => c.lastTimestamp > cutoff).length;
        } catch (_) {}
    } else {
        const raw = document.getElementById('customRecipients')?.value || '';
        count = raw.split('\n').map(l => l.trim()).filter(Boolean).length;
    }
    el.textContent = count + ' contact' + (count !== 1 ? 's' : '');
    return count;
}

async function previewBroadcast() {
    const message = document.getElementById('broadcastMessage')?.value?.trim();
    if (!message) return showToast('Write a message first');
    const count = await updateBroadcastCount();
    if (!count) return showToast('No recipients selected');
    if (confirm(`Preview:\n\n"${message.substring(0,200)}${message.length > 200 ? '...' : ''}"\n\nThis will be sent to ${count} contact(s). Continue?`)) {
        sendBroadcast();
    }
}

async function sendBroadcast() {
    if (_broadcastSending) return showToast('Broadcast already in progress...');
    const message = document.getElementById('broadcastMessage')?.value?.trim();
    if (!message) return showToast('Please write a message first');

    const target  = document.getElementById('broadcastTarget').value;
    const delay   = parseInt(document.getElementById('broadcastDelay').value) || 2000;

    // Get recipient list
    let recipients = [];
    if (target === 'all') {
        recipients = _broadcastContacts;
    } else if (target === 'recent') {
        const data = await api('/api/conversations?limit=500').catch(() => ({ conversations: [] }));
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        recipients = (data.conversations || []).filter(c => c.lastTimestamp > cutoff).map(c => c.userId);
    } else {
        recipients = (document.getElementById('customRecipients')?.value || '')
            .split('\n').map(l => l.replace(/[^0-9]/g,'').trim()).filter(l => l.length >= 10);
    }

    if (!recipients.length) return showToast('No valid recipients');
    if (!confirm(`Send to ${recipients.length} contact(s)?\n\nThis cannot be undone.`)) return;

    _broadcastSending = true;
    const btn = document.getElementById('broadcastSendBtn');
    if (btn) btn.disabled = true;

    // Show progress UI
    const prog = document.getElementById('broadcastProgress');
    const fill = document.getElementById('broadcastProgressFill');
    const text = document.getElementById('broadcastProgressText');
    const count = document.getElementById('broadcastProgressCount');
    const log   = document.getElementById('broadcastLog');
    if (prog) prog.style.display = 'block';
    if (log)  log.innerHTML = '';

    let sent = 0, failed = 0;
    const startTime = Date.now();

    for (let i = 0; i < recipients.length; i++) {
        const userId = recipients[i];
        const chatId = userId + '@s.whatsapp.net';

        try {
            await api('/api/conversations/send', {
                method: 'POST',
                body: JSON.stringify({ chatId, userId: chatId, message })
            });
            sent++;
            addBroadcastLog(log, `✓ +${userId}`, 'ok');
        } catch (err) {
            failed++;
            addBroadcastLog(log, `✗ +${userId}: ${err.message}`, 'fail');
        }

        // Update progress
        const pct = Math.round(((i + 1) / recipients.length) * 100);
        if (fill) fill.style.width = pct + '%';
        if (count) count.textContent = `${i + 1} / ${recipients.length}`;
        if (text) text.textContent = `Sending... (${pct}%)`;

        // Save to history incrementally
        if (i < recipients.length - 1) {
            await new Promise(r => setTimeout(r, delay));
        }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (text) text.textContent = `✅ Done — ${sent} sent, ${failed} failed in ${elapsed}s`;

    // Save to broadcast history
    saveBroadcastHistory({ message, total: recipients.length, sent, failed, timestamp: Date.now() });

    _broadcastSending = false;
    if (btn) btn.disabled = false;
    loadBroadcastHistory();
}

function addBroadcastLog(container, msg, type) {
    if (!container) return;
    const line = document.createElement('div');
    line.className = 'broadcast-log-line ' + type;
    line.textContent = msg;
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
}

function saveBroadcastHistory(entry) {
    try {
        const hist = JSON.parse(localStorage.getItem('broadcast_history') || '[]');
        hist.unshift(entry);
        localStorage.setItem('broadcast_history', JSON.stringify(hist.slice(0, 20)));
    } catch (_) {}
}

function loadBroadcastHistory() {
    const el = document.getElementById('broadcastHistory');
    if (!el) return;
    try {
        const hist = JSON.parse(localStorage.getItem('broadcast_history') || '[]');
        if (!hist.length) {
            el.innerHTML = '<p class="loading-text" style="font-size:13px;">No broadcasts sent yet.</p>';
            return;
        }
        el.innerHTML = hist.map(h => `
            <div class="history-item">
                <div class="history-item-meta">
                    <span style="font-weight:600;">${new Date(h.timestamp).toLocaleString()}</span>
                    <span style="color:var(--color-success);">${h.sent}/${h.total} sent</span>
                </div>
                <div class="history-item-preview">${escHtml(h.message)}</div>
            </div>
        `).join('');
    } catch (_) {
        el.innerHTML = '<p class="loading-text">No history</p>';
    }
}

// Update char counter on broadcast message
document.addEventListener('DOMContentLoaded', () => {
    const ta = document.getElementById('broadcastMessage');
    const cc = document.getElementById('broadcastCharCount');
    if (ta && cc) {
        ta.addEventListener('input', () => {
            cc.textContent = ta.value.length + ' chars';
        });
    }
});
