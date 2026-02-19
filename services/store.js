const state = {
    whatsappConnected: false,
    connectedAt: null,
    phone: null,
    conversations: [],
    messages: []
};

function setConnectionStatus(connected, phone = null) {
    state.whatsappConnected = connected;
    state.connectedAt = connected ? new Date().toISOString() : null;
    state.phone = connected ? phone : null;
}

function addMessage({ from, to = null, text, direction = 'inbound', source = 'simulator' }) {
    const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        from,
        to,
        text,
        direction,
        source,
        timestamp: new Date().toISOString()
    };

    state.messages.unshift(message);
    if (state.messages.length > 200) {
        state.messages.length = 200;
    }

    return message;
}

function getMessages(limit = 50) {
    return state.messages.slice(0, limit);
}

function getStatus() {
    return {
        whatsappConnected: state.whatsappConnected,
        connectedAt: state.connectedAt,
        phone: state.phone,
        totalMessages: state.messages.length,
        recentInbound: state.messages.filter((m) => m.direction === 'inbound').length,
        recentOutbound: state.messages.filter((m) => m.direction === 'outbound').length
    };
}

module.exports = {
    setConnectionStatus,
    addMessage,
    getMessages,
    getStatus
};
