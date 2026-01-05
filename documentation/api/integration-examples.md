# Integration Examples

Practical Node.js integration examples for different frameworks and use cases.

## 🚀 Framework Integrations

### Express.js Complete Integration

```javascript
// services/WhatsAppService.js
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

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

  // Device Management
  async createDevice(alias, phoneNumber) {
    const response = await this.client.post("/devices", {
      userId: this.userId,
      alias,
      phoneNumber,
    });
    return response.data;
  }

  async getUserDevices() {
    const response = await this.client.get(`/users/${this.userId}/devices`);
    return response.data;
  }

  // Messaging
  async sendMessage(deviceAlias, phoneNumber, message) {
    const response = await this.client.post("/send", {
      sessionId: `user_${this.userId}_device_${deviceAlias}`,
      phoneNumber,
      message,
    });
    return response.data;
  }

  // File Management
  async uploadFile(filePath, description = "") {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));
    formData.append("userId", this.userId);
    formData.append("description", description);

    const response = await this.client.post("/files/upload", formData, {
      headers: formData.getHeaders(),
    });
    return response.data;
  }
}

module.exports = WhatsAppService;
```

### Express.js Routes

```javascript
// routes/whatsapp.js
const express = require("express");
const router = express.Router();
const WhatsAppService = require("../services/WhatsAppService");
const multer = require("multer");

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Middleware to attach WhatsApp service
router.use((req, res, next) => {
  const userId = req.user?.id || req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({ error: "User ID required" });
  }
  req.whatsapp = new WhatsAppService(userId);
  next();
});

// Device Management Routes
router.post("/devices", async (req, res) => {
  try {
    const { alias, phoneNumber } = req.body;
    const result = await req.whatsapp.createDevice(alias, phoneNumber);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/devices", async (req, res) => {
  try {
    const devices = await req.whatsapp.getUserDevices();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Messaging Routes
router.post("/send-message", async (req, res) => {
  try {
    const { deviceAlias, phoneNumber, message } = req.body;
    const result = await req.whatsapp.sendMessage(
      deviceAlias,
      phoneNumber,
      message
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

## 🎯 Use Case Examples

### Customer Support Integration

```javascript
class CustomerSupportService {
  constructor(whatsappService) {
    this.whatsapp = whatsappService;
    this.supportDevice = "support-device";
  }

  async createSupportTicket(customerPhone, issue) {
    await this.whatsapp.sendMessage(
      this.supportDevice,
      customerPhone,
      `Thank you for contacting support! Your ticket #${Date.now()} has been created.`
    );

    return this.logTicket(customerPhone, issue);
  }

  async sendSupportResponse(customerPhone, response) {
    return await this.whatsapp.sendMessage(
      this.supportDevice,
      customerPhone,
      response
    );
  }

  logTicket(customerPhone, issue) {
    console.log(`Ticket created for ${customerPhone}: ${issue}`);
  }
}
```

### E-commerce Order Management

```javascript
class OrderNotificationService {
  constructor(whatsappService) {
    this.whatsapp = whatsappService;
    this.businessDevice = "business-device";
  }

  async sendOrderConfirmation(order) {
    const message = `
🛍️ Order Confirmation

Order #: ${order.id}
Total: $${order.total}
Items: ${order.items.length}

Estimated delivery: ${order.estimatedDelivery}
    `;

    return await this.whatsapp.sendMessage(
      this.businessDevice,
      order.customerPhone,
      message.trim()
    );
  }

  async sendShippingUpdate(order, trackingInfo) {
    const message = `
📦 Shipping Update

Your order #${order.id} has been shipped!

Tracking #: ${trackingInfo.trackingNumber}
Carrier: ${trackingInfo.carrier}
Expected delivery: ${trackingInfo.expectedDelivery}
    `;

    return await this.whatsapp.sendMessage(
      this.businessDevice,
      order.customerPhone,
      message.trim()
    );
  }
}
```

### Marketing Automation

```javascript
class MarketingService {
  constructor(whatsappService) {
    this.whatsapp = whatsappService;
    this.marketingDevice = "marketing-device";
  }

  async sendWelcomeSequence(customerPhone, customerName) {
    await this.whatsapp.sendMessage(
      this.marketingDevice,
      customerPhone,
      `Welcome ${customerName}! 🎉 Thanks for joining us. Get 20% off with code WELCOME20`
    );
  }

  async sendPromotionalCampaign(customers, promotion) {
    const results = [];

    for (const customer of customers) {
      try {
        const message = `
🔥 Special Offer for ${customer.name}!

${promotion.title}
${promotion.description}

Code: ${promotion.code}
Valid until: ${promotion.expiryDate}
        `;

        const result = await this.whatsapp.sendMessage(
          this.marketingDevice,
          customer.phone,
          message.trim()
        );

        results.push({ customer: customer.phone, success: true });
      } catch (error) {
        results.push({
          customer: customer.phone,
          success: false,
          error: error.message,
        });
      }

      // Rate limiting - wait between messages
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }
}
```

## 🔄 WebSocket Integration

### Real-time Device Status Monitoring

```javascript
const WebSocket = require("ws");

class WhatsAppWebSocketService {
  constructor(wsUrl, apiToken) {
    this.wsUrl = wsUrl;
    this.apiToken = apiToken;
    this.ws = null;
    this.eventHandlers = new Map();
  }

  connect() {
    this.ws = new WebSocket(`${this.wsUrl}?token=${this.apiToken}`);

    this.ws.on("open", () => {
      console.log("Connected to WhatsApp WebSocket");
      this.emit("connected");
    });

    this.ws.on("message", (data) => {
      try {
        const event = JSON.parse(data);
        this.handleEvent(event);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    });

    this.ws.on("close", () => {
      console.log("WebSocket connection closed");
      setTimeout(() => this.connect(), 5000); // Reconnect
    });
  }

  handleEvent(event) {
    console.log("Received event:", event.type);
    this.emit(event.type, event.data);
  }

  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }

  emit(eventType, data) {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.forEach((handler) => handler(data));
  }
}

// Usage
const wsService = new WhatsAppWebSocketService(
  process.env.WHATSAPP_WS_URL,
  process.env.WHATSAPP_API_TOKEN
);

wsService.on("qr_code", (qrData) => {
  console.log("QR Code received for device pairing");
});

wsService.on("device_connected", (deviceData) => {
  console.log("Device connected:", deviceData.sessionId);
});

wsService.connect();
```

## 🔧 Error Handling & Retry Logic

### Robust Error Handling Service

```javascript
class RobustWhatsAppService {
  constructor(userId, options = {}) {
    this.userId = userId;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;

    this.client = axios.create({
      baseURL: process.env.WHATSAPP_API_BASE_URL,
      headers: {
        "X-API-TOKEN": process.env.WHATSAPP_API_TOKEN,
        "Content-Type": "application/json",
      },
    });
  }

  async executeWithRetry(operation, ...args) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation.apply(this, args);
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Wait before retry
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  isNonRetryableError(error) {
    const nonRetryableCodes = [400, 401, 403, 404];
    return nonRetryableCodes.includes(error.response?.status);
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async sendMessage(deviceAlias, phoneNumber, message) {
    return this.executeWithRetry(async () => {
      const response = await this.client.post("/send", {
        sessionId: `user_${this.userId}_device_${deviceAlias}`,
        phoneNumber,
        message,
      });
      return response.data;
    });
  }
}
```

## 📱 Complete Application Example

### Simple WhatsApp Dashboard

```javascript
// app.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const WhatsAppService = require("./services/WhatsAppService");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Authentication middleware
app.use((req, res, next) => {
  const userId = req.headers["x-user-id"] || "demo-user";
  req.whatsapp = new WhatsAppService(userId);
  next();
});

// Dashboard route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// API routes
app.post("/api/devices", async (req, res) => {
  try {
    const { alias } = req.body;
    const device = await req.whatsapp.createDevice(alias);
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/devices", async (req, res) => {
  try {
    const devices = await req.whatsapp.getUserDevices();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/send-message", async (req, res) => {
  try {
    const { deviceAlias, phoneNumber, message } = req.body;
    const result = await req.whatsapp.sendMessage(
      deviceAlias,
      phoneNumber,
      message
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WhatsApp Dashboard running on port ${PORT}`);
});
```

### Frontend Dashboard (HTML + JavaScript)

```html
<!-- public/dashboard.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WhatsApp Dashboard</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 20px;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
      }
      .section {
        margin: 20px 0;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
      }
      .device {
        background: #f5f5f5;
        padding: 10px;
        margin: 10px 0;
        border-radius: 4px;
      }
      input,
      textarea,
      button {
        margin: 5px 0;
        padding: 8px;
      }
      button {
        background: #007cba;
        color: white;
        border: none;
        cursor: pointer;
      }
      button:hover {
        background: #005a8b;
      }
      .success {
        color: green;
      }
      .error {
        color: red;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>WhatsApp API Dashboard</h1>

      <!-- Device Management -->
      <div class="section">
        <h2>Device Management</h2>
        <div>
          <input type="text" id="deviceAlias" placeholder="Device Alias" />
          <button onclick="createDevice()">Create Device</button>
        </div>
        <div id="devices"></div>
      </div>

      <!-- Send Message -->
      <div class="section">
        <h2>Send Message</h2>
        <div>
          <input
            type="text"
            id="phoneNumber"
            placeholder="Phone Number (+1234567890)"
          />
          <textarea id="message" placeholder="Message" rows="3"></textarea>
          <select id="deviceSelect">
            <option value="">Select Device</option>
          </select>
          <button onclick="sendMessage()">Send Message</button>
        </div>
        <div id="messageResult"></div>
      </div>
    </div>

    <script>
      let devices = [];

      async function loadDevices() {
        try {
          const response = await fetch("/api/devices");
          const data = await response.json();
          devices = data.data || [];
          displayDevices();
          updateDeviceSelect();
        } catch (error) {
          console.error("Error loading devices:", error);
        }
      }

      function displayDevices() {
        const container = document.getElementById("devices");
        container.innerHTML = devices
          .map(
            (device) => `
                <div class="device">
                    <h3>${device.alias}</h3>
                    <p>Status: ${device.status}</p>
                    <p>Connected: ${device.isConnected ? "Yes" : "No"}</p>
                </div>
            `
          )
          .join("");
      }

      function updateDeviceSelect() {
        const select = document.getElementById("deviceSelect");
        select.innerHTML =
          '<option value="">Select Device</option>' +
          devices
            .map(
              (device) =>
                `<option value="${device.alias}">${device.alias}</option>`
            )
            .join("");
      }

      async function createDevice() {
        const alias = document.getElementById("deviceAlias").value;
        if (!alias) return alert("Please enter device alias");

        try {
          const response = await fetch("/api/devices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alias }),
          });

          const result = await response.json();
          if (result.success) {
            alert("Device created successfully! Check console for QR code.");
            console.log("QR Code:", result.data.qrCode);
            loadDevices();
          } else {
            alert("Error: " + result.error);
          }
        } catch (error) {
          alert("Error creating device: " + error.message);
        }
      }

      async function sendMessage() {
        const phoneNumber = document.getElementById("phoneNumber").value;
        const message = document.getElementById("message").value;
        const deviceAlias = document.getElementById("deviceSelect").value;

        if (!phoneNumber || !message || !deviceAlias) {
          return alert("Please fill all fields");
        }

        try {
          const response = await fetch("/api/send-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceAlias, phoneNumber, message }),
          });

          const result = await response.json();
          const resultDiv = document.getElementById("messageResult");

          if (result.success) {
            resultDiv.innerHTML =
              '<p class="success">Message sent successfully!</p>';
            document.getElementById("message").value = "";
          } else {
            resultDiv.innerHTML =
              '<p class="error">Error: ' + result.error + "</p>";
          }
        } catch (error) {
          document.getElementById("messageResult").innerHTML =
            '<p class="error">Error sending message: ' + error.message + "</p>";
        }
      }

      // Load devices on page load
      loadDevices();
    </script>
  </body>
</html>
```

This integration examples guide provides practical, production-ready code for integrating the WhatsApp API into various Node.js applications and use cases.
