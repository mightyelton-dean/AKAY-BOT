const DEFAULT_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

async function generateReply({ incomingText, sender }) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return `Hi ${sender || 'there'} 👋 — I received: "${incomingText}". (AI key not set yet, so this is a fallback response.)`;
    }

    const systemPrompt = process.env.SYSTEM_PROMPT || 'You are a concise and helpful WhatsApp support assistant.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: DEFAULT_MODEL,
            temperature: 0.4,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Sender: ${sender || 'unknown'}\nMessage: ${incomingText}` }
            ]
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`AI request failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not generate a response right now.';
}

module.exports = {
    generateReply
};
