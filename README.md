# WhatsApp REST API (Baileys)

Multi-tenant WhatsApp REST API built with Baileys, Node.js, and PostgreSQL.

## ✨ Features

- **Multi-Device Support** - Manage multiple WhatsApp accounts per user
- **Messaging** - Send text, images, videos, documents, audio
- **AI Auto-Reply** - OpenAI-powered automatic responses
- **Warmer System** - Gradual warm-up for new numbers (can be disabled via .env)
- **File Management** - Upload, store, and reuse media files
- **Real-time Updates** - WebSocket for QR codes and messages
- **Webhooks** - HTTP callbacks for events

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp env.example .env
# Edit .env with your settings

# 3. Start the server
npm start
```

**API Base URL:** `http://localhost:3000/api/whatsapp`  
**WebSocket:** `ws://localhost:3001`

## 📚 Documentation

### 🎯 Integration Guides

| Guide | Description | Best For |
|-------|-------------|----------|
| [**SaaS Integration Guide**](./SAAS_INTEGRATION_GUIDE.md) | 🔥 Complete guide for integrating into your SaaS | CRM, E-commerce, Support platforms |
| [**Device Connection Guide**](./DEVICE_CONNECTION_GUIDE.md) | ⭐ Complete guide with code examples for connecting devices | Quick implementation |
| [**Warmer Configuration**](./WARMER_CONFIGURATION.md) | ⚙️ Enable/disable warmer system via environment variables | Production deployment |

### 📖 API Documentation

All detailed API documentation is in the [`documentation/`](./documentation/) folder:

| Guide | Description |
|-------|-------------|
| [Quick Start](./documentation/api/quick-start.md) | Get started in 5 minutes |
| [Device Management](./documentation/api/device-management.md) | Create and manage devices |
| [Message Sending](./documentation/api/message-sending.md) | Send messages and media |
| [File Management](./documentation/api/file-management.md) | Upload and manage files |
| [AI & Auto-Reply](./documentation/api/admin-configuration.md) | Configure AI settings |
| [Authentication](./documentation/api/authentication.md) | API authentication |
| [All Endpoints](./documentation/api/complete-endpoint-reference.md) | Complete API reference |
| [cURL Examples](./documentation/API_CURL_COMMANDS.md) | Ready-to-use cURL commands |

## ⚙️ Environment Variables

```bash
# Server
PORT=3000
WS_PORT=3001
API_TOKEN=your-secure-token

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/db

# AI (OpenAI)
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-3.5-turbo
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=500

# Warmer System (Optional)
WARMER_ENABLED=true                 # Enable/disable warmer (default: true)
WARMER_AUTO_START_CAMPAIGNS=true   # Auto-start campaigns (default: true)
```

See [`env.example`](./env.example) for all options and [Warmer Configuration Guide](./WARMER_CONFIGURATION.md) for details.

## 🔑 API Authentication

All requests require the `X-API-Token` header:

```bash
curl -X GET "http://localhost:3000/api/whatsapp/sessions" \
  -H "X-API-Token: your-token"
```

## 📱 Basic Usage

### Create Device
```bash
curl -X POST "http://localhost:3000/api/whatsapp/devices" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: your-token" \
  -d '{"userId": "user-123", "alias": "My Phone"}'
```

### Send Message
```bash
curl -X POST "http://localhost:3000/api/whatsapp/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: your-token" \
  -d '{
    "sessionId": "session_abc123",
    "recipient": "628123456789",
    "message": "Hello!"
  }'
```

## 📁 Project Structure

```
baileys/
├── src/
│   ├── app.js              # Main application
│   ├── config/             # Configuration
│   ├── controllers/        # Route handlers
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── middleware/         # Auth middleware
├── public/                 # Frontend dashboards
├── documentation/          # API documentation
├── uploads/               # File storage
└── utils/                 # Utility scripts
```

## 🛠️ NPM Scripts

```bash
npm start           # Start production server
npm run dev         # Start with nodemon
npm run seed:ai     # Seed AI providers
npm run db:init     # Initialize database
```

## 🔗 UI Dashboards

- **Main Dashboard:** `http://localhost:3000/`
- **AI Settings:** `http://localhost:3000/ai-settings.html`
- **File Manager:** `http://localhost:3000/file-management.html`

## 📄 License

MIT
