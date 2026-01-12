# API Documentation

Complete API documentation for the WhatsApp REST API.

## 📚 Documentation Index

### Getting Started

| Guide | Description |
|-------|-------------|
| [Quick Start](./api/quick-start.md) | Get started in 5 minutes |
| [Authentication](./api/authentication.md) | API tokens and security |

### Core API

| Module | Description |
|--------|-------------|
| [Device Management](./api/device-management.md) | Create, manage, and connect devices |
| [Message Sending](./api/message-sending.md) | Send text, images, videos, documents |
| [File Management](./api/file-management.md) | Upload and manage media files |
| [Contact & Chat](./api/contact-chat.md) | Contacts, chats, and groups |

### Advanced Features

| Module | Description |
|--------|-------------|
| [Admin & AI Configuration](./api/admin-configuration.md) | AI settings, providers |
| [Business Templates](./api/business-templates.md) | Pre-built message templates |
| [Analytics & Monitoring](./api/analytics-monitoring.md) | Stats and logging |

### Reference

| Document | Description |
|----------|-------------|
| [Complete Endpoint Reference](./api/complete-endpoint-reference.md) | All API endpoints |
| [Integration Examples](./api/integration-examples.md) | Code examples |
| [cURL Commands](./API_CURL_COMMANDS.md) | Ready-to-use cURL examples |

---

## 🔧 Base URLs

| Service | URL |
|---------|-----|
| **REST API** | `http://localhost:3000/api/whatsapp` |
| **WebSocket** | `ws://localhost:3001` |
| **Admin API** | `http://localhost:3000/api/admin` |

## 🔑 Authentication

All requests require the `X-API-Token` header:

```bash
curl -H "X-API-Token: your-token" http://localhost:3000/api/whatsapp/sessions
```

## 📝 Quick Example

```bash
# Create device
curl -X POST "http://localhost:3000/api/whatsapp/devices" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: test123" \
  -d '{"userId": "user-123", "alias": "My Phone"}'

# Send message
curl -X POST "http://localhost:3000/api/whatsapp/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: test123" \
  -d '{"sessionId": "session_abc", "recipient": "628123456789", "message": "Hello!"}'
```

## 📂 File Organization

```
documentation/
├── README.md                    # This file
├── API_CURL_COMMANDS.md         # cURL command reference
└── api/
    ├── quick-start.md           # Getting started
    ├── authentication.md        # Auth guide
    ├── device-management.md     # Devices API
    ├── message-sending.md       # Messaging API
    ├── file-management.md       # Files API
    ├── contact-chat.md          # Contacts API
    ├── admin-configuration.md   # Admin/AI API
    ├── business-templates.md    # Templates API
    ├── analytics-monitoring.md  # Analytics API
    ├── integration-examples.md  # Code examples
    └── complete-endpoint-reference.md  # All endpoints
```
