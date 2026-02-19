// Authentication System for AKAY Bot Dashboard

// Default admin credentials (in production, this would be server-side)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'akaybot2026', // Change this!
    email: 'admin@akaybot.com'
};

const SESSION_KEY = 'akay_session';
const LOGIN_ATTEMPTS_KEY = 'akay_login_attempts';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getSessionData() {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;

    try {
        return JSON.parse(session);
    } catch (e) {
        localStorage.removeItem(SESSION_KEY);
        return null;
    }
}

function getLoginAttempts() {
    const data = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (!data) {
        return { count: 0, lockedUntil: 0 };
    }

    try {
        const parsed = JSON.parse(data);
        return {
            count: Number(parsed.count) || 0,
            lockedUntil: Number(parsed.lockedUntil) || 0
        };
    } catch (e) {
        localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
        return { count: 0, lockedUntil: 0 };
    }
}

function setLoginAttempts(count, lockedUntil = 0) {
    localStorage.setItem(
        LOGIN_ATTEMPTS_KEY,
        JSON.stringify({ count, lockedUntil })
    );
}

function clearLoginAttempts() {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
}

function getLockoutRemainingMs() {
    const attempts = getLoginAttempts();
    const now = Date.now();

    if (attempts.lockedUntil > now) {
        return attempts.lockedUntil - now;
    }

    if (attempts.lockedUntil !== 0) {
        clearLoginAttempts();
    }

    return 0;
}

function formatDuration(ms) {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
}

function getAuthState() {
    const lockoutRemainingMs = getLockoutRemainingMs();
    const attempts = getLoginAttempts();

    return {
        isLocked: lockoutRemainingMs > 0,
        lockoutRemainingMs,
        lockoutRemainingText: formatDuration(lockoutRemainingMs),
        attemptsLeft: Math.max(MAX_LOGIN_ATTEMPTS - attempts.count, 0)
    };
}

// Check if user is authenticated
function isAuthenticated() {
    const sessionData = getSessionData();
    if (!sessionData) return false;

    const now = Date.now();

    // Check if session is expired
    if (now > sessionData.expires) {
        logout();
        return false;
    }

    return sessionData.authenticated === true;
}

// Login function
function login(username, password, rememberMe = false) {
    if (getLockoutRemainingMs() > 0) {
        return {
            success: false,
            reason: 'locked',
            ...getAuthState()
        };
    }

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        const now = Date.now();
        const sessionDurationMs = rememberMe
            ? 24 * 60 * 60 * 1000
            : 2 * 60 * 60 * 1000;
        const expires = now + sessionDurationMs;
        
        const sessionData = {
            authenticated: true,
            username: username,
            email: ADMIN_CREDENTIALS.email,
            loginTime: now,
            expires: expires
        };
        
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        clearLoginAttempts();

        return {
            success: true,
            expires,
            sessionDurationMs
        };
    }

    const attempts = getLoginAttempts();
    const nextCount = attempts.count + 1;

    if (nextCount >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        setLoginAttempts(nextCount, lockedUntil);
        return {
            success: false,
            reason: 'locked',
            ...getAuthState()
        };
    }

    setLoginAttempts(nextCount, 0);
    return {
        success: false,
        reason: 'invalid_credentials',
        ...getAuthState()
    };
}

// Logout function
function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
}

// Get current user info
function getCurrentUser() {
    const sessionData = getSessionData();
    if (!sessionData) {
        return null;
    }

    return {
        username: sessionData.username,
        email: sessionData.email,
        loginTime: new Date(sessionData.loginTime).toLocaleString()
    };
}

// Protect page - redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

// Auto-logout on session expiry
setInterval(() => {
    if (!isAuthenticated()) {
        const currentPage = window.location.pathname;
        if (!currentPage.includes('login.html')) {
            logout();
        }
    }
}, 60000); // Check every minute
