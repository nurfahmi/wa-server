# Device Management API

Complete guide for managing WhatsApp devices including creation, authentication, session management, and monitoring.

## 📋 Overview

Device management is the foundation of the WhatsApp API system. Each device represents a WhatsApp Business account that can send and receive messages. This guide covers all device-related operations.

### Key Concepts

- **Device**: A WhatsApp Business account instance
- **Session**: Active WhatsApp connection for a device
- **Session ID**: Unique identifier in format `user_{userId}_device_{deviceAlias}`
- **QR Code**: Authentication method for new devices
- **API Key**: Device-specific authentication token

## 🔧 Base Configuration

```javascript
// Device service setup
const axios = require("axios");

class DeviceService {
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
}

// Usage
const deviceService = new DeviceService(
  process.env.WHATSAPP_API_TOKEN,
  process.env.WHATSAPP_API_BASE_URL,
  req.user.id
);
```

---

## 📱 Device Creation & Setup

### Create New Device

**Endpoint:** `POST /api/whatsapp/devices`

**Description:** Creates a new WhatsApp device and starts the authentication session.

```javascript
// Create device
async function createDevice(alias, businessType = "general") {
  const response = await deviceService.client.post("/devices", {
    userId: deviceService.userId,
    alias: alias,
    businessType: businessType,
  });

  return response.data;
}

// Usage example
const newDevice = await createDevice("Business Account 1", "retail");
console.log("Device created:", newDevice.data);
```

**Request Body:**

```json
{
  "userId": "user123",
  "alias": "Business Account 1",
  "businessType": "retail",
  "phoneNumber": "+1234567890",
  "description": "Main business account for customer support"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "sessionId": "user_user123_device_business-account-1",
    "userId": "user123",
    "alias": "Business Account 1",
    "businessType": "retail",
    "status": "pending",
    "apiKey": "dev_1234567890abcdef",
    "createdAt": "2025-06-19T12:00:00.000Z",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "message": "Device created successfully. Scan QR code to authenticate."
}
```

### Integration Example

```javascript
// Complete device creation workflow
class DeviceManager {
  constructor(apiToken, baseURL, userId) {
    this.deviceService = new DeviceService(apiToken, baseURL, userId);
    this.devices = new Map();
  }

  async createAndSetupDevice(alias, businessType) {
    try {
      // 1. Create device
      const device = await this.deviceService.createDevice(alias, businessType);

      // 2. Store device info
      this.devices.set(device.data.sessionId, device.data);

      // 3. Set up QR code monitoring
      this.monitorDeviceStatus(device.data.sessionId);

      // 4. Return QR code for scanning
      return {
        sessionId: device.data.sessionId,
        qrCode: device.data.qrCode,
        apiKey: device.data.apiKey,
      };
    } catch (error) {
      console.error(
        "Device creation failed:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  monitorDeviceStatus(sessionId) {
    // Set up WebSocket or polling to monitor status
    const ws = new WebSocket(
      `ws://localhost:3001?token=${process.env.WHATSAPP_API_TOKEN}`
    );

    ws.on("message", (data) => {
      const event = JSON.parse(data);
      if (event.sessionId === sessionId) {
        this.handleDeviceEvent(event);
      }
    });
  }

  handleDeviceEvent(event) {
    switch (event.type) {
      case "qr_code":
        console.log("New QR code received for", event.sessionId);
        break;
      case "device_connected":
        console.log("Device connected:", event.sessionId);
        this.updateDeviceStatus(event.sessionId, "connected");
        break;
      case "device_disconnected":
        console.log("Device disconnected:", event.sessionId);
        this.updateDeviceStatus(event.sessionId, "disconnected");
        break;
    }
  }
}
```

---

## 🔐 Device Authentication

### Get QR Code for Pairing

**Endpoint:** `GET /api/whatsapp/devices/{deviceId}/qr`

**Description:** Retrieves the current QR code for device authentication.

```javascript
// Get QR code
async function getDeviceQR(deviceId) {
  const response = await deviceService.client.get(`/devices/${deviceId}/qr`);
  return response.data;
}

// Usage
const qrData = await getDeviceQR("user_user123_device_business-account-1");
console.log("QR Code:", qrData.data.qrCode);
```

**Response:**

```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "qrString": "1@ABC123DEF456...",
    "expiresAt": "2025-06-19T12:05:00.000Z",
    "attempt": 1,
    "maxAttempts": 3
  }
}
```

### Device Login/Relogin

**Endpoint:** `POST /api/whatsapp/devices/{deviceId}/login`

**Description:** Initiates login process for existing device.

```javascript
// Login device
async function loginDevice(deviceId) {
  const response = await deviceService.client.post(
    `/devices/${deviceId}/login`
  );
  return response.data;
}

// Usage
const loginResult = await loginDevice("user_user123_device_business-account-1");
```

**Response:**

```json
{
  "success": true,
  "data": {
    "sessionId": "user_user123_device_business-account-1",
    "status": "connecting",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "message": "Login initiated. Scan QR code if required."
}
```

### Device Logout

**Endpoint:** `POST /api/whatsapp/devices/{deviceId}/logout`

**Description:** Logs out device and clears session while preserving device record.

```javascript
// Logout device
async function logoutDevice(deviceId) {
  const response = await deviceService.client.post(
    `/devices/${deviceId}/logout`
  );
  return response.data;
}

// Usage
await logoutDevice("user_user123_device_business-account-1");
```

---

## 📊 Device Information & Status

### Get Device Details

**Endpoint:** `GET /api/whatsapp/devices/{deviceId}`

**Description:** Retrieves comprehensive device information and current status.

```javascript
// Get device details
async function getDeviceDetails(deviceId) {
  const response = await deviceService.client.get(`/devices/${deviceId}`);
  return response.data;
}

// Usage
const device = await getDeviceDetails("user_user123_device_business-account-1");
console.log("Device status:", device.data.status);
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "sessionId": "user_user123_device_business-account-1",
    "userId": "user123",
    "alias": "Business Account 1",
    "phoneNumber": "+1234567890",
    "businessType": "retail",
    "status": "connected",
    "lastConnection": "2025-06-19T12:00:00.000Z",
    "createdAt": "2025-06-19T11:00:00.000Z",
    "updatedAt": "2025-06-19T12:00:00.000Z",
    "connectionInfo": {
      "isConnected": true,
      "lastSeen": "2025-06-19T12:00:00.000Z",
      "platform": "android",
      "battery": 85,
      "pushName": "Business Account"
    },
    "statistics": {
      "messagesSent": 150,
      "messagesReceived": 89,
      "lastActivity": "2025-06-19T11:55:00.000Z"
    }
  }
}
```

### Get User Devices

**Endpoint:** `GET /api/whatsapp/users/{userId}/devices`

**Description:** Lists all devices for a specific user.

```javascript
// Get all user devices
async function getUserDevices(status = null) {
  const params = status ? { status } : {};
  const response = await deviceService.client.get(
    `/users/${deviceService.userId}/devices`,
    { params }
  );
  return response.data;
}

// Usage examples
const allDevices = await getUserDevices();
const connectedDevices = await getUserDevices("connected");
const pendingDevices = await getUserDevices("pending");
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sessionId": "user_user123_device_business-account-1",
      "alias": "Business Account 1",
      "phoneNumber": "+1234567890",
      "status": "connected",
      "lastConnection": "2025-06-19T12:00:00.000Z",
      "messagesSent": 150,
      "businessType": "retail"
    },
    {
      "id": 2,
      "sessionId": "user_user123_device_support",
      "alias": "Support Account",
      "phoneNumber": "+1234567891",
      "status": "disconnected",
      "lastConnection": "2025-06-19T10:30:00.000Z",
      "messagesSent": 89,
      "businessType": "support"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 50
  }
}
```

---

## ⚙️ Device Configuration

### Update Device Information

**Endpoint:** `PUT /api/whatsapp/devices/{deviceId}`

**Description:** Updates device metadata and configuration.

```javascript
// Update device
async function updateDevice(deviceId, updates) {
  const response = await deviceService.client.put(
    `/devices/${deviceId}`,
    updates
  );
  return response.data;
}

// Usage examples
await updateDevice("user_user123_device_business-account-1", {
  alias: "Updated Business Account",
  businessType: "ecommerce",
  description: "Primary e-commerce customer service account",
});
```

**Request Body:**

```json
{
  "alias": "Updated Business Account",
  "businessType": "ecommerce",
  "description": "Primary e-commerce customer service account",
  "phoneNumber": "+1234567890"
}
```

### Device Settings Management

```javascript
// AI Settings
async function updateAISettings(deviceId, aiSettings) {
  const response = await deviceService.client.put(
    `/devices/${deviceId}/settings/ai`,
    aiSettings
  );
  return response.data;
}

// Webhook Settings
async function updateWebhookSettings(deviceId, webhookSettings) {
  const response = await deviceService.client.put(
    `/devices/${deviceId}/settings/webhook`,
    webhookSettings
  );
  return response.data;
}

// Usage
await updateAISettings("device_id", {
  enabled: true,
  provider: "openai",
  model: "gpt-3.5-turbo",
  autoReply: true,
});

await updateWebhookSettings("device_id", {
  url: "https://your-app.com/webhooks/whatsapp",
  events: ["message", "status"],
  secret: "webhook_secret",
});
```

---

## 🗑️ Device Deletion

### Delete Device

**Endpoint:** `DELETE /api/whatsapp/devices/{deviceId}`

**Description:** Permanently deletes device and cleans up all associated data.

```javascript
// Delete device
async function deleteDevice(deviceId) {
  const response = await deviceService.client.delete(`/devices/${deviceId}`);
  return response.data;
}

// Usage with confirmation
async function safeDeleteDevice(deviceId) {
  try {
    // Get device info first
    const device = await getDeviceDetails(deviceId);

    // Confirm deletion
    console.log(
      `Deleting device: ${device.data.alias} (${device.data.phoneNumber})`
    );

    // Logout first (optional)
    await logoutDevice(deviceId);

    // Delete device
    const result = await deleteDevice(deviceId);
    console.log("Device deleted successfully");

    return result;
  } catch (error) {
    console.error(
      "Device deletion failed:",
      error.response?.data || error.message
    );
    throw error;
  }
}
```

---

## 📡 Real-time Device Monitoring

### WebSocket Integration

```javascript
class DeviceMonitor {
  constructor(wsUrl, apiToken) {
    this.ws = new WebSocket(`${wsUrl}?token=${apiToken}`);
    this.deviceCallbacks = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.ws.on("open", () => {
      console.log("Device monitor connected");
    });

    this.ws.on("message", (data) => {
      const event = JSON.parse(data);
      this.handleDeviceEvent(event);
    });

    this.ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    this.ws.on("close", () => {
      console.log("Device monitor disconnected");
      // Implement reconnection logic
      setTimeout(() => this.reconnect(), 5000);
    });
  }

  handleDeviceEvent(event) {
    const { sessionId, type, data } = event;

    // Call registered callbacks
    const callbacks = this.deviceCallbacks.get(sessionId) || [];
    callbacks.forEach((callback) => {
      try {
        callback(type, data);
      } catch (error) {
        console.error("Callback error:", error);
      }
    });

    // Global event handling
    switch (type) {
      case "qr_code":
        this.onQRCode(sessionId, data);
        break;
      case "device_connected":
        this.onDeviceConnected(sessionId, data);
        break;
      case "device_disconnected":
        this.onDeviceDisconnected(sessionId, data);
        break;
      case "message_received":
        this.onMessageReceived(sessionId, data);
        break;
    }
  }

  // Register device-specific callbacks
  onDevice(sessionId, callback) {
    if (!this.deviceCallbacks.has(sessionId)) {
      this.deviceCallbacks.set(sessionId, []);
    }
    this.deviceCallbacks.get(sessionId).push(callback);
  }

  // Remove device callbacks
  offDevice(sessionId) {
    this.deviceCallbacks.delete(sessionId);
  }

  onQRCode(sessionId, data) {
    console.log(`QR Code for ${sessionId}:`, data.qrCode);
  }

  onDeviceConnected(sessionId, data) {
    console.log(`Device connected: ${sessionId}`);
    // Update local device status
    this.updateDeviceStatus(sessionId, "connected");
  }

  onDeviceDisconnected(sessionId, data) {
    console.log(`Device disconnected: ${sessionId}`);
    // Update local device status
    this.updateDeviceStatus(sessionId, "disconnected");
  }

  updateDeviceStatus(sessionId, status) {
    // Update your local device registry
    // Trigger UI updates, notifications, etc.
  }
}

// Usage
const monitor = new DeviceMonitor(
  "ws://localhost:3001",
  process.env.WHATSAPP_API_TOKEN
);

// Monitor specific device
monitor.onDevice(
  "user_user123_device_business-account-1",
  (eventType, data) => {
    console.log(`Device event: ${eventType}`, data);

    if (eventType === "qr_code") {
      // Display QR code to user
      displayQRCode(data.qrCode);
    }
  }
);
```

---

## 🔄 Session Management

### Get All Sessions

**Endpoint:** `GET /api/whatsapp/sessions`

**Description:** Lists all active WhatsApp sessions.

```javascript
// Get all sessions
async function getAllSessions() {
  const response = await deviceService.client.get("/sessions");
  return response.data;
}

// Usage
const sessions = await getAllSessions();
console.log("Active sessions:", sessions.data.length);
```

### Cancel Session

**Endpoint:** `POST /api/whatsapp/sessions/{sessionId}/cancel`

**Description:** Cancels a specific session (useful for stuck sessions).

```javascript
// Cancel session
async function cancelSession(sessionId) {
  const response = await deviceService.client.post(
    `/sessions/${sessionId}/cancel`
  );
  return response.data;
}

// Usage
await cancelSession("user_user123_device_business-account-1");
```

---

## 🧪 Testing & Validation

### Device Health Check

```javascript
class DeviceHealthChecker {
  constructor(deviceService) {
    this.deviceService = deviceService;
  }

  async checkDeviceHealth(deviceId) {
    const health = {
      deviceId,
      timestamp: new Date().toISOString(),
      checks: {},
    };

    try {
      // 1. Check device exists and is accessible
      const device = await this.deviceService.getDeviceDetails(deviceId);
      health.checks.deviceExists = {
        status: "pass",
        data: device.data,
      };

      // 2. Check connection status
      health.checks.connectionStatus = {
        status: device.data.status === "connected" ? "pass" : "fail",
        value: device.data.status,
      };

      // 3. Check last activity
      const lastActivity = new Date(device.data.lastConnection);
      const hoursSinceActivity =
        (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
      health.checks.lastActivity = {
        status: hoursSinceActivity < 24 ? "pass" : "warn",
        value: `${hoursSinceActivity.toFixed(1)} hours ago`,
      };

      // 4. Test message sending capability (optional)
      if (device.data.status === "connected") {
        try {
          // Send test message to device owner
          const testResult = await this.sendTestMessage(deviceId);
          health.checks.messageSending = {
            status: "pass",
            data: testResult,
          };
        } catch (error) {
          health.checks.messageSending = {
            status: "fail",
            error: error.message,
          };
        }
      }
    } catch (error) {
      health.checks.deviceExists = {
        status: "fail",
        error: error.message,
      };
    }

    return health;
  }

  async sendTestMessage(deviceId) {
    // Implementation depends on your message sending setup
    // This is just an example
    return { sent: true, messageId: "test_123" };
  }

  async checkAllUserDevices(userId) {
    const devices = await this.deviceService.getUserDevices();
    const healthChecks = [];

    for (const device of devices.data) {
      const health = await this.checkDeviceHealth(device.sessionId);
      healthChecks.push(health);
    }

    return {
      userId,
      timestamp: new Date().toISOString(),
      totalDevices: devices.data.length,
      healthChecks,
    };
  }
}

// Usage
const healthChecker = new DeviceHealthChecker(deviceService);
const health = await healthChecker.checkDeviceHealth(
  "user_user123_device_business-account-1"
);
console.log("Device health:", health);
```

---

## 🚨 Error Handling & Troubleshooting

### Common Error Scenarios

```javascript
class DeviceErrorHandler {
  static handleDeviceError(error) {
    if (!error.response) {
      return {
        code: "NETWORK_ERROR",
        message: "Unable to connect to WhatsApp API",
        action: "check_connection",
      };
    }

    const { status, data } = error.response;

    switch (status) {
      case 400:
        return {
          code: "INVALID_REQUEST",
          message: data.error || "Invalid request parameters",
          action: "check_parameters",
        };

      case 401:
        return {
          code: "AUTHENTICATION_FAILED",
          message: "Invalid API token",
          action: "refresh_token",
        };

      case 404:
        return {
          code: "DEVICE_NOT_FOUND",
          message: "Device does not exist",
          action: "verify_device_id",
        };

      case 409:
        return {
          code: "DEVICE_CONFLICT",
          message: "Device already exists or session conflict",
          action: "check_existing_device",
        };

      case 429:
        return {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests",
          action: "retry_after_delay",
        };

      default:
        return {
          code: "API_ERROR",
          message: data.error || "Unknown API error",
          action: "contact_support",
        };
    }
  }

  static async retryOperation(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const errorInfo = this.handleDeviceError(error);

        if (
          attempt === maxRetries ||
          errorInfo.code === "AUTHENTICATION_FAILED"
        ) {
          throw error;
        }

        console.log(
          `Attempt ${attempt} failed, retrying in ${delay}ms:`,
          errorInfo.message
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
}

// Usage
try {
  const device = await DeviceErrorHandler.retryOperation(
    () => deviceService.createDevice("Business Account"),
    3,
    1000
  );
} catch (error) {
  const errorInfo = DeviceErrorHandler.handleDeviceError(error);
  console.error("Device creation failed:", errorInfo);
}
```

### Device Status Troubleshooting

```javascript
async function troubleshootDevice(deviceId) {
  const troubleshoot = {
    deviceId,
    timestamp: new Date().toISOString(),
    issues: [],
    recommendations: [],
  };

  try {
    const device = await deviceService.getDeviceDetails(deviceId);

    // Check device status
    switch (device.data.status) {
      case "pending":
        troubleshoot.issues.push("Device is waiting for QR code scan");
        troubleshoot.recommendations.push(
          "Scan the QR code with WhatsApp mobile app"
        );
        break;

      case "qr_timeout":
        troubleshoot.issues.push("QR code scanning timed out");
        troubleshoot.recommendations.push(
          "Request new QR code and scan quickly"
        );
        break;

      case "disconnected":
        troubleshoot.issues.push("Device is disconnected from WhatsApp");
        troubleshoot.recommendations.push(
          "Try logging in again or check phone connection"
        );
        break;

      case "logged_out":
        troubleshoot.issues.push("Device was logged out from WhatsApp");
        troubleshoot.recommendations.push("Re-authenticate the device");
        break;
    }

    // Check last connection time
    const lastConnection = new Date(device.data.lastConnection);
    const hoursSinceConnection =
      (Date.now() - lastConnection.getTime()) / (1000 * 60 * 60);

    if (hoursSinceConnection > 24) {
      troubleshoot.issues.push(
        `Device hasn't connected in ${hoursSinceConnection.toFixed(1)} hours`
      );
      troubleshoot.recommendations.push(
        "Check if phone is online and WhatsApp is running"
      );
    }

    return troubleshoot;
  } catch (error) {
    troubleshoot.issues.push(
      `Failed to get device information: ${error.message}`
    );
    troubleshoot.recommendations.push("Verify device ID and API token");
    return troubleshoot;
  }
}
```

---

## 📈 Performance & Optimization

### Device Connection Pool

```javascript
class DeviceConnectionPool {
  constructor(deviceService, maxConcurrent = 5) {
    this.deviceService = deviceService;
    this.maxConcurrent = maxConcurrent;
    this.activeConnections = new Map();
    this.queue = [];
  }

  async connectDevice(deviceId) {
    if (this.activeConnections.size >= this.maxConcurrent) {
      // Queue the connection request
      return new Promise((resolve, reject) => {
        this.queue.push({ deviceId, resolve, reject });
      });
    }

    return this.performConnection(deviceId);
  }

  async performConnection(deviceId) {
    try {
      this.activeConnections.set(deviceId, Date.now());

      const result = await this.deviceService.loginDevice(deviceId);

      // Monitor connection status
      this.monitorConnection(deviceId);

      return result;
    } catch (error) {
      this.activeConnections.delete(deviceId);
      this.processQueue();
      throw error;
    }
  }

  monitorConnection(deviceId) {
    // Set up monitoring for this device
    setTimeout(() => {
      this.activeConnections.delete(deviceId);
      this.processQueue();
    }, 30000); // Remove from active after 30 seconds
  }

  processQueue() {
    if (
      this.queue.length > 0 &&
      this.activeConnections.size < this.maxConcurrent
    ) {
      const { deviceId, resolve, reject } = this.queue.shift();

      this.performConnection(deviceId).then(resolve).catch(reject);
    }
  }
}
```

---

This device management documentation provides comprehensive coverage of all device-related operations. Use these patterns and examples to integrate device management into your Node.js applications effectively.
