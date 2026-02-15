const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';

function hasTwilioConfig() {
    return Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_WHATSAPP_FROM
    );
}

async function sendWhatsAppMessage({ to, body }) {
    if (!hasTwilioConfig()) {
        return {
            delivered: false,
            provider: 'twilio',
            skipped: true,
            reason: 'Twilio credentials not configured'
        };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    const payload = new URLSearchParams({
        To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
        From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
        Body: body
    });

    const response = await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Twilio send failed (${response.status}): ${data?.message || 'unknown error'}`);
    }

    return {
        delivered: true,
        provider: 'twilio',
        sid: data.sid,
        status: data.status
    };
}

module.exports = {
    hasTwilioConfig,
    sendWhatsAppMessage
};
