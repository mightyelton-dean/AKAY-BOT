// Page Navigation
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageName + '-page').classList.add('active');
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    // Update page title
    const titles = {
        'overview': 'Dashboard Overview',
        'conversations': 'Conversations',
        'analytics': 'Analytics',
        'settings': 'Settings',
        'users': 'User Management',
        'ai-config': 'AI Configuration'
    };
    document.getElementById('pageTitle').textContent = titles[pageName];
}

// Toggle Sidebar (Mobile)
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Populate Recent Activity
function populateActivity() {
    const activities = [
        { name: 'John Doe', message: 'What are your business hours?', time: '2 minutes ago', avatar: 'JD' },
        { name: 'Sarah Smith', message: 'I need help with my order', time: '5 minutes ago', avatar: 'SS' },
        { name: 'Mike Johnson', message: 'Can I get a refund?', time: '12 minutes ago', avatar: 'MJ' },
        { name: 'Emma Wilson', message: 'Thank you for the quick response!', time: '18 minutes ago', avatar: 'EW' },
        { name: 'David Lee', message: 'Is this product available?', time: '25 minutes ago', avatar: 'DL' }
    ];

    const activityList = document.getElementById('activityList');
    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-avatar">${activity.avatar}</div>
            <div class="activity-content">
                <div class="activity-name">${activity.name}</div>
                <div class="activity-message">${activity.message}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `;
        activityList.appendChild(item);
    });
}

// Populate Conversations
function populateConversations() {
    const conversations = [
        { name: 'Akay Ibrahim', phone: '+234 915 529 8855', preview: 'Thank you for the information!', time: '10:23 AM', count: 2, avatar: 'AI' },
        { name: 'John Doe', phone: '+1 234 567 8900', preview: 'What are your business hours?', time: '10:15 AM', count: 1, avatar: 'JD' },
        { name: 'Sarah Smith', phone: '+44 20 7946 0958', preview: 'I need help with my order #1234', time: '09:47 AM', count: 3, avatar: 'SS' },
        { name: 'Mike Johnson', phone: '+1 555 123 4567', preview: 'Can I get a refund for my purchase?', time: '09:32 AM', count: 0, avatar: 'MJ' },
        { name: 'Emma Wilson', phone: '+61 2 9374 4000', preview: 'The bot is really helpful, thanks!', time: '08:15 AM', count: 0, avatar: 'EW' },
        { name: 'David Lee', phone: '+82 2 3771 0000', preview: 'Is the product still in stock?', time: 'Yesterday', count: 1, avatar: 'DL' },
        { name: 'Lisa Chen', phone: '+86 10 8532 1234', preview: 'How long does shipping take?', time: 'Yesterday', count: 0, avatar: 'LC' },
        { name: 'Tom Brown', phone: '+49 30 2639 0', preview: 'I love this service!', time: 'Yesterday', count: 0, avatar: 'TB' }
    ];

    const conversationsGrid = document.getElementById('conversationsGrid');
    conversations.forEach(conv => {
        const card = document.createElement('div');
        card.className = 'conversation-card';
        card.innerHTML = `
            <div class="conversation-avatar">${conv.avatar}</div>
            <div class="conversation-details">
                <div class="conversation-name">${conv.name}</div>
                <div class="conversation-preview">${conv.preview}</div>
            </div>
            <div class="conversation-meta">
                <div class="conversation-time">${conv.time}</div>
                ${conv.count > 0 ? `<span class="message-count">${conv.count}</span>` : ''}
            </div>
        `;
        conversationsGrid.appendChild(card);
    });
}

// Filter Conversations
function filterConversations() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.conversation-card');
    
    cards.forEach(card => {
        const name = card.querySelector('.conversation-name').textContent.toLowerCase();
        const preview = card.querySelector('.conversation-preview').textContent.toLowerCase();
        
        if (name.includes(searchTerm) || preview.includes(searchTerm)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Populate Users Table
function populateUsers() {
    const users = [
        { name: 'Akay Ibrahim', phone: '+234 915 529 8855', messages: 45, lastActive: '5 mins ago', status: 'Active', avatar: 'AI' },
        { name: 'John Doe', phone: '+1 234 567 8900', messages: 32, lastActive: '12 mins ago', status: 'Active', avatar: 'JD' },
        { name: 'Sarah Smith', phone: '+44 20 7946 0958', messages: 28, lastActive: '1 hour ago', status: 'Active', avatar: 'SS' },
        { name: 'Mike Johnson', phone: '+1 555 123 4567', messages: 21, lastActive: '3 hours ago', status: 'Inactive', avatar: 'MJ' },
        { name: 'Emma Wilson', phone: '+61 2 9374 4000', messages: 19, lastActive: '5 hours ago', status: 'Inactive', avatar: 'EW' },
        { name: 'David Lee', phone: '+82 2 3771 0000', messages: 15, lastActive: 'Yesterday', status: 'Inactive', avatar: 'DL' }
    ];

    const tbody = document.getElementById('usersTableBody');
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="user-cell">
                    <div class="table-avatar">${user.avatar}</div>
                    <span>${user.name}</span>
                </div>
            </td>
            <td>${user.phone}</td>
            <td>${user.messages}</td>
            <td>${user.lastActive}</td>
            <td>
                <span class="status-dot-table ${user.status === 'Active' ? 'active' : 'inactive'}"></span>
                ${user.status}
            </td>
            <td>
                <button class="action-btn">View</button>
                <button class="action-btn">Edit</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Test AI Response
function testAI() {
    const input = document.getElementById('testInput').value;
    const responseDiv = document.getElementById('testResponse');
    const responseText = document.getElementById('testResponseText');
    
    if (!input) {
        alert('Please enter a test message');
        return;
    }
    
    // Simulate AI response
    responseDiv.style.display = 'block';
    responseText.textContent = 'Generating response...';
    
    setTimeout(() => {
        const responses = [
            "Hello! I'm here to help you. How can I assist you today? 😊",
            "That's a great question! Let me provide you with detailed information about that...",
            "I'd be happy to help! Based on your question, here's what I can tell you...",
            "Thank you for reaching out! I can definitely assist with that. Here's what you need to know...",
            "Great to hear from you! Let me help you with that right away. 🚀"
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        responseText.textContent = randomResponse;
    }, 1500);
}

// Animate Counters
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

// Create Activity Chart
function createActivityChart() {
    const canvas = document.getElementById('activityChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Simple bar chart
    const data = [45, 62, 38, 71, 56, 83, 67];
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const barWidth = canvas.width / (data.length * 2);
    const maxValue = Math.max(...data);
    
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * (canvas.height - 40);
        const x = (index * 2 + 1) * barWidth;
        const y = canvas.height - barHeight - 20;
        
        // Gradient
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
        gradient.addColorStop(0, '#25d366');
        gradient.addColorStop(1, '#128c7e');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth * 0.8, barHeight);
        
        // Label
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], x + barWidth * 0.4, canvas.height - 5);
    });
}

// Create Engagement Chart
function createEngagementChart() {
    const canvas = document.getElementById('engagementChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 30;
    
    const data = [
        { label: 'Active', value: 65, color: '#25d366' },
        { label: 'Returning', value: 20, color: '#128c7e' },
        { label: 'New', value: 15, color: '#075e54' }
    ];
    
    let startAngle = -0.5 * Math.PI;
    
    data.forEach(item => {
        const sliceAngle = (item.value / 100) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = item.color;
        ctx.fill();
        
        startAngle += sliceAngle;
    });
    
    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // Center text
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 24px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('94%', centerX, centerY - 10);
    ctx.font = '12px Inter';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Engaged', centerX, centerY + 15);
}

// Create Distribution Chart
function createDistributionChart() {
    const canvas = document.getElementById('distributionChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    
    const data = [
        { label: 'Instant (<1s)', value: 45, color: '#10b981' },
        { label: 'Fast (1-3s)', value: 35, color: '#25d366' },
        { label: 'Normal (3-5s)', value: 15, color: '#f59e0b' },
        { label: 'Slow (>5s)', value: 5, color: '#ef4444' }
    ];
    
    let startAngle = -0.5 * Math.PI;
    
    data.forEach(item => {
        const sliceAngle = (item.value / 100) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = item.color;
        ctx.fill();
        
        startAngle += sliceAngle;
    });
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    populateActivity();
    populateConversations();
    populateUsers();
    
    // Animate counters
    setTimeout(() => {
        const totalMessages = document.getElementById('totalMessages');
        const activeUsers = document.getElementById('activeUsers');
        if (totalMessages) animateCounter(totalMessages, 1247);
        if (activeUsers) animateCounter(activeUsers, 89);
    }, 500);
    
    // Create charts
    setTimeout(() => {
        createActivityChart();
        createEngagementChart();
        createDistributionChart();
    }, 1000);
});

// Update time every minute
setInterval(() => {
    const now = new Date();
    const timeElements = document.querySelectorAll('.activity-time');
    // In a real app, you'd update these based on actual timestamps
}, 60000);
