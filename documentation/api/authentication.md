# Authentication & Authorization

Complete guide for authenticating and authorizing API requests when integrating WhatsApp functionality into your Node.js projects.

## 📋 Authentication Overview

The WhatsApp API uses multiple authentication methods depending on the endpoint and use case:

1. **API Token Authentication** - Primary method for most endpoints
2. **Device API Key Authentication** - For device-specific operations
3. **User Context** - User ID validation for resource access
4. **Admin Authentication** - For administrative operations

## 🔑 API Token Authentication

### Setup in Your Project

```javascript
// .env file
WHATSAPP_API_TOKEN=your_secure_api_token_here
WHATSAPP_API_BASE_URL=http://localhost:3000/api/whatsapp

// config.js
const config = {
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN,
    baseURL: process.env.WHATSAPP_API_BASE_URL,
    timeout: 30000
  }
};

module.exports = config;
```

### HTTP Client Configuration

```javascript
const axios = require("axios");
const config = require("./config");

// Create authenticated HTTP client
const whatsappClient = axios.create({
  baseURL: config.whatsapp.baseURL,
  timeout: config.whatsapp.timeout,
  headers: {
    "X-API-TOKEN": config.whatsapp.apiToken,
    "Content-Type": "application/json",
  },
});

// Add response interceptor for error handling
whatsappClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("WhatsApp API authentication failed");
      // Handle authentication error (e.g., refresh token, logout user)
    }
    return Promise.reject(error);
  }
);

module.exports = whatsappClient;
```

### Service Class Implementation

```javascript
class WhatsAppAuthService {
  constructor(apiToken, baseURL) {
    this.client = axios.create({
      baseURL,
      headers: {
        "X-API-TOKEN": apiToken,
        "Content-Type": "application/json",
      },
    });
  }

  // Test authentication
  async validateToken() {
    try {
      const response = await this.client.get("/server/stats");
      return response.data.success;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error("Invalid API token");
      }
      throw error;
    }
  }

  // Get authenticated user context
  async getUserDevices(userId) {
    const response = await this.client.get(`/users/${userId}/devices`);
    return response.data;
  }
}

// Usage
const authService = new WhatsAppAuthService(
  process.env.WHATSAPP_API_TOKEN,
  process.env.WHATSAPP_API_BASE_URL
);
```

## 👤 User Context Management

### User ID from Authentication

```javascript
// Express middleware to extract user ID from your auth system
function extractUserContext(req, res, next) {
  // Get user from your authentication system
  const user = req.user; // Assuming you have user auth middleware

  if (!user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  // Add user context for WhatsApp operations
  req.whatsappUserId = user.id;
  req.whatsappUser = {
    id: user.id,
    email: user.email,
    name: user.name,
  };

  next();
}

// Usage in routes
app.use("/api/whatsapp", authenticateUser, extractUserContext);
```

### User-Scoped API Calls

```javascript
class UserWhatsAppService {
  constructor(apiToken, baseURL, userId) {
    this.client = axios.create({
      baseURL,
      headers: { "X-API-TOKEN": apiToken },
    });
    this.userId = userId;
  }

  // All methods automatically use user context
  async createDevice(deviceData) {
    return this.client.post("/devices", {
      ...deviceData,
      userId: this.userId,
    });
  }

  async getUserDevices() {
    return this.client.get(`/users/${this.userId}/devices`);
  }

  async sendMessage(sessionId, phoneNumber, message) {
    return this.client.post("/send", {
      sessionId: `user_${this.userId}_device_${sessionId}`,
      phoneNumber,
      message,
    });
  }

  async getUserMessages(limit = 50, offset = 0) {
    return this.client.get(`/users/${this.userId}/messages`, {
      params: { limit, offset },
    });
  }
}
```

## 🔐 Device API Key Authentication

Some endpoints use device-specific API keys for enhanced security:

### Device API Key Usage

```javascript
// For device-specific operations
async function sendMessageWithDeviceKey(deviceApiKey, phoneNumber, message) {
  const response = await axios.post(
    "http://localhost:3000/api/whatsapp/device/send",
    {
      phoneNumber,
      message,
    },
    {
      headers: {
        "X-DEVICE-API-KEY": deviceApiKey,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

// Get device API key from device creation
async function createDeviceAndGetKey(userId, deviceAlias) {
  const response = await whatsappClient.post("/devices", {
    userId,
    alias: deviceAlias,
  });

  const { apiKey } = response.data.data;

  // Store device API key securely
  await storeDeviceApiKey(userId, deviceAlias, apiKey);

  return response.data;
}
```

## 🛡️ Security Best Practices

### Environment Configuration

```bash
# .env file - Never commit to version control
WHATSAPP_API_TOKEN=wsk_live_1234567890abcdef
WHATSAPP_API_BASE_URL=https://your-whatsapp-api.com/api/whatsapp
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret_here

# Development vs Production
NODE_ENV=production
WHATSAPP_API_TIMEOUT=30000
WHATSAPP_RATE_LIMIT_ENABLED=true
```

### Token Management

```javascript
class TokenManager {
  constructor() {
    this.tokens = new Map();
  }

  // Securely store API tokens
  setToken(userId, token) {
    // Encrypt token before storage in production
    const encryptedToken = this.encrypt(token);
    this.tokens.set(userId, encryptedToken);
  }

  // Retrieve and decrypt token
  getToken(userId) {
    const encryptedToken = this.tokens.get(userId);
    return encryptedToken ? this.decrypt(encryptedToken) : null;
  }

  // Validate token expiry
  isTokenValid(userId) {
    const token = this.getToken(userId);
    if (!token) return false;

    // Implement token validation logic
    return this.validateTokenFormat(token);
  }

  encrypt(token) {
    // Implement encryption (use crypto module)
    return token; // Simplified for example
  }

  decrypt(encryptedToken) {
    // Implement decryption
    return encryptedToken; // Simplified for example
  }
}
```

### Request Validation

```javascript
// Middleware for request validation
function validateWhatsAppRequest(req, res, next) {
  const { userId } = req.query;
  const apiToken = req.headers["x-api-token"];

  // Validate API token format
  if (!apiToken || !apiToken.startsWith("wsk_")) {
    return res.status(401).json({
      success: false,
      error: "Invalid API token format",
    });
  }

  // Validate user ID
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({
      success: false,
      error: "User ID is required",
    });
  }

  // Check if user has permission for this resource
  if (!hasUserPermission(req.user.id, userId)) {
    return res.status(403).json({
      success: false,
      error: "Insufficient permissions",
    });
  }

  next();
}
```

## 🔄 Error Handling

### Authentication Error Responses

```javascript
// Standard authentication error handling
function handleAuthError(error) {
  if (error.response) {
    switch (error.response.status) {
      case 401:
        return {
          code: "AUTHENTICATION_FAILED",
          message: "Invalid API token or expired session",
          action: "refresh_token",
        };

      case 403:
        return {
          code: "INSUFFICIENT_PERMISSIONS",
          message: "User does not have permission for this resource",
          action: "check_permissions",
        };

      case 429:
        return {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests, please try again later",
          action: "retry_after_delay",
        };

      default:
        return {
          code: "API_ERROR",
          message: error.response.data?.error || "Unknown API error",
          action: "contact_support",
        };
    }
  }

  return {
    code: "NETWORK_ERROR",
    message: "Unable to connect to WhatsApp API",
    action: "check_connection",
  };
}

// Usage in service methods
async function safeApiCall(apiCall) {
  try {
    return await apiCall();
  } catch (error) {
    const authError = handleAuthError(error);
    console.error("WhatsApp API Error:", authError);
    throw new Error(authError.message);
  }
}
```

## 🚀 Integration Examples

### Express.js Integration

```javascript
const express = require("express");
const { WhatsAppService } = require("./services/whatsapp");

const app = express();

// Authentication middleware
app.use("/api/whatsapp", (req, res, next) => {
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const userId = req.user?.id; // From your auth system

  if (!userId) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  req.whatsapp = new WhatsAppService(apiToken, userId);
  next();
});

// Protected routes
app.post("/api/whatsapp/send-message", async (req, res) => {
  try {
    const { deviceId, phoneNumber, message } = req.body;
    const result = await req.whatsapp.sendMessage(
      deviceId,
      phoneNumber,
      message
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### NestJS Integration

```typescript
// auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class WhatsAppAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiToken = request.headers["x-api-token"];
    const expectedToken = this.configService.get("WHATSAPP_API_TOKEN");

    return apiToken === expectedToken;
  }
}

// whatsapp.service.ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

@Injectable()
export class WhatsAppService {
  private client: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.configService.get("WHATSAPP_API_BASE_URL"),
      headers: {
        "X-API-TOKEN": this.configService.get("WHATSAPP_API_TOKEN"),
      },
    });
  }

  async sendMessage(
    userId: string,
    deviceId: string,
    phoneNumber: string,
    message: string
  ) {
    const response = await this.client.post("/send", {
      sessionId: `user_${userId}_device_${deviceId}`,
      phoneNumber,
      message,
    });
    return response.data;
  }
}
```

### Next.js API Routes

```javascript
// pages/api/whatsapp/send.js
import { WhatsAppService } from "../../../lib/whatsapp";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get user from session/JWT
    const session = await getSession(req);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const whatsapp = new WhatsAppService(
      process.env.WHATSAPP_API_TOKEN,
      session.user.id
    );

    const { deviceId, phoneNumber, message } = req.body;
    const result = await whatsapp.sendMessage(deviceId, phoneNumber, message);

    res.status(200).json(result);
  } catch (error) {
    console.error("WhatsApp send error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
}
```

## 🔧 Configuration Management

### Environment-Based Configuration

```javascript
// config/whatsapp.js
const config = {
  development: {
    apiToken: process.env.WHATSAPP_API_TOKEN_DEV,
    baseURL: "http://localhost:3000/api/whatsapp",
    timeout: 10000,
    rateLimitEnabled: false,
  },
  production: {
    apiToken: process.env.WHATSAPP_API_TOKEN_PROD,
    baseURL: process.env.WHATSAPP_API_BASE_URL,
    timeout: 30000,
    rateLimitEnabled: true,
  },
  test: {
    apiToken: "test_token",
    baseURL: "http://localhost:3001/api/whatsapp",
    timeout: 5000,
    rateLimitEnabled: false,
  },
};

module.exports = config[process.env.NODE_ENV || "development"];
```

### Dynamic Token Management

```javascript
class DynamicTokenManager {
  constructor() {
    this.tokenCache = new Map();
    this.refreshTokens = new Map();
  }

  async getValidToken(userId) {
    let token = this.tokenCache.get(userId);

    if (!token || this.isTokenExpired(token)) {
      token = await this.refreshToken(userId);
      this.tokenCache.set(userId, token);
    }

    return token;
  }

  async refreshToken(userId) {
    const refreshToken = this.refreshTokens.get(userId);
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    // Call your token refresh endpoint
    const response = await axios.post("/auth/refresh", {
      refreshToken,
      userId,
    });

    return response.data.accessToken;
  }

  isTokenExpired(token) {
    // Implement token expiry check
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
```

## 📊 Monitoring & Logging

### Authentication Logging

```javascript
const winston = require("winston");

const authLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/whatsapp-auth.log" }),
  ],
});

function logAuthEvent(event, userId, details = {}) {
  authLogger.info({
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

// Usage
logAuthEvent("token_validated", userId, { endpoint: "/send" });
logAuthEvent("auth_failed", userId, { reason: "invalid_token", ip: req.ip });
```

### Performance Monitoring

```javascript
// Track API call performance
class WhatsAppMetrics {
  constructor() {
    this.metrics = {
      calls: 0,
      errors: 0,
      avgResponseTime: 0,
      authFailures: 0,
    };
  }

  recordCall(duration, success = true) {
    this.metrics.calls++;
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * (this.metrics.calls - 1) + duration) /
      this.metrics.calls;

    if (!success) {
      this.metrics.errors++;
    }
  }

  recordAuthFailure() {
    this.metrics.authFailures++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      errorRate: (this.metrics.errors / this.metrics.calls) * 100,
      authFailureRate: (this.metrics.authFailures / this.metrics.calls) * 100,
    };
  }
}
```

---

## 🔍 Testing Authentication

### Unit Tests

```javascript
const { WhatsAppAuthService } = require("../services/whatsapp-auth");

describe("WhatsApp Authentication", () => {
  let authService;

  beforeEach(() => {
    authService = new WhatsAppAuthService(
      "test_token",
      "http://localhost:3001/api/whatsapp"
    );
  });

  test("should validate correct API token", async () => {
    const isValid = await authService.validateToken();
    expect(isValid).toBe(true);
  });

  test("should reject invalid API token", async () => {
    authService = new WhatsAppAuthService(
      "invalid_token",
      "http://localhost:3001/api/whatsapp"
    );

    await expect(authService.validateToken()).rejects.toThrow(
      "Invalid API token"
    );
  });

  test("should handle network errors gracefully", async () => {
    authService = new WhatsAppAuthService("test_token", "http://invalid-url");

    await expect(authService.validateToken()).rejects.toThrow();
  });
});
```

### Integration Tests

```javascript
describe("WhatsApp API Integration", () => {
  test("should authenticate and send message", async () => {
    const whatsapp = new WhatsAppService(
      process.env.TEST_API_TOKEN,
      "test_user_123"
    );

    const devices = await whatsapp.getUserDevices();
    expect(devices.success).toBe(true);

    if (devices.data.length > 0) {
      const result = await whatsapp.sendMessage(
        devices.data[0].sessionId,
        "+1234567890",
        "Test message"
      );
      expect(result.success).toBe(true);
    }
  });
});
```

---

This authentication guide provides comprehensive coverage of all authentication methods and integration patterns for the WhatsApp API. Use this as a reference when implementing authentication in your Node.js projects.
