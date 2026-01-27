// Page Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Update page title
        const pageTitle = item.querySelector('span').textContent;
        document.querySelector('.page-title').textContent = pageTitle;
        
        // Show/hide pages
        const page = item.dataset.page;
        document.querySelectorAll('.content').forEach(content => {
            content.style.display = 'none';
        });
        
        if (page === 'settings') {
            document.getElementById('settings-page').style.display = 'block';
        } else {
            document.getElementById('overview-page').style.display = 'block';
        }
    });
});

// Initialize Charts
function initCharts() {
    // Message Volume Chart
    const messageCtx = document.getElementById('messageChart');
    if (messageCtx) {
        const ctx = messageCtx.getContext('2d');
        
        // Generate gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(10, 10, 10, 0.1)');
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0)');
        
        // Sample data
        const data = {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            values: [145, 189, 167, 203, 178, 156, 234]
        };
        
        drawLineChart(ctx, data, gradient);
    }
    
    // Response Distribution Chart
    const responseCtx = document.getElementById('responseChart');
    if (responseCtx) {
        const ctx = responseCtx.getContext('2d');
        
        const data = {
            labels: ['Resolved', 'In Progress', 'Pending'],
            values: [847, 142, 89],
            colors: ['#16a34a', '#ea580c', '#a3a3a3']
        };
        
        drawDoughnutChart(ctx, data);
    }
}

// Line Chart Drawing
function drawLineChart(ctx, data, gradient) {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate dimensions
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    const maxValue = Math.max(...data.values);
    const step = chartWidth / (data.labels.length - 1);
    
    // Draw grid lines
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Calculate points
    const points = data.values.map((value, index) => ({
        x: padding + (step * index),
        y: padding + chartHeight - (value / maxValue) * chartHeight
    }));
    
    // Draw area under line
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.lineTo(points[points.length - 1].x, height - padding);
    ctx.closePath();
    ctx.fill();
    
    // Draw line
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.stroke();
    
    // Draw points
    points.forEach(point => {
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
    
    // Draw labels
    ctx.fillStyle = '#737373';
    ctx.font = '12px IBM Plex Sans';
    ctx.textAlign = 'center';
    data.labels.forEach((label, index) => {
        ctx.fillText(label, padding + (step * index), height - padding + 20);
    });
}

// Doughnut Chart Drawing
function drawDoughnutChart(ctx, data) {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    const innerRadius = radius * 0.6;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate total
    const total = data.values.reduce((sum, val) => sum + val, 0);
    
    // Draw segments
    let currentAngle = -Math.PI / 2;
    data.values.forEach((value, index) => {
        const sliceAngle = (value / total) * Math.PI * 2;
        
        // Draw outer arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = data.colors[index];
        ctx.fill();
        
        currentAngle += sliceAngle;
    });
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // Draw total in center
    ctx.fillStyle = '#0a0a0a';
    ctx.font = 'bold 28px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, centerX, centerY - 10);
    
    ctx.font = '13px IBM Plex Sans';
    ctx.fillStyle = '#737373';
    ctx.fillText('Total', centerX, centerY + 15);
    
    // Draw legend
    let legendY = height - 80;
    data.labels.forEach((label, index) => {
        // Color box
        ctx.fillStyle = data.colors[index];
        ctx.fillRect(20, legendY, 12, 12);
        
        // Label
        ctx.fillStyle = '#0a0a0a';
        ctx.font = '13px IBM Plex Sans';
        ctx.textAlign = 'left';
        ctx.fillText(`${label}: ${data.values[index]}`, 40, legendY + 10);
        
        legendY += 20;
    });
}

// Chart Tab Controls
document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active from all tabs in the same group
        tab.parentElement.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // In a real app, you would load different data here
        console.log('Loading data for:', tab.textContent);
    });
});

// Toggle Switches
document.querySelectorAll('.toggle input').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
        const label = e.target.closest('.setting-item').querySelector('label').textContent;
        console.log(`${label} is now ${e.target.checked ? 'enabled' : 'disabled'}`);
    });
});

// Test AI Function
function testAI() {
    const input = document.getElementById('testInput');
    const responseDiv = document.getElementById('testResponse');
    const responseText = document.getElementById('testResponseText');
    
    if (input && input.value.trim()) {
        responseDiv.style.display = 'block';
        responseText.textContent = 'Processing your request...';
        
        // Simulate AI response
        setTimeout(() => {
            responseText.textContent = `This is a test response to: "${input.value}". In production, this would connect to your AI model.`;
        }, 1000);
    }
}

// Initialize on load
window.addEventListener('load', () => {
    initCharts();
    
    // Add resize handler to redraw charts
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            initCharts();
        }, 250);
    });
});

// Real-time updates simulation
function simulateRealTimeUpdates() {
    setInterval(() => {
        // Update random stat (just for demo)
        const statValues = document.querySelectorAll('.stat-value');
        if (statValues.length > 0) {
            const randomStat = statValues[Math.floor(Math.random() * statValues.length)];
            const currentValue = parseInt(randomStat.textContent.replace(/[^0-9]/g, ''));
            const change = Math.floor(Math.random() * 5) - 2;
            const newValue = Math.max(0, currentValue + change);
            
            // Animate value change
            animateValue(randomStat, currentValue, newValue, 500);
        }
    }, 10000); // Update every 10 seconds
}

function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            element.textContent = formatStatValue(end);
            clearInterval(timer);
        } else {
            element.textContent = formatStatValue(Math.floor(current));
        }
    }, 16);
}

function formatStatValue(value) {
    return value.toLocaleString();
}

// Start real-time updates
setTimeout(simulateRealTimeUpdates, 5000);
