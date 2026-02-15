// Page Navigation
document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
        e.preventDefault();

        // Update active nav
        document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
        item.classList.add('active');

        // Update title
        const pageTitle = item.querySelector('span').textContent;
        document.querySelector('.page-title').textContent = pageTitle;

        // Show page
        const page = item.dataset.page;
        document.querySelectorAll('.content').forEach((content) => {
            content.style.display = 'none';
        });
        document.getElementById(page + '-page').style.display = 'block';
    });
});

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json'
        },
        ...options
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
}

function updateConnectionUI(connected) {
    const status = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');

    status.classList.remove('disconnected', 'online');
    status.classList.add(connected ? 'online' : 'disconnected');
    statusText.textContent = connected ? 'Connected' : 'Disconnected';
}

async function refreshStatus() {
    try {
        const data = await apiRequest('/api/status');
        updateConnectionUI(Boolean(data.whatsappConnected));
    } catch (error) {
        updateConnectionUI(false);
    }
}

// Generate QR Code
async function generateQR() {
    const qrCode = document.getElementById('qrCode');
    qrCode.innerHTML = '<p style="color: var(--color-success);">✓ Pairing started. Finalize by scanning in WhatsApp.</p>';

    try {
        await apiRequest('/api/connect', {
            method: 'POST',
            body: JSON.stringify({ phone: '+2347056807197' })
        });
        await refreshStatus();
    } catch (error) {
        qrCode.innerHTML = '<p style="color: var(--color-danger);">Connection failed. Ensure backend server is running.</p>';
    }
}

// Initialize Charts
function initCharts() {
    const canvas = document.getElementById('messageChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.offsetWidth * 2);
    canvas.height = 400;

    const data = [145, 189, 167, 203, 178, 156, 234];
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Clear canvas
    ctx.clearRect(0, 0, width, 400);

    // Draw grid
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = 40 + (300 / 4) * i;
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width - 40, y);
        ctx.stroke();
    }

    // Draw line
    const maxValue = Math.max(...data);
    const step = (width - 80) / (data.length - 1);

    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 3;
    ctx.beginPath();

    data.forEach((value, index) => {
        const x = 40 + step * index;
        const y = 40 + 300 - (value / maxValue) * 300;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Draw points
    data.forEach((value, index) => {
        const x = 40 + step * index;
        const y = 40 + 300 - (value / maxValue) * 300;

        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
    });

    // Draw labels
    ctx.fillStyle = '#737373';
    ctx.font = '24px IBM Plex Sans';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
        ctx.fillText(label, 40 + step * index, 370);
    });
}

// Initialize on load
window.addEventListener('load', () => {
    initCharts();

    // Display current user info
    const user = getCurrentUser();
    if (user) {
        document.getElementById('userName').textContent = user.username;
        const initials = user.username.substring(0, 2).toUpperCase();
        document.getElementById('userAvatar').textContent = initials;
    }

    refreshStatus();
    setInterval(refreshStatus, 10000);
});

// Resize handler
window.addEventListener('resize', () => {
    initCharts();
});
