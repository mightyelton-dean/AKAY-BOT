// Authentication System for AKAY Bot Dashboard

// Default admin credentials (in production, this would be server-side)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'akaybot2026', // Change this!
    email: 'admin@akaybot.com'
};

// Check if user is authenticated
function isAuthenticated() {
    const session = localStorage.getItem('akay_session');
    if (!session) return false;
    
    try {
        const sessionData = JSON.parse(session);
        const now = new Date().getTime();
        
        // Check if session is expired (24 hours)
        if (now > sessionData.expires) {
            logout();
            return false;
        }
        
        return sessionData.authenticated === true;
    } catch (e) {
        return false;
    }
}

// Login function
function login(username, password) {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        const now = new Date().getTime();
        const expires = now + (24 * 60 * 60 * 1000); // 24 hours
        
        const sessionData = {
            authenticated: true,
            username: username,
            email: ADMIN_CREDENTIALS.email,
            loginTime: now,
            expires: expires
        };
        
        localStorage.setItem('akay_session', JSON.stringify(sessionData));
        return true;
    }
    return false;
}

// Logout function
function logout() {
    localStorage.removeItem('akay_session');
    window.location.href = 'login.html';
}

// Get current user info
function getCurrentUser() {
    const session = localStorage.getItem('akay_session');
    if (!session) return null;
    
    try {
        const sessionData = JSON.parse(session);
        return {
            username: sessionData.username,
            email: sessionData.email,
            loginTime: new Date(sessionData.loginTime).toLocaleString()
        };
    } catch (e) {
        return null;
    }
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
