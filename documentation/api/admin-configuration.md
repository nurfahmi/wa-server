# Admin & Configuration API

Complete guide for administrative functions, AI provider management, business templates, and system configuration for WhatsApp API integration.

## 📋 Overview

The Admin & Configuration API provides comprehensive administrative functionality including AI provider management, business template configuration, user management, and system settings. This module is designed for administrators and power users.

### Key Features

- **AI Provider Management**: Configure OpenAI, Claude, and other AI services
- **Business Templates**: Manage industry-specific message templates
- **User Management**: Admin functions for user accounts and permissions
- **System Configuration**: Global settings and feature toggles
- **Usage Monitoring**: Track AI usage and costs
- **Template Library**: Comprehensive business template management

## 🔧 Base Configuration

```javascript
// Admin service setup
const axios = require("axios");

class AdminService {
  constructor(apiToken, baseURL) {
    this.client = axios.create({
      baseURL,
      headers: {
        "X-API-TOKEN": apiToken,
        "Content-Type": "application/json",
      },
    });
  }
}

// Usage
const adminService = new AdminService(
  process.env.WHATSAPP_API_TOKEN,
  process.env.WHATSAPP_API_BASE_URL
);
```

---

## 🤖 AI Provider Management

### Get AI Providers

**Endpoint:** `GET /api/admin/ai-providers`

**Description:** Retrieves all configured AI providers and their settings.

```javascript
// Get all AI providers
async function getAIProviders() {
  const response = await adminService.client.get("/admin/ai-providers");
  return response.data;
}

// Usage
const providers = await getAIProviders();
console.log("Available providers:", providers.data.length);
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "OpenAI",
      "provider": "openai",
      "isActive": true,
      "apiKey": "sk-***...***",
      "models": [
        {
          "name": "gpt-3.5-turbo",
          "displayName": "GPT-3.5 Turbo",
          "maxTokens": 4096,
          "costPer1kTokens": 0.002,
          "isDefault": true
        },
        {
          "name": "gpt-4",
          "displayName": "GPT-4",
          "maxTokens": 8192,
          "costPer1kTokens": 0.03,
          "isDefault": false
        }
      ],
      "settings": {
        "temperature": 0.7,
        "maxTokens": 150,
        "timeout": 30000
      },
      "usage": {
        "totalRequests": 1250,
        "totalTokens": 125000,
        "totalCost": 12.5,
        "lastUsed": "2025-06-19T12:00:00.000Z"
      },
      "createdAt": "2025-06-01T10:00:00.000Z",
      "updatedAt": "2025-06-19T12:00:00.000Z"
    }
  ]
}
```

### Create AI Provider

**Endpoint:** `POST /api/admin/ai-providers`

**Description:** Adds a new AI provider configuration.

```javascript
// Create new AI provider
async function createAIProvider(providerData) {
  const response = await adminService.client.post(
    "/admin/ai-providers",
    providerData
  );
  return response.data;
}

// Usage examples
const openaiProvider = await createAIProvider({
  name: "OpenAI Production",
  provider: "openai",
  apiKey: "sk-your-openai-api-key",
  isActive: true,
  models: [
    {
      name: "gpt-3.5-turbo",
      displayName: "GPT-3.5 Turbo",
      maxTokens: 4096,
      costPer1kTokens: 0.002,
      isDefault: true,
    },
  ],
  settings: {
    temperature: 0.7,
    maxTokens: 150,
    timeout: 30000,
  },
});

const claudeProvider = await createAIProvider({
  name: "Anthropic Claude",
  provider: "anthropic",
  apiKey: "your-anthropic-api-key",
  isActive: true,
  models: [
    {
      name: "claude-3-sonnet",
      displayName: "Claude 3 Sonnet",
      maxTokens: 200000,
      costPer1kTokens: 0.003,
      isDefault: true,
    },
  ],
  settings: {
    temperature: 0.3,
    maxTokens: 200,
    timeout: 45000,
  },
});
```

### Update AI Provider

**Endpoint:** `PUT /api/admin/ai-providers/{providerId}`

**Description:** Updates AI provider configuration and settings.

```javascript
// Update AI provider
async function updateAIProvider(providerId, updates) {
  const response = await adminService.client.put(
    `/admin/ai-providers/${providerId}`,
    updates
  );
  return response.data;
}

// Usage examples
await updateAIProvider(1, {
  isActive: false,
});

await updateAIProvider(1, {
  settings: {
    temperature: 0.3,
    maxTokens: 200,
    timeout: 45000,
  },
});

await updateAIProvider(1, {
  models: [
    {
      name: "gpt-4-turbo",
      displayName: "GPT-4 Turbo",
      maxTokens: 128000,
      costPer1kTokens: 0.01,
      isDefault: true,
    },
  ],
});
```

### Test AI Provider

**Endpoint:** `POST /api/admin/ai-providers/{providerId}/test`

**Description:** Tests AI provider connectivity and functionality.

```javascript
// Test AI provider
async function testAIProvider(
  providerId,
  testMessage = "Hello, this is a test message."
) {
  const response = await adminService.client.post(
    `/admin/ai-providers/${providerId}/test`,
    {
      message: testMessage,
    }
  );
  return response.data;
}

// Usage
const testResult = await testAIProvider(
  1,
  "Generate a professional greeting message."
);
console.log("Test response:", testResult.data.response);
```

**Response:**

```json
{
  "success": true,
  "data": {
    "providerId": 1,
    "testMessage": "Generate a professional greeting message.",
    "response": "Hello! Thank you for contacting us. How may I assist you today?",
    "responseTime": 1250,
    "tokensUsed": 45,
    "cost": 0.00009,
    "model": "gpt-3.5-turbo",
    "timestamp": "2025-06-19T12:00:00.000Z"
  }
}
```

---

## 📊 AI Usage Tracking

### Get AI Usage Statistics

**Endpoint:** `GET /api/admin/ai-usage`

**Description:** Retrieves comprehensive AI usage statistics.

```javascript
// Get AI usage statistics
async function getAIUsage(options = {}) {
  const {
    dateFrom = null,
    dateTo = null,
    providerId = null,
    userId = null,
    groupBy = "day",
  } = options;

  const params = { groupBy };
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  if (providerId) params.providerId = providerId;
  if (userId) params.userId = userId;

  const response = await adminService.client.get("/admin/ai-usage", { params });
  return response.data;
}

// Usage examples
const overallUsage = await getAIUsage();
const monthlyUsage = await getAIUsage({
  dateFrom: "2025-06-01",
  dateTo: "2025-06-30",
  groupBy: "day",
});
const userUsage = await getAIUsage({ userId: "user123" });
```

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRequests": 5420,
      "totalTokens": 542000,
      "totalCost": 54.2,
      "averageResponseTime": 1350,
      "successRate": 98.5
    },
    "byProvider": [
      {
        "providerId": 1,
        "providerName": "OpenAI",
        "requests": 4200,
        "tokens": 420000,
        "cost": 42.0,
        "successRate": 99.1
      },
      {
        "providerId": 2,
        "providerName": "Anthropic Claude",
        "requests": 1220,
        "tokens": 122000,
        "cost": 12.2,
        "successRate": 97.2
      }
    ],
    "byModel": [
      {
        "model": "gpt-3.5-turbo",
        "requests": 3800,
        "tokens": 380000,
        "cost": 38.0
      },
      {
        "model": "gpt-4",
        "requests": 400,
        "tokens": 40000,
        "cost": 4.0
      }
    ],
    "trends": [
      {
        "date": "2025-06-19",
        "requests": 250,
        "tokens": 25000,
        "cost": 2.5
      }
    ],
    "topUsers": [
      {
        "userId": "user123",
        "requests": 850,
        "cost": 8.5
      }
    ]
  }
}
```

### Set AI Usage Limits

**Endpoint:** `POST /api/admin/ai-usage/limits`

**Description:** Configures usage limits and cost controls.

```javascript
// Set AI usage limits
async function setAIUsageLimits(limits) {
  const response = await adminService.client.post(
    "/admin/ai-usage/limits",
    limits
  );
  return response.data;
}

// Usage
await setAIUsageLimits({
  global: {
    dailyCostLimit: 100.0,
    monthlyCostLimit: 2000.0,
    dailyRequestLimit: 10000,
    monthlyRequestLimit: 200000,
  },
  perUser: {
    dailyCostLimit: 10.0,
    monthlyCostLimit: 200.0,
    dailyRequestLimit: 1000,
    monthlyRequestLimit: 20000,
  },
  perProvider: {
    1: {
      // OpenAI
      dailyCostLimit: 80.0,
      monthlyCostLimit: 1600.0,
    },
    2: {
      // Claude
      dailyCostLimit: 20.0,
      monthlyCostLimit: 400.0,
    },
  },
  alertThresholds: {
    costWarning: 0.8, // 80% of limit
    costCritical: 0.95, // 95% of limit
    requestWarning: 0.8,
    requestCritical: 0.95,
  },
});
```

---

## 📝 Business Template Management

### Get Business Templates

**Endpoint:** `GET /api/admin/business-templates`

**Description:** Retrieves business templates by category or industry.

```javascript
// Get business templates
async function getBusinessTemplates(options = {}) {
  const {
    category = null,
    industry = null,
    language = null,
    isActive = null,
  } = options;

  const params = {};
  if (category) params.category = category;
  if (industry) params.industry = industry;
  if (language) params.language = language;
  if (isActive !== null) params.isActive = isActive;

  const response = await adminService.client.get("/admin/business-templates", {
    params,
  });
  return response.data;
}

// Usage examples
const allTemplates = await getBusinessTemplates();
const greetingTemplates = await getBusinessTemplates({ category: "greeting" });
const ecommerceTemplates = await getBusinessTemplates({
  industry: "ecommerce",
});
const indonesianTemplates = await getBusinessTemplates({ language: "id" });
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "E-commerce Welcome",
      "category": "greeting",
      "industry": "ecommerce",
      "language": "en",
      "template": "Welcome to {{businessName}}! 🛍️\n\nThank you for your interest in our products. How can we help you today?\n\n• Browse our catalog\n• Track your order\n• Customer support\n\nReply with your choice or ask any questions!",
      "variables": ["businessName"],
      "tags": ["welcome", "ecommerce", "greeting"],
      "usage": {
        "timesUsed": 450,
        "lastUsed": "2025-06-19T11:30:00.000Z"
      },
      "isActive": true,
      "createdAt": "2025-06-01T10:00:00.000Z"
    }
  ]
}
```

### Create Business Template

**Endpoint:** `POST /api/admin/business-templates`

**Description:** Creates a new business template.

```javascript
// Create business template
async function createBusinessTemplate(templateData) {
  const response = await adminService.client.post(
    "/admin/business-templates",
    templateData
  );
  return response.data;
}

// Usage examples
const welcomeTemplate = await createBusinessTemplate({
  name: "Restaurant Welcome",
  category: "greeting",
  industry: "restaurant",
  language: "en",
  template: `Welcome to {{restaurantName}}! 🍽️

Thank you for contacting us. We're here to help with:

• Table reservations
• Menu inquiries  
• Takeaway orders
• Special dietary requirements

What can we assist you with today?`,
  variables: ["restaurantName"],
  tags: ["welcome", "restaurant", "greeting"],
  isActive: true,
});

const orderConfirmation = await createBusinessTemplate({
  name: "Order Confirmation",
  category: "confirmation",
  industry: "ecommerce",
  language: "en",
  template: `Order Confirmed! ✅

Hi {{customerName}},

Your order #{{orderNumber}} has been confirmed.

📦 Items: {{itemCount}} items
💰 Total: ${{ totalAmount }}
🚚 Delivery: {{deliveryDate}}

Track your order: {{trackingUrl}}

Thank you for shopping with {{businessName}}!`,
  variables: [
    "customerName",
    "orderNumber",
    "itemCount",
    "totalAmount",
    "deliveryDate",
    "trackingUrl",
    "businessName",
  ],
  tags: ["confirmation", "order", "ecommerce"],
  isActive: true,
});
```

### Update Business Template

**Endpoint:** `PUT /api/admin/business-templates/{templateId}`

**Description:** Updates an existing business template.

```javascript
// Update business template
async function updateBusinessTemplate(templateId, updates) {
  const response = await adminService.client.put(
    `/admin/business-templates/${templateId}`,
    updates
  );
  return response.data;
}

// Usage
await updateBusinessTemplate(1, {
  template: `Welcome to {{businessName}}! 🛍️

Thank you for your interest in our products. We're excited to help you find what you need!

How can we assist you today?
• 🛒 Browse our catalog
• 📦 Track your order  
• 💬 Customer support
• 🎁 Special offers

Reply with your choice or ask any questions!`,
  tags: ["welcome", "ecommerce", "greeting", "updated"],
});
```

### Bulk Import Templates

**Endpoint:** `POST /api/admin/business-templates/bulk-import`

**Description:** Imports multiple templates from a file or data array.

```javascript
// Bulk import templates
async function bulkImportTemplates(templates) {
  const response = await adminService.client.post(
    "/admin/business-templates/bulk-import",
    {
      templates: templates,
    }
  );
  return response.data;
}

// Usage
const templateData = [
  {
    name: "Healthcare Appointment Reminder",
    category: "reminder",
    industry: "healthcare",
    language: "en",
    template:
      "Reminder: You have an appointment with Dr. {{doctorName}} on {{appointmentDate}} at {{appointmentTime}}. Please arrive 15 minutes early.",
    variables: ["doctorName", "appointmentDate", "appointmentTime"],
  },
  {
    name: "Real Estate Property Inquiry",
    category: "inquiry_response",
    industry: "real_estate",
    language: "en",
    template:
      "Thank you for your interest in {{propertyAddress}}! This {{propertyType}} is available for {{listingType}} at ${{price}}. Would you like to schedule a viewing?",
    variables: ["propertyAddress", "propertyType", "listingType", "price"],
  },
];

const importResult = await bulkImportTemplates(templateData);
console.log("Imported templates:", importResult.data.imported);
```

---

## 👥 User Management

### Get Users

**Endpoint:** `GET /api/admin/users`

**Description:** Retrieves user accounts with filtering and pagination.

```javascript
// Get users
async function getUsers(options = {}) {
  const {
    limit = 50,
    offset = 0,
    search = "",
    role = null,
    isActive = null,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const params = { limit, offset, sortBy, sortOrder };
  if (search) params.search = search;
  if (role) params.role = role;
  if (isActive !== null) params.isActive = isActive;

  const response = await adminService.client.get("/admin/users", { params });
  return response.data;
}

// Usage
const allUsers = await getUsers();
const adminUsers = await getUsers({ role: "admin" });
const activeUsers = await getUsers({ isActive: true });
```

### Create User

**Endpoint:** `POST /api/admin/users`

**Description:** Creates a new user account.

```javascript
// Create user
async function createUser(userData) {
  const response = await adminService.client.post("/admin/users", userData);
  return response.data;
}

// Usage
const newUser = await createUser({
  email: "user@example.com",
  name: "John Doe",
  role: "user",
  permissions: ["send_messages", "manage_files", "view_analytics"],
  quotas: {
    dailyMessages: 1000,
    monthlyMessages: 30000,
    storageGB: 10,
    aiRequests: 500,
  },
  isActive: true,
});
```

### Update User

**Endpoint:** `PUT /api/admin/users/{userId}`

**Description:** Updates user account and permissions.

```javascript
// Update user
async function updateUser(userId, updates) {
  const response = await adminService.client.put(
    `/admin/users/${userId}`,
    updates
  );
  return response.data;
}

// Usage examples
await updateUser("user123", {
  role: "premium",
  quotas: {
    dailyMessages: 5000,
    monthlyMessages: 150000,
    storageGB: 50,
    aiRequests: 2000,
  },
});

await updateUser("user123", {
  permissions: [
    "send_messages",
    "manage_files",
    "view_analytics",
    "use_ai",
    "bulk_messaging",
  ],
});
```

---

## ⚙️ System Configuration

### Get System Settings

**Endpoint:** `GET /api/admin/settings`

**Description:** Retrieves global system configuration.

```javascript
// Get system settings
async function getSystemSettings() {
  const response = await adminService.client.get("/admin/settings");
  return response.data;
}

// Usage
const settings = await getSystemSettings();
console.log("System configuration:", settings.data);
```

**Response:**

```json
{
  "success": true,
  "data": {
    "general": {
      "systemName": "WhatsApp Business API",
      "version": "1.0.0",
      "timezone": "Asia/Jakarta",
      "language": "en",
      "maintenanceMode": false
    },
    "messaging": {
      "defaultRateLimit": 60,
      "maxFileSize": 104857600,
      "allowedFileTypes": ["image", "video", "document", "audio"],
      "autoRetryFailed": true,
      "maxRetryAttempts": 3
    },
    "ai": {
      "defaultProvider": "openai",
      "enableAI": true,
      "maxTokensPerRequest": 150,
      "defaultTemperature": 0.7,
      "costTrackingEnabled": true
    },
    "storage": {
      "defaultQuotaGB": 10,
      "maxQuotaGB": 1000,
      "fileRetentionDays": 90,
      "autoCleanup": true
    },
    "security": {
      "requireApiToken": true,
      "enableRateLimit": true,
      "maxLoginAttempts": 5,
      "sessionTimeout": 3600
    },
    "notifications": {
      "emailAlerts": true,
      "webhookAlerts": true,
      "slackIntegration": false
    }
  }
}
```

### Update System Settings

**Endpoint:** `PUT /api/admin/settings`

**Description:** Updates global system configuration.

```javascript
// Update system settings
async function updateSystemSettings(settings) {
  const response = await adminService.client.put("/admin/settings", settings);
  return response.data;
}

// Usage examples
await updateSystemSettings({
  messaging: {
    defaultRateLimit: 120,
    maxFileSize: 209715200, // 200MB
    autoRetryFailed: true,
    maxRetryAttempts: 5,
  },
});

await updateSystemSettings({
  ai: {
    defaultProvider: "anthropic",
    enableAI: true,
    maxTokensPerRequest: 200,
    defaultTemperature: 0.3,
  },
});

await updateSystemSettings({
  security: {
    requireApiToken: true,
    enableRateLimit: true,
    maxLoginAttempts: 3,
    sessionTimeout: 7200,
  },
});
```

---

## 📊 System Monitoring & Health

### Get System Health

**Endpoint:** `GET /api/admin/health`

**Description:** Retrieves comprehensive system health status.

```javascript
// Get system health
async function getSystemHealth() {
  const response = await adminService.client.get("/admin/health");
  return response.data;
}

// Usage
const health = await getSystemHealth();
console.log("System status:", health.data.status);
```

### Get Audit Logs

**Endpoint:** `GET /api/admin/audit-logs`

**Description:** Retrieves system audit logs.

```javascript
// Get audit logs
async function getAuditLogs(options = {}) {
  const {
    limit = 100,
    offset = 0,
    action = null,
    userId = null,
    dateFrom = null,
    dateTo = null,
  } = options;

  const params = { limit, offset };
  if (action) params.action = action;
  if (userId) params.userId = userId;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const response = await adminService.client.get("/admin/audit-logs", {
    params,
  });
  return response.data;
}

// Usage
const auditLogs = await getAuditLogs({ limit: 50 });
const userActions = await getAuditLogs({ userId: "user123" });
const settingsChanges = await getAuditLogs({ action: "settings_update" });
```

---

## 🔧 Advanced Administration

### Complete Admin Dashboard Service

```javascript
// Comprehensive admin dashboard service
class AdminDashboardService {
  constructor(adminService) {
    this.adminService = adminService;
  }

  async getDashboardData() {
    try {
      const [systemHealth, userStats, aiUsage, templateStats, auditLogs] =
        await Promise.all([
          this.adminService.getSystemHealth(),
          this.getUserStatistics(),
          this.adminService.getAIUsage({ groupBy: "day" }),
          this.getTemplateStatistics(),
          this.adminService.getAuditLogs({ limit: 10 }),
        ]);

      return {
        timestamp: new Date().toISOString(),
        system: {
          status: systemHealth.data.status,
          uptime: systemHealth.data.uptime,
          version: systemHealth.data.version,
          performance: systemHealth.data.performance,
        },
        users: {
          total: userStats.total,
          active: userStats.active,
          newToday: userStats.newToday,
        },
        ai: {
          totalRequests: aiUsage.data.summary.totalRequests,
          totalCost: aiUsage.data.summary.totalCost,
          successRate: aiUsage.data.summary.successRate,
        },
        templates: {
          total: templateStats.total,
          mostUsed: templateStats.mostUsed,
          recentlyAdded: templateStats.recentlyAdded,
        },
        recentActivity: auditLogs.data.slice(0, 5),
      };
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      return null;
    }
  }

  async getUserStatistics() {
    const users = await this.adminService.getUsers({ limit: 1000 });
    const today = new Date().toISOString().split("T")[0];

    return {
      total: users.data.length,
      active: users.data.filter((u) => u.isActive).length,
      newToday: users.data.filter((u) => u.createdAt.startsWith(today)).length,
    };
  }

  async getTemplateStatistics() {
    const templates = await this.adminService.getBusinessTemplates();

    return {
      total: templates.data.length,
      mostUsed: templates.data
        .sort((a, b) => (b.usage?.timesUsed || 0) - (a.usage?.timesUsed || 0))
        .slice(0, 5),
      recentlyAdded: templates.data
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3),
    };
  }

  async generateSystemReport(dateFrom, dateTo) {
    const [aiUsage, userActivity, systemPerformance, errorLogs] =
      await Promise.all([
        this.adminService.getAIUsage({ dateFrom, dateTo }),
        this.getUserActivity(dateFrom, dateTo),
        this.getSystemPerformance(dateFrom, dateTo),
        this.getErrorLogs(dateFrom, dateTo),
      ]);

    return {
      period: { from: dateFrom, to: dateTo },
      summary: {
        totalAIRequests: aiUsage.data.summary.totalRequests,
        totalAICost: aiUsage.data.summary.totalCost,
        activeUsers: userActivity.activeUsers,
        totalMessages: userActivity.totalMessages,
        averageResponseTime: systemPerformance.averageResponseTime,
        errorRate: errorLogs.errorRate,
      },
      trends: {
        aiUsage: aiUsage.data.trends,
        userActivity: userActivity.trends,
        performance: systemPerformance.trends,
      },
      recommendations: this.generateRecommendations({
        aiUsage: aiUsage.data,
        userActivity,
        systemPerformance,
        errorLogs,
      }),
    };
  }

  generateRecommendations(data) {
    const recommendations = [];

    // AI cost recommendations
    if (data.aiUsage.summary.totalCost > 1000) {
      recommendations.push({
        type: "cost_optimization",
        priority: "medium",
        message:
          "AI costs are high. Consider implementing usage limits or optimizing prompts.",
        action: "Review AI usage patterns and set cost alerts",
      });
    }

    // Performance recommendations
    if (data.systemPerformance.averageResponseTime > 2000) {
      recommendations.push({
        type: "performance",
        priority: "high",
        message: "System response time is slow. Consider scaling resources.",
        action:
          "Investigate performance bottlenecks and optimize database queries",
      });
    }

    // Error rate recommendations
    if (data.errorLogs.errorRate > 5) {
      recommendations.push({
        type: "reliability",
        priority: "high",
        message: "Error rate is above acceptable threshold.",
        action: "Review error logs and implement additional error handling",
      });
    }

    return recommendations;
  }
}

// Usage
const adminDashboard = new AdminDashboardService(adminService);

// Get dashboard data
const dashboardData = await adminDashboard.getDashboardData();
console.log("Admin dashboard:", dashboardData);

// Generate system report
const report = await adminDashboard.generateSystemReport(
  "2025-06-01",
  "2025-06-19"
);
console.log("System report:", report);
```

---

## 🔐 Security & Permissions

### Permission Management

```javascript
// Permission management helper
class PermissionManager {
  constructor(adminService) {
    this.adminService = adminService;
    this.permissions = {
      send_messages: "Send WhatsApp messages",
      manage_files: "Upload and manage files",
      view_analytics: "View analytics and reports",
      use_ai: "Use AI-powered features",
      bulk_messaging: "Send bulk messages",
      manage_contacts: "Manage contacts and groups",
      admin_users: "Manage user accounts",
      admin_settings: "Modify system settings",
      admin_templates: "Manage business templates",
      admin_ai: "Manage AI providers",
    };
  }

  async getUserPermissions(userId) {
    const user = await this.adminService.getUsers({ search: userId });
    return user.data[0]?.permissions || [];
  }

  async grantPermissions(userId, permissions) {
    const currentPermissions = await this.getUserPermissions(userId);
    const newPermissions = [
      ...new Set([...currentPermissions, ...permissions]),
    ];

    return await this.adminService.updateUser(userId, {
      permissions: newPermissions,
    });
  }

  async revokePermissions(userId, permissions) {
    const currentPermissions = await this.getUserPermissions(userId);
    const newPermissions = currentPermissions.filter(
      (p) => !permissions.includes(p)
    );

    return await this.adminService.updateUser(userId, {
      permissions: newPermissions,
    });
  }

  async checkPermission(userId, permission) {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  getPermissionDescription(permission) {
    return this.permissions[permission] || "Unknown permission";
  }
}

// Usage
const permissionManager = new PermissionManager(adminService);

// Grant permissions
await permissionManager.grantPermissions("user123", [
  "use_ai",
  "bulk_messaging",
]);

// Check permission
const canUseAI = await permissionManager.checkPermission("user123", "use_ai");
console.log("User can use AI:", canUseAI);

// Revoke permissions
await permissionManager.revokePermissions("user123", ["admin_settings"]);
```

---

This admin and configuration documentation provides comprehensive coverage of all administrative functions. Use these patterns and examples to implement robust administrative capabilities in your WhatsApp API integration.
