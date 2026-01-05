# Complete Endpoint Reference

Comprehensive reference of all WhatsApp API endpoints organized by functionality.

## 🔗 Base URLs

- **Main API**: `http://localhost:3000/api/whatsapp`
- **Warmer API**: `http://localhost:3000/api/warmer`
- **Business Templates**: `http://localhost:3000/api/business-templates`
- **File Storage**: `http://localhost:3000/api/whatsapp/files`
- **Admin API**: `http://localhost:3000/api/whatsapp/admin`

## 🔑 Authentication Methods

1. **API Token**: `X-API-TOKEN: your_token` (Most endpoints)
2. **Device API Key**: `X-Device-API-Key: device_key` (Device-specific messaging)
3. **Admin Token**: `X-Admin-Token: admin_token` (Admin endpoints only)

---

## 📱 Device Management Endpoints

### Device CRUD Operations

| Method   | Endpoint                 | Description                         | Auth      |
| -------- | ------------------------ | ----------------------------------- | --------- |
| `POST`   | `/devices`               | Create new device and start session | API Token |
| `GET`    | `/users/:userId/devices` | List user's devices                 | API Token |
| `GET`    | `/devices/:deviceId`     | Get device details with status      | API Token |
| `PUT`    | `/devices/:deviceId`     | Update device metadata              | API Token |
| `DELETE` | `/devices/:deviceId`     | Delete device and cleanup session   | API Token |

### Device Session Management

| Method | Endpoint                    | Description                                | Auth      |
| ------ | --------------------------- | ------------------------------------------ | --------- |
| `POST` | `/devices/:deviceId/logout` | Logout device (clear session, keep device) | API Token |
| `POST` | `/devices/:deviceId/login`  | Login/relogin device                       | API Token |
| `GET`  | `/devices/:deviceId/qr`     | Get QR code for pairing                    | API Token |

### Device Settings

| Method | Endpoint                              | Description             | Auth      |
| ------ | ------------------------------------- | ----------------------- | --------- |
| `GET`  | `/devices/:deviceId/settings/ai`      | Get AI settings         | API Token |
| `PUT`  | `/devices/:deviceId/settings/ai`      | Update AI settings      | API Token |
| `GET`  | `/devices/:deviceId/settings/webhook` | Get webhook settings    | API Token |
| `PUT`  | `/devices/:deviceId/settings/webhook` | Update webhook settings | API Token |

---

## 💬 Message Sending Endpoints

### Basic Messaging

| Method | Endpoint         | Description           | Auth      |
| ------ | ---------------- | --------------------- | --------- |
| `POST` | `/send`          | Send text message     | API Token |
| `POST` | `/send/image`    | Send image message    | API Token |
| `POST` | `/send/video`    | Send video message    | API Token |
| `POST` | `/send/document` | Send document message | API Token |

### Device-Specific Messaging

| Method | Endpoint       | Description                     | Auth           |
| ------ | -------------- | ------------------------------- | -------------- |
| `POST` | `/device/send` | Send message via device API key | Device API Key |

### Bulk & Batch Operations

| Method | Endpoint      | Description      | Auth      |
| ------ | ------------- | ---------------- | --------- |
| `POST` | `/send/bulk`  | Send bulk files  | API Token |
| `POST` | `/send/mixed` | Send mixed media | API Token |
| `POST` | `/send/batch` | Send batch files | API Token |

### Message Management

| Method | Endpoint                                 | Description                           | Auth      |
| ------ | ---------------------------------------- | ------------------------------------- | --------- |
| `GET`  | `/messages`                              | Get all messages                      | API Token |
| `GET`  | `/devices/:deviceId/messages/:remoteJid` | Get device messages for specific chat | API Token |
| `GET`  | `/users/:userId/messages`                | Get user messages                     | API Token |
| `POST` | `/messages/:messageId/resend`            | Resend message                        | API Token |
| `GET`  | `/messages/:messageId/status`            | Get message status                    | API Token |

### Message Logging & Analytics

| Method | Endpoint                       | Description                 | Auth      |
| ------ | ------------------------------ | --------------------------- | --------- |
| `GET`  | `/users/:userId/message-logs`  | Get user message logs       | API Token |
| `GET`  | `/users/:userId/sending-stats` | Get user sending statistics | API Token |

---

## 📁 File Management Endpoints

### File Upload & Storage

| Method | Endpoint        | Description                          | Auth      |
| ------ | --------------- | ------------------------------------ | --------- |
| `POST` | `/files/upload` | Upload and store file for reuse      | API Token |
| `GET`  | `/files`        | List stored files with filtering     | API Token |
| `GET`  | `/files/search` | Search files by name and description | API Token |

### File Operations

| Method   | Endpoint                 | Description                                   | Auth      |
| -------- | ------------------------ | --------------------------------------------- | --------- |
| `GET`    | `/files/:fileId`         | Get single file info                          | API Token |
| `GET`    | `/files/:fileId/preview` | Get file preview (public for browser loading) | None      |
| `PUT`    | `/files/:fileId`         | Update file metadata                          | API Token |
| `DELETE` | `/files/:fileId`         | Delete stored file                            | API Token |

### User File Management

| Method   | Endpoint                         | Description                | Auth      |
| -------- | -------------------------------- | -------------------------- | --------- |
| `GET`    | `/files/users/:userId/stats`     | Get user file statistics   | API Token |
| `GET`    | `/files/users/:userId/:fileType` | Get files by user and type | API Token |
| `DELETE` | `/files/bulk`                    | Bulk delete files          | API Token |

### File Maintenance

| Method | Endpoint                 | Description                        | Auth      |
| ------ | ------------------------ | ---------------------------------- | --------- |
| `POST` | `/files/cleanup/expired` | Cleanup expired files (admin/cron) | API Token |

---

## 👥 Contact & Chat Management Endpoints

### Contact Management

| Method | Endpoint                      | Description                           | Auth      |
| ------ | ----------------------------- | ------------------------------------- | --------- |
| `GET`  | `/devices/:deviceId/contacts` | Get device contacts (database stored) | API Token |
| `GET`  | `/devices/:deviceId/chats`    | Get device chats                      | API Token |
| `GET`  | `/devices/:deviceId/groups`   | Get device groups                     | API Token |
| `GET`  | `/users/:userId/contacts`     | Get user contacts                     | API Token |

### WhatsApp Data Sync

| Method | Endpoint                                    | Description                       | Auth      |
| ------ | ------------------------------------------- | --------------------------------- | --------- |
| `POST` | `/devices/:deviceId/sync`                   | Sync WhatsApp data                | API Token |
| `GET`  | `/devices/:deviceId/contacts/baileys-store` | Fetch contacts from Baileys store | API Token |
| `GET`  | `/devices/:deviceId/chats/baileys-store`    | Fetch chats from Baileys store    | API Token |

### Group Management

| Method | Endpoint                                     | Description         | Auth      |
| ------ | -------------------------------------------- | ------------------- | --------- |
| `GET`  | `/devices/:deviceId/groups/:groupId/members` | Fetch group members | API Token |

### Profile & Status

| Method | Endpoint                           | Description            | Auth      |
| ------ | ---------------------------------- | ---------------------- | --------- |
| `GET`  | `/devices/:deviceId/profile/:jid`  | Fetch profile picture  | API Token |
| `GET`  | `/devices/:deviceId/presence/:jid` | Fetch presence status  | API Token |
| `GET`  | `/devices/:deviceId/business/:jid` | Fetch business profile | API Token |

---

## ⚙️ Chat Settings Endpoints

### Chat Configuration

| Method | Endpoint                                        | Description                   | Auth      |
| ------ | ----------------------------------------------- | ----------------------------- | --------- |
| `GET`  | `/devices/:deviceId/chat-settings`              | Get all chats with settings   | API Token |
| `GET`  | `/devices/:deviceId/chat-settings/summary`      | Get chat settings summary     | API Token |
| `GET`  | `/devices/:deviceId/chat-settings/:phoneNumber` | Get specific chat settings    | API Token |
| `PUT`  | `/devices/:deviceId/chat-settings/:phoneNumber` | Update specific chat settings | API Token |

### Bulk Chat Operations

| Method  | Endpoint                                       | Description                     | Auth      |
| ------- | ---------------------------------------------- | ------------------------------- | --------- |
| `POST`  | `/devices/:deviceId/chat-settings/bulk-update` | Bulk update multiple chats      | API Token |
| `PATCH` | `/bulk`                                        | Bulk update chats (alternative) | API Token |

### Memory Management

| Method   | Endpoint                    | Description            | Auth      |
| -------- | --------------------------- | ---------------------- | --------- |
| `PATCH`  | `/:deviceId/:chatId/memory` | Update memory settings | API Token |
| `DELETE` | `/:deviceId/:chatId/memory` | Clear memory           | API Token |

### Chat Analytics

| Method | Endpoint                                                     | Description              | Auth      |
| ------ | ------------------------------------------------------------ | ------------------------ | --------- |
| `GET`  | `/devices/:deviceId/chat-settings/:phoneNumber/conversation` | Get conversation history | API Token |
| `GET`  | `/devices/:deviceId/chat-settings/:phoneNumber/stats`        | Get chat statistics      | API Token |

---

## 🔥 Warmer System Endpoints

### Campaign Management

| Method   | Endpoint                 | Description           | Auth |
| -------- | ------------------------ | --------------------- | ---- |
| `POST`   | `/campaigns`             | Create campaign       | None |
| `GET`    | `/campaigns`             | Get campaigns         | None |
| `GET`    | `/campaigns/:campaignId` | Get specific campaign | None |
| `PUT`    | `/campaigns/:campaignId` | Update campaign       | None |
| `DELETE` | `/campaigns/:campaignId` | Delete campaign       | None |

### Campaign Control

| Method | Endpoint                        | Description     | Auth |
| ------ | ------------------------------- | --------------- | ---- |
| `POST` | `/campaigns/:campaignId/pause`  | Pause campaign  | None |
| `POST` | `/campaigns/:campaignId/resume` | Resume campaign | None |
| `POST` | `/campaigns/:campaignId/stop`   | Stop campaign   | None |

### Conversation Templates

| Method   | Endpoint                                       | Description           | Auth |
| -------- | ---------------------------------------------- | --------------------- | ---- |
| `POST`   | `/campaigns/:campaignId/templates`             | Create template       | None |
| `GET`    | `/campaigns/:campaignId/templates`             | Get templates         | None |
| `GET`    | `/campaigns/:campaignId/templates/:templateId` | Get specific template | None |
| `PUT`    | `/campaigns/:campaignId/templates/:templateId` | Update template       | None |
| `DELETE` | `/campaigns/:campaignId/templates/:templateId` | Delete template       | None |

### Warmer Analytics

| Method | Endpoint                       | Description             | Auth |
| ------ | ------------------------------ | ----------------------- | ---- |
| `GET`  | `/campaigns/:campaignId/stats` | Get campaign statistics | None |
| `GET`  | `/campaigns/:campaignId/logs`  | Get conversation logs   | None |

### Warmer Utilities

| Method | Endpoint              | Description           | Auth |
| ------ | --------------------- | --------------------- | ---- |
| `GET`  | `/devices`            | Get available devices | None |
| `GET`  | `/templates/defaults` | Get default templates | None |

---

## 📋 Business Templates Endpoints

### Template Management

| Method | Endpoint                    | Description                | Auth      |
| ------ | --------------------------- | -------------------------- | --------- |
| `GET`  | `/`                         | Get all business templates | API Token |
| `GET`  | `/types`                    | Get business types list    | API Token |
| `GET`  | `/:businessType/:language?` | Get specific template      | API Token |

### Template Administration

| Method   | Endpoint                    | Description               | Auth      |
| -------- | --------------------------- | ------------------------- | --------- |
| `PUT`    | `/:businessType/:language?` | Create or update template | API Token |
| `DELETE` | `/:businessType/:language?` | Delete template           | API Token |

---

## 🔧 Admin Endpoints

### AI Provider Management

| Method   | Endpoint                          | Description        | Auth        |
| -------- | --------------------------------- | ------------------ | ----------- |
| `GET`    | `/admin/ai/providers`             | Get AI providers   | Admin Token |
| `POST`   | `/admin/ai/providers`             | Create AI provider | Admin Token |
| `PUT`    | `/admin/ai/providers/:providerId` | Update AI provider | Admin Token |
| `DELETE` | `/admin/ai/providers/:providerId` | Delete AI provider | Admin Token |

### AI Model Management

| Method   | Endpoint                    | Description     | Auth        |
| -------- | --------------------------- | --------------- | ----------- |
| `GET`    | `/admin/ai/models`          | Get AI models   | Admin Token |
| `POST`   | `/admin/ai/models`          | Create AI model | Admin Token |
| `PUT`    | `/admin/ai/models/:modelId` | Update AI model | Admin Token |
| `DELETE` | `/admin/ai/models/:modelId` | Delete AI model | Admin Token |

### AI Usage & Monitoring

| Method | Endpoint                | Description        | Auth        |
| ------ | ----------------------- | ------------------ | ----------- |
| `GET`  | `/admin/ai/usage-logs`  | Get AI usage logs  | Admin Token |
| `GET`  | `/admin/ai/cost-alerts` | Get AI cost alerts | Admin Token |

---

## 🛠 System & Utility Endpoints

### AI & Testing

| Method | Endpoint        | Description                  | Auth      |
| ------ | --------------- | ---------------------------- | --------- |
| `POST` | `/test-ai`      | Test AI functionality        | API Token |
| `GET`  | `/ai/providers` | Get AI providers (read-only) | API Token |

### Session Management

| Method | Endpoint                      | Description         | Auth      |
| ------ | ----------------------------- | ------------------- | --------- |
| `GET`  | `/sessions`                   | Get active sessions | API Token |
| `POST` | `/sessions/:sessionId/cancel` | Cancel session      | API Token |

### Server Monitoring

| Method | Endpoint        | Description           | Auth      |
| ------ | --------------- | --------------------- | --------- |
| `GET`  | `/server/stats` | Get server statistics | API Token |

---

## 📊 Quick Reference by Use Case

### Setting Up a New WhatsApp Integration

1. `POST /devices` - Create device
2. `GET /devices/:deviceId/qr` - Get QR code
3. `GET /devices/:deviceId` - Check connection status
4. `POST /send` - Send first message

### File-Based Messaging Workflow

1. `POST /files/upload` - Upload file
2. `GET /files/users/:userId/image` - List available images
3. `POST /send/image` - Send image with file ID

### Bulk Messaging Campaign

1. `GET /users/:userId/devices` - Get available devices
2. `POST /files/upload` - Upload campaign media
3. `POST /send/batch` - Send batch messages
4. `GET /users/:userId/sending-stats` - Monitor progress

### AI Chat Setup

1. `GET /ai/providers` - Check available AI providers
2. `PUT /devices/:deviceId/settings/ai` - Enable AI
3. `PUT /devices/:deviceId/chat-settings/:phoneNumber` - Configure auto-reply

### Warmer Campaign Setup

1. `POST /warmer/campaigns` - Create campaign
2. `POST /warmer/campaigns/:campaignId/templates` - Add templates
3. `GET /warmer/devices` - Get available devices
4. `POST /warmer/campaigns/:campaignId/resume` - Start campaign

---

## 🔍 HTTP Status Codes

### Success Codes

- `200` - OK (successful GET, PUT, PATCH)
- `201` - Created (successful POST)
- `204` - No Content (successful DELETE)

### Client Error Codes

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid API token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (resource already exists)
- `422` - Unprocessable Entity (validation errors)
- `429` - Too Many Requests (rate limit exceeded)

### Server Error Codes

- `500` - Internal Server Error
- `502` - Bad Gateway (service unavailable)
- `503` - Service Unavailable
- `504` - Gateway Timeout

---

## 📝 Common Request Headers

```javascript
{
  "X-API-TOKEN": "your_api_token",           // Required for most endpoints
  "X-Device-API-Key": "device_api_key",      // For device-specific endpoints
  "X-Admin-Token": "admin_token",            // For admin endpoints
  "Content-Type": "application/json",        // For JSON requests
  "Content-Type": "multipart/form-data"      // For file uploads
}
```

## 🔄 Common Query Parameters

- `userId` - Filter by user ID
- `deviceId` - Filter by device ID
- `limit` - Pagination limit (default: 10)
- `offset` - Pagination offset (default: 0)
- `page` - Page number (alternative to offset)
- `search` - Search term
- `status` - Filter by status
- `startDate` - Date range start
- `endDate` - Date range end

---

This endpoint reference provides a complete overview of all available API endpoints. For detailed usage examples and integration patterns, refer to the specific module documentation files.
