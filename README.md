# AKAY Bot - Professional WhatsApp Automation Platform

A complete WhatsApp automation dashboard with AI-powered responses, authentication, and admin management.

## 🔐 Authentication System

The platform includes a secure login system with session management:

### Default Credentials
- **Username:** `admin`
- **Password:** `akaybot2026`

⚠️ **IMPORTANT:** Change these credentials in `auth.js` before deploying to production!

### Security Features
- Session-based authentication
- Configurable session duration (2 hours default, 24 hours with “Remember me”)
- Login attempt throttling (5 failed attempts triggers a 15-minute lockout)
- Protected routes (redirects to login if not authenticated)
- Secure logout functionality
- LocalStorage session management

## 🚀 Features

### 1. **WhatsApp Connection**
- QR code scanning interface
- Real-time connection status
- Phone number verification
- Step-by-step setup guide

### 2. **Dashboard Overview**
- Real-time metrics (messages, users, response time)
- Message volume charts
- Success rate tracking
- Visual analytics

### 3. **Conversation Management**
- View all conversations
- Real-time message updates
- Search functionality
- Message history

### 4. **Contact Management**
- Add contacts manually
- Import from CSV
- Search and filter contacts
- Contact status tracking

### 5. **Broadcast Messages**
- Send bulk messages to multiple contacts
- Recipient group selection
- Message preview
- Schedule broadcasts

### 6. **Automation Rules**
- Welcome messages for new contacts
- Business hours auto-replies
- FAQ handlers
- Custom trigger-based responses
- Enable/disable individual rules

### 7. **Message Templates**
- Create reusable message templates
- Variable placeholders
- Usage statistics
- Quick edit access

### 8. **Settings & Configuration**
- AI model selection (Claude Sonnet 4, Opus 4, GPT-4)
- Custom system prompts
- API key management
- Webhook integration
- Session timeout settings
- Security controls

## 📁 File Structure

```
akay-bot/
├── index.html          # Main dashboard (protected)
├── login.html          # Login page
├── style.css           # All styling
├── script.js           # Dashboard functionality
├── auth.js             # Authentication system
├── vercel.json         # Deployment config
└── README.md           # This file
```


## ⚙️ Backend API (MVP - newly added)

A lightweight Node.js HTTP backend is now included to begin real WhatsApp AI agent implementation:

- `GET /api/health` - health check
- `GET /api/status` - connection + message counters
- `POST /api/connect` - set WhatsApp connected state (MVP placeholder)
- `POST /api/disconnect` - set disconnected state
- `GET /api/messages` - fetch recent inbound/outbound messages
- `POST /api/messages/incoming` - simulate inbound WhatsApp message and generate AI reply
- `POST /webhooks/twilio/whatsapp` - Twilio inbound webhook endpoint for real WhatsApp messages

### Run backend

```bash
# No dependency install required for this HTTP-server version
node server.js
```

Server runs on `http://localhost:3000`.

### Environment variables

Create `.env` (optional for fallback mode):

```bash
OPENAI_API_KEY=your_openai_key
AI_MODEL=gpt-4o-mini
SYSTEM_PROMPT=You are a concise and helpful WhatsApp support assistant.
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
PORT=3000
```

If `OPENAI_API_KEY` is missing, the app returns a safe fallback response so you can keep building UI and flow.

If Twilio variables are set, outbound replies are sent via Twilio WhatsApp API; otherwise, delivery runs in simulator mode.

## 🔧 Setup Instructions

### 1. Change Default Credentials

Edit `auth.js` and update:

```javascript
const ADMIN_CREDENTIALS = {
    username: 'your_username',
    password: 'your_secure_password',
    email: 'your_email@example.com'
};
```

### 2. Local Development

Simply open `login.html` in your browser, or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve
```

Then navigate to `http://localhost:8000/login.html`

### 3. Deploy to Vercel

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy
vercel

# Or connect your GitHub repo to Vercel for auto-deploy
```

### 4. Deploy to GitHub Pages

```bash
git add .
git commit -m "Initial commit with authentication"
git push origin main

# Enable GitHub Pages in repository settings
```

## 🔒 Security Best Practices

### For Production:

1. **Change Default Credentials** - Never use the default username/password
2. **Use HTTPS** - Always deploy with SSL/TLS
3. **Backend Authentication** - Move authentication to a secure backend server
4. **Environment Variables** - Store API keys in environment variables
5. **Rate Limiting** - Implement login attempt limits
6. **2FA** - Add two-factor authentication
7. **Password Hashing** - Use bcrypt or similar for password storage

### Current Implementation

The current authentication system uses localStorage for simplicity. For production:
- Move to server-side authentication (Node.js/Express, Python/Flask, etc.)
- Use JWT tokens or session cookies
- Implement proper password hashing
- Add rate limiting on login attempts

## 🎨 Customization

### Change Colors

Edit CSS variables in `style.css`:

```css
:root {
    --color-accent: #0a0a0a;      /* Primary color */
    --color-success: #16a34a;     /* Success color */
    --color-danger: #dc2626;      /* Danger color */
    /* ... */
}
```

### Change AI Model

In Settings page, select from:
- Claude Sonnet 4 (Recommended)
- Claude Opus 4
- GPT-4
- GPT-3.5 Turbo

### Add Features

The codebase is modular. Add new pages by:
1. Creating a new section in `index.html`
2. Adding navigation item in sidebar
3. Implementing functionality in `script.js`

## 🐛 Troubleshooting

### "Invalid username or password"
- Check that you're using the correct credentials from `auth.js`
- Clear browser localStorage: `localStorage.clear()`

### Session Expires Too Quickly
- Edit session duration in `auth.js`:
```javascript
const expires = now + (24 * 60 * 60 * 1000); // 24 hours
```

### Redirects to Login Immediately
- Check browser console for errors
- Ensure `auth.js` is loaded before `script.js`
- Clear browser cache and localStorage

## 📱 Mobile Support

The dashboard is fully responsive and works on:
- Desktop browsers
- Tablets
- Mobile phones (iOS/Android)

## 🔄 Updates & Changelog

### v2.0 (Current)
- ✅ Authentication system
- ✅ Login/Logout functionality
- ✅ Session management
- ✅ Protected routes
- ✅ User info display

### v1.0
- Dashboard overview
- WhatsApp connection
- Contact management
- Broadcast messaging
- Automation rules
- Templates
- Settings

## 📞 Support

For issues or questions:
- Check the troubleshooting section above
- Review the code comments
- Test with default credentials first

## 📄 License

© 2026 EltonDeanTech. All rights reserved.

---

**Made with ❤️ for professional WhatsApp automation**
