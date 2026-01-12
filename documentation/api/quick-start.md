# Quick Start Guide

Get up and running with the WhatsApp API in under 5 minutes. This guide covers the essential setup and basic operations.

## 🚀 Prerequisites

- Node.js 14+ installed
- WhatsApp API server running (default: `http://localhost:3000`)
- API token configured
- User authentication system in your project

## ⚡ 1-Minute Setup

### Install Dependencies

```bash
npm install axios form-data ws
```

### Environment Configuration

Create a `.env` file in your project:

```bash
# WhatsApp API Configuration
WHATSAPP_API_TOKEN=your_api_token_here
WHATSAPP_API_BASE_URL=http://localhost:3000/api/whatsapp
WHATSAPP_WS_URL=ws://localhost:3001

# Your Application
USER_ID=your_user_id_here
```

### Basic Service Setup

```javascript
// whatsapp-service.js
const axios = require("axios");

class WhatsAppService {
  constructor(userId) {
    this.client = axios.create({
      baseURL: process.env.WHATSAPP_API_BASE_URL,
      headers: {
        "X-API-TOKEN": process.env.WHATSAPP_API_TOKEN,
        "Content-Type": "application/json",
      },
    });
    this.userId = userId;
  }

  getSessionId(deviceAlias) {
    return `user_${this.userId}_device_${deviceAlias}`;
  }

  // Essential methods
  async createDevice(alias) {
    const response = await this.client.post("/devices", {
      userId: this.userId,
      alias: alias,
    });
    return response.data;
  }

  async sendMessage(deviceAlias, phoneNumber, message) {
    const response = await this.client.post("/send", {
      sessionId: this.getSessionId(deviceAlias),
      phoneNumber: phoneNumber,
      message: message,
    });
    return response.data;
  }

  async sendImage(deviceAlias, phoneNumber, fileId, caption = "") {
    const response = await this.client.post("/send/image", {
      sessionId: this.getSessionId(deviceAlias),
      phoneNumber: phoneNumber,
      fileId: fileId,
      caption: caption,
    });
    return response.data;
  }

  async getUserDevices() {
    const response = await this.client.get(`/users/${this.userId}/devices`);
    return response.data;
  }
}

module.exports = WhatsAppService;
```

## 🔥 Quick Examples

### Example 1: Create Device & Send Message

```javascript
const WhatsAppService = require("./whatsapp-service");

async function quickStart() {
  const whatsapp = new WhatsAppService("your_user_id");

  try {
    // 1. Create a device
    console.log("Creating device...");
    const device = await whatsapp.createDevice("my-business");
    console.log("Device created! Scan this QR code:");
    console.log(device.data.qrCode);

    // Wait for device to connect (in production, use WebSocket events)
    console.log("Waiting 30 seconds for QR scan...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // 2. Send a message
    console.log("Sending message...");
    const result = await whatsapp.sendMessage(
      "my-business",
      "+1234567890",
      "Hello! This is my first WhatsApp API message!"
    );

    console.log("Message sent!", result.data.messageId);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

quickStart();
```

### Example 2: Express.js Integration

```javascript
// app.js
const express = require("express");
const WhatsAppService = require("./whatsapp-service");

const app = express();
app.use(express.json());

// Middleware to add WhatsApp service
app.use((req, res, next) => {
  // Get user ID from your auth system
  const userId = req.headers["x-user-id"] || "default_user";
  req.whatsapp = new WhatsAppService(userId);
  next();
});

// Send message endpoint
app.post("/send-message", async (req, res) => {
  try {
    const { deviceAlias, phoneNumber, message } = req.body;

    const result = await req.whatsapp.sendMessage(
      deviceAlias,
      phoneNumber,
      message
    );

    res.json({
      success: true,
      messageId: result.data.messageId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message,
    });
  }
});

// Get devices endpoint
app.get("/devices", async (req, res) => {
  try {
    const devices = await req.whatsapp.getUserDevices();
    res.json(devices);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message,
    });
  }
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});
```

### Example 3: File Upload & Send

```javascript
const FormData = require("form-data");
const fs = require("fs");

async function uploadAndSendImage() {
  const whatsapp = new WhatsAppService("your_user_id");

  try {
    // 1. Upload image
    const form = new FormData();
    form.append("file", fs.createReadStream("./my-image.jpg"));
    form.append("userId", "your_user_id");
    form.append("description", "Product image");

    const uploadResponse = await axios.post(
      `${process.env.WHATSAPP_API_BASE_URL}/files/upload`,
      form,
      {
        headers: {
          "X-API-TOKEN": process.env.WHATSAPP_API_TOKEN,
          ...form.getHeaders(),
        },
      }
    );

    const fileId = uploadResponse.data.data.fileId;
    console.log("File uploaded:", fileId);

    // 2. Send image
    const result = await whatsapp.sendImage(
      "my-business",
      "+1234567890",
      fileId,
      "Check out our new product!"
    );

    console.log("Image sent:", result.data.messageId);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

uploadAndSendImage();
```

## 🔄 Real-time Updates with WebSocket

```javascript
const WebSocket = require("ws");

function setupWebSocket(userId) {
  const ws = new WebSocket(
    `${process.env.WHATSAPP_WS_URL}?token=${process.env.WHATSAPP_API_TOKEN}`
  );

  ws.on("open", () => {
    console.log("WebSocket connected");
  });

  ws.on("message", (data) => {
    const event = JSON.parse(data);
    console.log("Event received:", event.type);

    switch (event.type) {
      case "qr_code":
        console.log("New QR Code for", event.sessionId);
        console.log(event.data.qrCode);
        break;

      case "device_connected":
        console.log("Device connected:", event.sessionId);
        break;

      case "message_received":
        console.log("Message received from:", event.data.from);
        console.log("Message:", event.data.message);
        break;
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  return ws;
}

// Usage
const ws = setupWebSocket("your_user_id");
```

## 📱 Complete Working Example

Here's a complete example that demonstrates the full workflow:

```javascript
// complete-example.js
const WhatsAppService = require("./whatsapp-service");
const WebSocket = require("ws");
const FormData = require("form-data");
const fs = require("fs");

class WhatsAppDemo {
  constructor(userId) {
    this.whatsapp = new WhatsAppService(userId);
    this.userId = userId;
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.ws = new WebSocket(
      `${process.env.WHATSAPP_WS_URL}?token=${process.env.WHATSAPP_API_TOKEN}`
    );

    this.ws.on("message", (data) => {
      const event = JSON.parse(data);
      this.handleWebSocketEvent(event);
    });
  }

  handleWebSocketEvent(event) {
    switch (event.type) {
      case "qr_code":
        console.log(`\n📱 Scan QR Code for ${event.sessionId}:`);
        console.log(event.data.qrCode);
        break;

      case "device_connected":
        console.log(`✅ Device connected: ${event.sessionId}`);
        this.onDeviceConnected(event.sessionId);
        break;

      case "message_received":
        console.log(
          `📨 Message from ${event.data.from}: ${event.data.message}`
        );
        break;
    }
  }

  async onDeviceConnected(sessionId) {
    console.log("Device is ready! Sending test message...");

    try {
      const deviceAlias = sessionId.split("_").pop();
      const result = await this.whatsapp.sendMessage(
        deviceAlias,
        "+1234567890", // Replace with your test number
        "🎉 WhatsApp API is working! This is an automated test message."
      );

      console.log("✅ Test message sent:", result.data.messageId);
    } catch (error) {
      console.error("❌ Failed to send test message:", error.message);
    }
  }

  async start() {
    try {
      console.log("🚀 Starting WhatsApp API Demo...");

      // 1. Check existing devices
      const devices = await this.whatsapp.getUserDevices();
      console.log(`📱 Found ${devices.data.length} existing devices`);

      if (devices.data.length === 0) {
        // 2. Create new device
        console.log("Creating new device...");
        const device = await this.whatsapp.createDevice("demo-device");
        console.log("✅ Device created successfully!");
        console.log("👆 Please scan the QR code above with your WhatsApp");
      } else {
        // Use existing device
        const device = devices.data[0];
        console.log(`📱 Using existing device: ${device.alias}`);

        if (device.status === "connected") {
          await this.onDeviceConnected(device.sessionId);
        } else {
          console.log("Device not connected. Please check device status.");
        }
      }
    } catch (error) {
      console.error("❌ Demo failed:", error.response?.data || error.message);
    }
  }

  async uploadAndSendExample() {
    try {
      // Example: Upload and send an image
      if (fs.existsSync("./demo-image.jpg")) {
        console.log("📤 Uploading demo image...");

        const form = new FormData();
        form.append("file", fs.createReadStream("./demo-image.jpg"));
        form.append("userId", this.userId);

        const uploadResponse = await axios.post(
          `${process.env.WHATSAPP_API_BASE_URL}/files/upload`,
          form,
          {
            headers: {
              "X-API-TOKEN": process.env.WHATSAPP_API_TOKEN,
              ...form.getHeaders(),
            },
          }
        );

        const fileId = uploadResponse.data.data.fileId;
        console.log("✅ File uploaded:", fileId);

        // Send the image
        const result = await this.whatsapp.sendImage(
          "demo-device",
          "+1234567890",
          fileId,
          "📸 Demo image sent via WhatsApp API!"
        );

        console.log("✅ Image sent:", result.data.messageId);
      }
    } catch (error) {
      console.error("❌ Upload/send failed:", error.message);
    }
  }
}

// Run the demo
const demo = new WhatsAppDemo("demo_user_123");
demo.start();

// Uncomment to test file upload
// setTimeout(() => demo.uploadAndSendExample(), 5000);
```

## 🏃‍♂️ Next Steps

After completing this quick start:

1. **Explore Advanced Features**:

   - [Device Management](./device-management.md) - Full device lifecycle
   - [Message Sending](./message-sending.md) - Bulk messaging, templates
   - [File Management](./file-management.md) - File organization, analytics

2. **Production Setup**:

   - [Authentication](./authentication.md) - Secure token management
   - [Error Handling](./error-handling.md) - Robust error handling
   - [Rate Limiting](./rate-limiting.md) - Performance optimization

3. **Integration Patterns**:
   - [Contact & Chat](./contact-chat.md) - Contact management
   - [Analytics & Monitoring](./analytics-monitoring.md) - Usage tracking

## 🆘 Common Issues & Solutions

### Issue: "Invalid API token"

```javascript
// Solution: Verify your token
const testAuth = async () => {
  try {
    const response = await axios.get(
      `${process.env.WHATSAPP_API_BASE_URL}/server/stats`,
      {
        headers: { "X-API-TOKEN": process.env.WHATSAPP_API_TOKEN },
      }
    );
    console.log("✅ Authentication successful");
  } catch (error) {
    console.error("❌ Authentication failed:", error.response?.status);
  }
};
```

### Issue: "Device not found"

```javascript
// Solution: Check device status
const checkDevice = async (deviceAlias) => {
  try {
    const devices = await whatsapp.getUserDevices();
    const device = devices.data.find((d) => d.alias === deviceAlias);

    if (!device) {
      console.log("❌ Device not found. Creating new device...");
      return await whatsapp.createDevice(deviceAlias);
    }

    console.log(`📱 Device status: ${device.status}`);
    return device;
  } catch (error) {
    console.error("Error checking device:", error.message);
  }
};
```

### Issue: "File not found"

```javascript
// Solution: Verify file upload
const safeFileUpload = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("File does not exist locally");
    }

    // Upload with error handling
    const result = await uploadFile(filePath);
    console.log("✅ File uploaded:", result.data.fileId);
    return result.data.fileId;
  } catch (error) {
    console.error("❌ Upload failed:", error.message);
    return null;
  }
};
```

## 🎯 Production Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] API token secured
- [ ] Error handling implemented
- [ ] Rate limiting configured
- [ ] WebSocket reconnection logic
- [ ] File cleanup scheduled
- [ ] Monitoring/logging setup
- [ ] User authentication integrated

---

You're now ready to build powerful WhatsApp integrations! 🎉

For more advanced features and production-ready patterns, explore the detailed API documentation modules.
