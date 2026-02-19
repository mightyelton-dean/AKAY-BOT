// AKAY Bot Dashboard - Main Script
// All data fetched from real backend via /api/*

const BACKEND = ''; // empty = same origin (proxied by server.js)

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
        if (page === 'overview') loadDashboard();
        if (page === 'conversations') loadConversations();
        if (page === 'knowledge') loadKnowledgeBase();
        if (page === 'sessions') loadSessions();
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
async function loadConversations() {
    const list = document.getElementById('conversationsList');
    list.innerHTML = '<p class="loading-text">Loading...</p>';

    try {
        const data = await api('/api/conversations?limit=50');
        if (!data.conversations || data.conversations.length === 0) {
            list.innerHTML = `<div class="empty-state">
                <h3>No conversations yet</h3>
                <p>Connect WhatsApp to start receiving messages</p>
            </div>`;
            return;
        }

        list.innerHTML = data.conversations.map(c => `
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
    } catch (err) {
        list.innerHTML = `<div class="empty-state"><p>⚠️ Could not load conversations. Is the bot running?</p></div>`;
    }
}

async function loadMessages(chatId, userId) {
    const panel = document.getElementById('messagePanel');
    const title = document.getElementById('messagePanelTitle');
    panel.style.display = 'flex';
    title.textContent = '+' + userId;

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
                <td>${escHtml(e.question)}</td>
                <td>${escHtml(e.answer.substring(0, 80))}${e.answer.length > 80 ? '...' : ''}</td>
                <td><span class="badge">${e.category || 'general'}</span></td>
                <td>
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
        loadKnowledgeBase();
    } catch (err) {
        alert('Failed to delete: ' + err.message);
    }
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
        const res = await fetch('/api/import-chat', { method: 'POST', body: formData });
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
function saveSettings() {
    const model = document.getElementById('aiModel').value;
    const prompt = document.getElementById('systemPrompt').value;
    // Store in localStorage for now — future: POST to /api/settings
    localStorage.setItem('akay_settings', JSON.stringify({ model, prompt }));
    showToast('Settings saved ✓');
}

function loadSettings() {
    try {
        const s = JSON.parse(localStorage.getItem('akay_settings') || '{}');
        if (s.model) document.getElementById('aiModel').value = s.model;
        if (s.prompt) document.getElementById('systemPrompt').value = s.prompt;
    } catch (_) {}
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
