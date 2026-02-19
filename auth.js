// AKAY Bot - Auth Module
// Password validation happens server-side via /auth/login
// Token stored in sessionStorage (not localStorage) — cleared on tab close

const SESSION_KEY = 'akay_token';
const LOGIN_ATTEMPTS_KEY = 'akay_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

function getToken() {
    return sessionStorage.getItem(SESSION_KEY);
}

function getAttempts() {
    try {
        return JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY)) || { count: 0, lockedUntil: 0 };
    } catch (_) {
        return { count: 0, lockedUntil: 0 };
    }
}

function setAttempts(count, lockedUntil = 0) {
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify({ count, lockedUntil }));
}

function clearAttempts() {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
}

function getLockoutRemaining() {
    const { lockedUntil } = getAttempts();
    const remaining = lockedUntil - Date.now();
    if (remaining <= 0 && lockedUntil !== 0) clearAttempts();
    return Math.max(remaining, 0);
}

function formatTime(ms) {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

// Call server to verify token is still valid
async function verifyToken(token) {
    try {
        const res = await fetch('/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        const data = await res.json();
        return data.valid === true;
    } catch (_) {
        return false;
    }
}

async function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
    return await verifyToken(token);
}

async function login(password) {
    const lockoutRemaining = getLockoutRemaining();
    if (lockoutRemaining > 0) {
        return { success: false, reason: 'locked', remaining: formatTime(lockoutRemaining) };
    }

    try {
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();

        if (data.success && data.token) {
            sessionStorage.setItem(SESSION_KEY, data.token);
            clearAttempts();
            return { success: true };
        }
    } catch (_) {}

    const attempts = getAttempts();
    const nextCount = attempts.count + 1;

    if (nextCount >= MAX_ATTEMPTS) {
        setAttempts(nextCount, Date.now() + LOCKOUT_MS);
        return { success: false, reason: 'locked', remaining: formatTime(LOCKOUT_MS) };
    }

    setAttempts(nextCount);
    return { success: false, reason: 'invalid', attemptsLeft: MAX_ATTEMPTS - nextCount };
}

function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
}

function getCurrentUser() {
    return { username: 'Admin' };
}

async function requireAuth() {
    const ok = await isAuthenticated();
    if (!ok) {
        window.location.href = 'login.html';
    }
}
