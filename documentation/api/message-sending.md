# Message Sending API

Complete guide for sending text messages, media files, and bulk messages through WhatsApp API integration.

## 📋 Overview

The Message Sending API provides comprehensive functionality for sending various types of messages through WhatsApp devices. This includes text messages, images, videos, documents, and advanced bulk messaging capabilities.

### Key Features

- **Text Messages**: Send plain text and formatted messages
- **Media Messages**: Send images, videos, documents, and audio
- **File Library Integration**: Use stored files for media messages
- **Bulk Messaging**: Send multiple files to single or multiple recipients
- **Message Tracking**: Full logging and status tracking
- **Resending**: Retry failed messages
- **Rate Limiting**: Built-in throttling and queue management

## 🔧 Base Configuration

```javascript
// Message service setup
const axios = require("axios");

class MessageService {
  constructor(apiToken, baseURL, userId) {
    this.client = axios.create({
      baseURL,
      headers: {
        "X-API-TOKEN": apiToken,
        "Content-Type": "application/json",
      },
    });
    this.userId = userId;
  }

  // Helper to format session ID
  getSessionId(deviceAlias) {
    return `user_${this.userId}_device_${deviceAlias}`;
  }
}

// Usage
const messageService = new MessageService(
  process.env.WHATSAPP_API_TOKEN,
  process.env.WHATSAPP_API_BASE_URL,
  req.user.id
);
```

---

## 💬 Text Messages

### Send Text Message

**Endpoint:** `POST /api/whatsapp/send`

**Description:** Sends a text message to a WhatsApp number.

```javascript
// Send text message
async function sendTextMessage(deviceAlias, phoneNumber, message) {
  const response = await messageService.client.post("/send", {
    sessionId: messageService.getSessionId(deviceAlias),
    phoneNumber: phoneNumber,
    message: message,
  });

  return response.data;
}

// Usage examples
const result = await sendTextMessage(
  "business-main",
  "+1234567890",
  "Hello! How can I help you today?"
);
console.log("Message sent:", result.data.messageId);
```

**Request Body:**

```json
{
  "sessionId": "user_user123_device_business-main",
  "phoneNumber": "+1234567890",
  "message": "Hello! How can I help you today?"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "messageId": "msg_1234567890",
    "whatsappMessageId": "3EB0C767D26A1B4F8A35",
    "status": "sent",
    "timestamp": "2025-06-19T12:00:00.000Z",
    "phoneNumber": "+1234567890",
    "message": "Hello! How can I help you today?"
  },
  "message": "Message sent successfully"
}
```

### Formatted Text Messages

````javascript
// Send formatted message with WhatsApp formatting
async function sendFormattedMessage(deviceAlias, phoneNumber, message) {
  // WhatsApp formatting:
  // *bold* _italic_ ~strikethrough~ ```monospace```
  const formattedMessage = `
*Welcome to Our Service!*

_Thank you for contacting us._

Here are our ~old~ *new* business hours:
\`\`\`
Monday - Friday: 9:00 AM - 6:00 PM
Saturday: 10:00 AM - 4:00 PM
Sunday: Closed
\`\`\`

How can we help you today?
  `.trim();

  return await sendTextMessage(deviceAlias, phoneNumber, formattedMessage);
}

// Usage
await sendFormattedMessage("support", "+1234567890");
````

### Integration Example

```javascript
// Complete text messaging service
class TextMessageService {
  constructor(messageService) {
    this.messageService = messageService;
    this.templates = new Map();
  }

  // Register message templates
  registerTemplate(name, template) {
    this.templates.set(name, template);
  }

  // Send templated message
  async sendTemplate(deviceAlias, phoneNumber, templateName, variables = {}) {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    // Replace variables in template
    let message = template;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    return await this.messageService.sendTextMessage(
      deviceAlias,
      phoneNumber,
      message
    );
  }

  // Send welcome message
  async sendWelcome(deviceAlias, phoneNumber, customerName) {
    return await this.sendTemplate(deviceAlias, phoneNumber, "welcome", {
      name: customerName,
      company: "Your Company Name",
    });
  }
}

// Setup templates
const textService = new TextMessageService(messageService);
textService.registerTemplate(
  "welcome",
  "Hello {{name}}! Welcome to {{company}}. How can we assist you today?"
);
textService.registerTemplate(
  "order_confirmation",
  "Hi {{name}}, your order #{{orderId}} has been confirmed. Total: ${{total}}. Expected delivery: {{deliveryDate}}"
);

// Usage
await textService.sendWelcome("business-main", "+1234567890", "John Doe");
await textService.sendTemplate(
  "business-main",
  "+1234567890",
  "order_confirmation",
  {
    name: "John Doe",
    orderId: "ORD-12345",
    total: "99.99",
    deliveryDate: "2025-06-22",
  }
);
```

---

## 🖼️ Media Messages

### Send Image

**Endpoint:** `POST /api/whatsapp/send/image`

**Description:** Sends an image from your file library.

```javascript
// Send image from file library
async function sendImage(deviceAlias, phoneNumber, fileId, caption = "") {
  const response = await messageService.client.post("/send/image", {
    sessionId: messageService.getSessionId(deviceAlias),
    phoneNumber: phoneNumber,
    fileId: fileId,
    caption: caption,
  });

  return response.data;
}

// Usage
const imageResult = await sendImage(
  "business-main",
  "+1234567890",
  "file_abc123def456",
  "Check out our new product!"
);
```

**Request Body:**

```json
{
  "sessionId": "user_user123_device_business-main",
  "phoneNumber": "+1234567890",
  "fileId": "file_abc123def456",
  "caption": "Check out our new product!"
}
```

### Send Video

**Endpoint:** `POST /api/whatsapp/send/video`

**Description:** Sends a video from your file library.

```javascript
// Send video
async function sendVideo(deviceAlias, phoneNumber, fileId, caption = "") {
  const response = await messageService.client.post("/send/video", {
    sessionId: messageService.getSessionId(deviceAlias),
    phoneNumber: phoneNumber,
    fileId: fileId,
    caption: caption,
  });

  return response.data;
}

// Usage
await sendVideo(
  "business-main",
  "+1234567890",
  "video_xyz789",
  "Product demonstration video"
);
```

### Send Document

**Endpoint:** `POST /api/whatsapp/send/document`

**Description:** Sends a document from your file library.

```javascript
// Send document
async function sendDocument(deviceAlias, phoneNumber, fileId, filename = null) {
  const response = await messageService.client.post("/send/document", {
    sessionId: messageService.getSessionId(deviceAlias),
    phoneNumber: phoneNumber,
    fileId: fileId,
    filename: filename,
  });

  return response.data;
}

// Usage
await sendDocument(
  "business-main",
  "+1234567890",
  "doc_pdf123",
  "Product_Catalog.pdf"
);
```

### Media Response Format

```json
{
  "success": true,
  "data": {
    "messageId": "msg_media_1234567890",
    "whatsappMessageId": "3EB0C767D26A1B4F8A36",
    "status": "sent",
    "type": "image",
    "fileId": "file_abc123def456",
    "caption": "Check out our new product!",
    "filename": "product_image.jpg",
    "fileSize": 245760,
    "timestamp": "2025-06-19T12:00:00.000Z",
    "phoneNumber": "+1234567890"
  },
  "message": "Image sent successfully"
}
```

---

## 📁 File Management Integration

### Get User Files by Type

**Endpoint:** `GET /api/whatsapp/files/users/{userId}/{fileType}`

**Description:** Retrieves files from user's library filtered by type.

```javascript
// Get files for media selection
async function getUserFiles(fileType, limit = 50) {
  const response = await messageService.client.get(
    `/files/users/${messageService.userId}/${fileType}`,
    { params: { limit } }
  );

  return response.data;
}

// Usage examples
const images = await getUserFiles("image");
const videos = await getUserFiles("video");
const documents = await getUserFiles("document");
```

### File Selection Helper

```javascript
// Helper class for file management
class FileManager {
  constructor(messageService) {
    this.messageService = messageService;
    this.fileCache = new Map();
  }

  async getFilesByType(type) {
    if (this.fileCache.has(type)) {
      return this.fileCache.get(type);
    }

    const files = await this.messageService.getUserFiles(type);
    this.fileCache.set(type, files.data);

    // Cache for 5 minutes
    setTimeout(() => {
      this.fileCache.delete(type);
    }, 5 * 60 * 1000);

    return files.data;
  }

  async findFileByName(filename, type = null) {
    const types = type ? [type] : ["image", "video", "document", "audio"];

    for (const fileType of types) {
      const files = await this.getFilesByType(fileType);
      const file = files.find((f) => f.originalName.includes(filename));
      if (file) return file;
    }

    return null;
  }

  async sendFileByName(deviceAlias, phoneNumber, filename, caption = "") {
    const file = await this.findFileByName(filename);
    if (!file) {
      throw new Error(`File containing '${filename}' not found`);
    }

    switch (file.fileType) {
      case "image":
        return await this.messageService.sendImage(
          deviceAlias,
          phoneNumber,
          file.fileId,
          caption
        );
      case "video":
        return await this.messageService.sendVideo(
          deviceAlias,
          phoneNumber,
          file.fileId,
          caption
        );
      case "document":
        return await this.messageService.sendDocument(
          deviceAlias,
          phoneNumber,
          file.fileId,
          file.originalName
        );
      default:
        throw new Error(`Unsupported file type: ${file.fileType}`);
    }
  }
}

// Usage
const fileManager = new FileManager(messageService);
await fileManager.sendFileByName(
  "business-main",
  "+1234567890",
  "catalog",
  "Our latest catalog"
);
```

---

## 📦 Bulk & Batch Messaging

### Send Bulk Files (Same Type)

**Endpoint:** `POST /api/whatsapp/send/bulk`

**Description:** Sends multiple files of the same type to one recipient.

```javascript
// Send multiple images
async function sendBulkFiles(
  deviceAlias,
  phoneNumber,
  fileIds,
  fileType,
  caption = ""
) {
  const response = await messageService.client.post("/send/bulk", {
    sessionId: messageService.getSessionId(deviceAlias),
    phoneNumber: phoneNumber,
    fileIds: fileIds,
    fileType: fileType,
    caption: caption,
  });

  return response.data;
}

// Usage
const imageIds = ["img_001", "img_002", "img_003"];
await sendBulkFiles(
  "business-main",
  "+1234567890",
  imageIds,
  "image",
  "Product gallery"
);
```

### Send Mixed Media

**Endpoint:** `POST /api/whatsapp/send/mixed`

**Description:** Sends different types of files in sequence.

```javascript
// Send mixed media files
async function sendMixedMedia(deviceAlias, phoneNumber, files) {
  const response = await messageService.client.post("/send/mixed", {
    sessionId: messageService.getSessionId(deviceAlias),
    phoneNumber: phoneNumber,
    files: files,
  });

  return response.data;
}

// Usage
const mixedFiles = [
  { fileId: "img_001", type: "image", caption: "Product image" },
  { fileId: "vid_001", type: "video", caption: "Demo video" },
  { fileId: "doc_001", type: "document", filename: "specifications.pdf" },
];

await sendMixedMedia("business-main", "+1234567890", mixedFiles);
```

### Batch Send to Multiple Recipients

**Endpoint:** `POST /api/whatsapp/send/batch`

**Description:** Sends the same content to multiple phone numbers.

```javascript
// Send to multiple recipients
async function sendBatchMessage(deviceAlias, phoneNumbers, content) {
  const response = await messageService.client.post("/send/batch", {
    sessionId: messageService.getSessionId(deviceAlias),
    phoneNumbers: phoneNumbers,
    ...content,
  });

  return response.data;
}

// Usage examples

// Batch text message
await sendBatchMessage("business-main", ["+1234567890", "+1234567891"], {
  message: "Important announcement for all customers!",
});

// Batch image
await sendBatchMessage("business-main", ["+1234567890", "+1234567891"], {
  fileIds: ["img_001"],
  fileType: "image",
  caption: "New product launch!",
});
```

**Response Format:**

```json
{
  "success": true,
  "data": {
    "batchId": "batch_1234567890",
    "totalRecipients": 2,
    "results": [
      {
        "phoneNumber": "+1234567890",
        "messageId": "msg_001",
        "status": "sent",
        "timestamp": "2025-06-19T12:00:00.000Z"
      },
      {
        "phoneNumber": "+1234567891",
        "messageId": "msg_002",
        "status": "sent",
        "timestamp": "2025-06-19T12:00:01.000Z"
      }
    ],
    "summary": {
      "sent": 2,
      "failed": 0,
      "pending": 0
    }
  }
}
```

---

## 🔄 Message Management

### Resend Message

**Endpoint:** `POST /api/whatsapp/messages/{messageId}/resend`

**Description:** Resends a previously sent message.

```javascript
// Resend failed message
async function resendMessage(messageId, newSessionId = null) {
  const requestBody = { messageId };
  if (newSessionId) {
    requestBody.sessionId = newSessionId;
  }

  const response = await messageService.client.post(
    `/messages/${messageId}/resend`,
    requestBody
  );
  return response.data;
}

// Usage examples
await resendMessage("msg_failed_123"); // Resend with same device
await resendMessage("msg_failed_123", "user_user123_device_backup"); // Resend with different device
```

### Get Message Status

**Endpoint:** `GET /api/whatsapp/messages/{messageId}`

**Description:** Retrieves detailed message information and status.

```javascript
// Get message details
async function getMessageStatus(messageId) {
  const response = await messageService.client.get(`/messages/${messageId}`);
  return response.data;
}

// Usage
const messageInfo = await getMessageStatus("msg_1234567890");
console.log("Status:", messageInfo.data.status);
```

### Get User Messages

**Endpoint:** `GET /api/whatsapp/users/{userId}/messages`

**Description:** Retrieves message history for the user.

```javascript
// Get message history
async function getMessageHistory(limit = 50, offset = 0, status = null) {
  const params = { limit, offset };
  if (status) params.status = status;

  const response = await messageService.client.get(
    `/users/${messageService.userId}/messages`,
    { params }
  );

  return response.data;
}

// Usage examples
const allMessages = await getMessageHistory();
const failedMessages = await getMessageHistory(20, 0, "failed");
const recentMessages = await getMessageHistory(10);
```

---

## 📊 Advanced Features

### Message Scheduling

```javascript
// Schedule message for later (implementation depends on your queue system)
class MessageScheduler {
  constructor(messageService) {
    this.messageService = messageService;
    this.scheduledMessages = new Map();
  }

  scheduleMessage(deviceAlias, phoneNumber, message, sendAt) {
    const scheduleId = `sched_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const delay = new Date(sendAt).getTime() - Date.now();

    if (delay <= 0) {
      throw new Error("Scheduled time must be in the future");
    }

    const timeoutId = setTimeout(async () => {
      try {
        const result = await this.messageService.sendTextMessage(
          deviceAlias,
          phoneNumber,
          message
        );
        console.log(`Scheduled message sent: ${result.data.messageId}`);
        this.scheduledMessages.delete(scheduleId);
      } catch (error) {
        console.error("Scheduled message failed:", error);
      }
    }, delay);

    this.scheduledMessages.set(scheduleId, {
      timeoutId,
      deviceAlias,
      phoneNumber,
      message,
      sendAt,
    });

    return scheduleId;
  }

  cancelScheduledMessage(scheduleId) {
    const scheduled = this.scheduledMessages.get(scheduleId);
    if (scheduled) {
      clearTimeout(scheduled.timeoutId);
      this.scheduledMessages.delete(scheduleId);
      return true;
    }
    return false;
  }

  getScheduledMessages() {
    const messages = [];
    for (const [id, data] of this.scheduledMessages) {
      messages.push({
        scheduleId: id,
        deviceAlias: data.deviceAlias,
        phoneNumber: data.phoneNumber,
        message: data.message,
        sendAt: data.sendAt,
      });
    }
    return messages;
  }
}

// Usage
const scheduler = new MessageScheduler(messageService);
const scheduleId = scheduler.scheduleMessage(
  "business-main",
  "+1234567890",
  "Reminder: Your appointment is tomorrow at 2 PM",
  "2025-06-20T13:00:00.000Z"
);
```

### Message Templates with Variables

```javascript
// Advanced template system
class AdvancedTemplateService {
  constructor(messageService) {
    this.messageService = messageService;
    this.templates = new Map();
  }

  // Register template with validation
  registerTemplate(name, template, requiredVars = []) {
    this.templates.set(name, {
      template,
      requiredVars,
      createdAt: new Date(),
    });
  }

  // Process template with variables
  processTemplate(templateName, variables) {
    const templateData = this.templates.get(templateName);
    if (!templateData) {
      throw new Error(`Template '${templateName}' not found`);
    }

    // Check required variables
    const missing = templateData.requiredVars.filter((v) => !(v in variables));
    if (missing.length > 0) {
      throw new Error(`Missing required variables: ${missing.join(", ")}`);
    }

    let message = templateData.template;

    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    // Process conditional blocks
    message = this.processConditionals(message, variables);

    return message;
  }

  processConditionals(message, variables) {
    // Process {{#if variable}} content {{/if}} blocks
    const ifRegex = /{{#if\s+(\w+)}}(.*?){{\/if}}/gs;

    return message.replace(ifRegex, (match, variable, content) => {
      return variables[variable] ? content.trim() : "";
    });
  }

  async sendTemplatedMessage(
    deviceAlias,
    phoneNumber,
    templateName,
    variables
  ) {
    const message = this.processTemplate(templateName, variables);
    return await this.messageService.sendTextMessage(
      deviceAlias,
      phoneNumber,
      message
    );
  }
}

// Setup advanced templates
const templateService = new AdvancedTemplateService(messageService);

templateService.registerTemplate(
  "order_update",
  `
Hi {{customerName}}!

Your order #{{orderNumber}} status has been updated to: *{{status}}*

{{#if trackingNumber}}
Tracking Number: {{trackingNumber}}
You can track your order at: {{trackingUrl}}
{{/if}}

{{#if estimatedDelivery}}
Estimated Delivery: {{estimatedDelivery}}
{{/if}}

Thank you for choosing {{companyName}}!
`.trim(),
  ["customerName", "orderNumber", "status", "companyName"]
);

// Usage
await templateService.sendTemplatedMessage(
  "business-main",
  "+1234567890",
  "order_update",
  {
    customerName: "John Doe",
    orderNumber: "ORD-12345",
    status: "Shipped",
    trackingNumber: "TRK789",
    trackingUrl: "https://track.example.com/TRK789",
    estimatedDelivery: "June 22, 2025",
    companyName: "Your Business",
  }
);
```

---

## 🚨 Error Handling & Best Practices

### Message Error Handling

```javascript
class MessageErrorHandler {
  static handleMessageError(error) {
    if (!error.response) {
      return {
        code: "NETWORK_ERROR",
        message: "Unable to connect to WhatsApp API",
        action: "retry_later",
      };
    }

    const { status, data } = error.response;

    switch (status) {
      case 400:
        return {
          code: "INVALID_MESSAGE_DATA",
          message: data.error || "Invalid message parameters",
          action: "check_parameters",
        };

      case 404:
        if (data.error?.includes("file")) {
          return {
            code: "FILE_NOT_FOUND",
            message: "Specified file does not exist",
            action: "check_file_id",
          };
        }
        return {
          code: "DEVICE_NOT_FOUND",
          message: "Device session not found",
          action: "check_device_status",
        };

      case 429:
        return {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many messages sent",
          action: "implement_throttling",
        };

      case 500:
        return {
          code: "WHATSAPP_ERROR",
          message: "WhatsApp service error",
          action: "retry_with_backoff",
        };

      default:
        return {
          code: "API_ERROR",
          message: data.error || "Unknown API error",
          action: "contact_support",
        };
    }
  }

  static async retryMessage(messageOperation, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await messageOperation();
      } catch (error) {
        lastError = error;
        const errorInfo = this.handleMessageError(error);

        // Don't retry certain errors
        if (
          errorInfo.code === "INVALID_MESSAGE_DATA" ||
          errorInfo.code === "FILE_NOT_FOUND"
        ) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(
          `Message attempt ${attempt} failed, retrying in ${delay}ms:`,
          errorInfo.message
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

// Usage
try {
  const result = await MessageErrorHandler.retryMessage(() =>
    messageService.sendTextMessage("business-main", "+1234567890", "Hello!")
  );
  console.log("Message sent:", result.data.messageId);
} catch (error) {
  const errorInfo = MessageErrorHandler.handleMessageError(error);
  console.error("Message failed:", errorInfo);
}
```

### Rate Limiting & Throttling

```javascript
class MessageThrottler {
  constructor(messagesPerMinute = 60) {
    this.messagesPerMinute = messagesPerMinute;
    this.messageQueue = [];
    this.sentMessages = [];
    this.isProcessing = false;
  }

  async sendMessage(messageOperation) {
    return new Promise((resolve, reject) => {
      this.messageQueue.push({
        operation: messageOperation,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      // Clean old sent messages (older than 1 minute)
      const oneMinuteAgo = Date.now() - 60000;
      this.sentMessages = this.sentMessages.filter((t) => t > oneMinuteAgo);

      // Check if we can send more messages
      if (this.sentMessages.length >= this.messagesPerMinute) {
        // Wait until we can send again
        const oldestMessage = Math.min(...this.sentMessages);
        const waitTime = 60000 - (Date.now() - oldestMessage);

        if (waitTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
      }

      const messageItem = this.messageQueue.shift();

      try {
        const result = await messageItem.operation();
        this.sentMessages.push(Date.now());
        messageItem.resolve(result);
      } catch (error) {
        messageItem.reject(error);
      }

      // Small delay between messages
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  getQueueStatus() {
    return {
      queueLength: this.messageQueue.length,
      sentInLastMinute: this.sentMessages.length,
      rateLimitRemaining: this.messagesPerMinute - this.sentMessages.length,
    };
  }
}

// Usage
const throttler = new MessageThrottler(30); // 30 messages per minute

// Send throttled messages
const customers = ["+1234567890", "+1234567891", "+1234567892"];

for (const phoneNumber of customers) {
  throttler
    .sendMessage(() =>
      messageService.sendTextMessage(
        "business-main",
        phoneNumber,
        "Promotional message"
      )
    )
    .then((result) => {
      console.log(`Message sent to ${phoneNumber}:`, result.data.messageId);
    })
    .catch((error) => {
      console.error(`Failed to send to ${phoneNumber}:`, error.message);
    });
}

console.log("Queue status:", throttler.getQueueStatus());
```

---

This message sending documentation provides comprehensive coverage of all messaging capabilities. Use these patterns and examples to integrate message sending functionality into your Node.js applications effectively.
