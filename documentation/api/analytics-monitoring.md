# Analytics & Monitoring API

Complete guide for tracking message logs, performance metrics, usage statistics, and system monitoring for WhatsApp API integration.

## 📋 Overview

The Analytics & Monitoring API provides comprehensive insights into your WhatsApp messaging operations, including detailed message tracking, performance metrics, user statistics, and system health monitoring.

### Key Features

- **Message Logging**: Complete message history with status tracking
- **Performance Metrics**: Response times, success rates, error analysis
- **Usage Statistics**: User activity, device performance, file usage
- **Real-time Monitoring**: Live dashboards and alerts
- **Custom Reports**: Flexible reporting with date ranges and filters
- **Export Capabilities**: Data export for external analysis

## 🔧 Base Configuration

```javascript
// Analytics service setup
const axios = require("axios");

class AnalyticsService {
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
const analyticsService = new AnalyticsService(
  process.env.WHATSAPP_API_TOKEN,
  process.env.WHATSAPP_API_BASE_URL,
  req.user.id
);
```

---

## 📊 Message Analytics

### Get Message Logs

**Endpoint:** `GET /api/whatsapp/users/{userId}/messages`

**Description:** Retrieves comprehensive message history with filtering and pagination.

```javascript
// Get message logs with advanced filtering
async function getMessageLogs(options = {}) {
  const {
    limit = 50,
    offset = 0,
    status = null,
    type = null,
    dateFrom = null,
    dateTo = null,
    phoneNumber = null,
    deviceId = null,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const params = { limit, offset, sortBy, sortOrder };
  if (status) params.status = status;
  if (type) params.type = type;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  if (phoneNumber) params.phoneNumber = phoneNumber;
  if (deviceId) params.deviceId = deviceId;

  const response = await analyticsService.client.get(
    `/users/${analyticsService.userId}/messages`,
    { params }
  );

  return response.data;
}

// Usage examples
const recentMessages = await getMessageLogs({ limit: 20 });
const failedMessages = await getMessageLogs({ status: "failed", limit: 100 });
const todayMessages = await getMessageLogs({
  dateFrom: new Date().toISOString().split("T")[0],
  dateTo: new Date().toISOString().split("T")[0],
});
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "messageId": "msg_1234567890",
      "whatsappMessageId": "3EB0C767D26A1B4F8A35",
      "userId": "user123",
      "sessionId": "user_user123_device_business",
      "phoneNumber": "+1234567890",
      "message": "Hello! How can I help you?",
      "type": "text",
      "status": "sent",
      "createdAt": "2025-06-19T12:00:00.000Z",
      "sentAt": "2025-06-19T12:00:01.000Z",
      "deliveredAt": "2025-06-19T12:00:05.000Z",
      "readAt": null,
      "errorMessage": null,
      "originalMessageId": null,
      "fileId": null,
      "caption": null,
      "filename": null
    }
  ],
  "pagination": {
    "total": 1250,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### Get Message Statistics

**Endpoint:** `GET /api/whatsapp/users/{userId}/messages/stats`

**Description:** Retrieves message statistics with time-based breakdown.

```javascript
// Get message statistics
async function getMessageStats(
  dateFrom = null,
  dateTo = null,
  groupBy = "day"
) {
  const params = { groupBy };
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const response = await analyticsService.client.get(
    `/users/${analyticsService.userId}/messages/stats`,
    { params }
  );

  return response.data;
}

// Usage examples
const dailyStats = await getMessageStats("2025-06-01", "2025-06-19", "day");
const hourlyStats = await getMessageStats("2025-06-19", "2025-06-19", "hour");
const monthlyStats = await getMessageStats("2025-01-01", "2025-12-31", "month");
```

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalMessages": 1250,
      "sentMessages": 1180,
      "failedMessages": 45,
      "pendingMessages": 25,
      "successRate": 94.4,
      "averagePerDay": 18.5
    },
    "breakdown": [
      {
        "period": "2025-06-19",
        "totalMessages": 25,
        "sent": 23,
        "failed": 1,
        "pending": 1,
        "successRate": 92.0
      }
    ],
    "byType": {
      "text": { "count": 800, "successRate": 95.2 },
      "image": { "count": 300, "successRate": 93.1 },
      "video": { "count": 100, "successRate": 91.5 },
      "document": { "count": 50, "successRate": 96.0 }
    },
    "byDevice": [
      {
        "deviceId": "device1",
        "alias": "Business Main",
        "messages": 650,
        "successRate": 94.8
      }
    ]
  }
}
```

### Get Sending Performance

**Endpoint:** `GET /api/whatsapp/users/{userId}/messages/performance`

**Description:** Retrieves detailed performance metrics for message sending.

```javascript
// Get sending performance metrics
async function getSendingPerformance(timeframe = "24h") {
  const response = await analyticsService.client.get(
    `/users/${analyticsService.userId}/messages/performance`,
    { params: { timeframe } }
  );

  return response.data;
}

// Usage
const performance = await getSendingPerformance("7d");
console.log("Average response time:", performance.data.averageResponseTime);
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timeframe": "7d",
    "averageResponseTime": 1250,
    "medianResponseTime": 980,
    "p95ResponseTime": 2500,
    "p99ResponseTime": 4200,
    "throughput": {
      "messagesPerMinute": 12.5,
      "messagesPerHour": 750,
      "messagesPerDay": 18000
    },
    "errorRates": {
      "networkErrors": 2.1,
      "authenticationErrors": 0.3,
      "rateLimitErrors": 1.2,
      "validationErrors": 0.8
    },
    "trends": [
      {
        "timestamp": "2025-06-19T12:00:00.000Z",
        "responseTime": 1100,
        "successRate": 94.5,
        "throughput": 13.2
      }
    ]
  }
}
```

---

## 📈 Usage Analytics

### Get User Activity

**Endpoint:** `GET /api/whatsapp/users/{userId}/activity`

**Description:** Retrieves comprehensive user activity analytics.

```javascript
// Get user activity analytics
async function getUserActivity(dateFrom = null, dateTo = null) {
  const params = {};
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const response = await analyticsService.client.get(
    `/users/${analyticsService.userId}/activity`,
    { params }
  );

  return response.data;
}

// Usage
const activity = await getUserActivity("2025-06-01", "2025-06-19");
console.log("Active days:", activity.data.activeDays);
```

**Response:**

```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "period": {
      "from": "2025-06-01T00:00:00.000Z",
      "to": "2025-06-19T23:59:59.999Z"
    },
    "summary": {
      "activeDays": 15,
      "totalSessions": 45,
      "averageSessionDuration": 1800,
      "totalMessages": 1250,
      "totalFilesUploaded": 89,
      "totalDevices": 3
    },
    "dailyActivity": [
      {
        "date": "2025-06-19",
        "sessions": 3,
        "messages": 25,
        "filesUploaded": 2,
        "timeSpent": 2400
      }
    ],
    "peakHours": [
      { "hour": 9, "activity": 85 },
      { "hour": 14, "activity": 92 },
      { "hour": 16, "activity": 78 }
    ],
    "deviceUsage": [
      {
        "deviceId": "device1",
        "alias": "Business Main",
        "usage": 65.2,
        "messages": 815,
        "lastUsed": "2025-06-19T16:30:00.000Z"
      }
    ]
  }
}
```

### Get Device Performance

**Endpoint:** `GET /api/whatsapp/users/{userId}/devices/performance`

**Description:** Retrieves performance metrics for all user devices.

```javascript
// Get device performance metrics
async function getDevicePerformance(timeframe = "7d") {
  const response = await analyticsService.client.get(
    `/users/${analyticsService.userId}/devices/performance`,
    { params: { timeframe } }
  );

  return response.data;
}

// Usage
const devicePerf = await getDevicePerformance("30d");
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timeframe": "7d",
    "devices": [
      {
        "deviceId": "device1",
        "alias": "Business Main",
        "status": "connected",
        "uptime": 98.5,
        "messagesSent": 450,
        "messagesReceived": 123,
        "successRate": 94.2,
        "averageResponseTime": 1100,
        "lastSeen": "2025-06-19T16:30:00.000Z",
        "errors": {
          "total": 12,
          "types": {
            "connection": 3,
            "timeout": 5,
            "rate_limit": 4
          }
        },
        "performance": {
          "peakMessagesPerHour": 25,
          "averageMessagesPerHour": 12,
          "busyHours": ["09:00", "14:00", "16:00"]
        }
      }
    ],
    "summary": {
      "totalDevices": 3,
      "connectedDevices": 2,
      "averageUptime": 96.7,
      "totalMessages": 1250,
      "overallSuccessRate": 94.4
    }
  }
}
```

---

## 📁 File Analytics

### Get File Usage Statistics

**Endpoint:** `GET /api/whatsapp/files/users/{userId}/analytics`

**Description:** Retrieves comprehensive file usage analytics.

```javascript
// Get file usage analytics
async function getFileAnalytics(dateFrom = null, dateTo = null) {
  const params = {};
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const response = await analyticsService.client.get(
    `/files/users/${analyticsService.userId}/analytics`,
    { params }
  );

  return response.data;
}

// Usage
const fileAnalytics = await getFileAnalytics("2025-06-01", "2025-06-19");
```

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalFiles": 150,
      "totalSize": 52428800,
      "totalDownloads": 450,
      "averageFileSize": 349525,
      "storageUsed": 4.9
    },
    "byType": {
      "image": {
        "count": 85,
        "size": 35651584,
        "downloads": 320,
        "averageSize": 419431
      },
      "video": {
        "count": 25,
        "size": 15728640,
        "downloads": 89,
        "averageSize": 629145
      },
      "document": {
        "count": 35,
        "size": 1048576,
        "downloads": 41,
        "averageSize": 29959
      },
      "audio": {
        "count": 5,
        "size": 0,
        "downloads": 0,
        "averageSize": 0
      }
    },
    "uploadTrends": [
      {
        "date": "2025-06-19",
        "uploads": 5,
        "totalSize": 2097152,
        "byType": {
          "image": 3,
          "video": 1,
          "document": 1
        }
      }
    ],
    "topFiles": [
      {
        "fileId": "file_popular_123",
        "originalName": "product_catalog.pdf",
        "downloads": 45,
        "lastDownloaded": "2025-06-19T15:30:00.000Z"
      }
    ],
    "storageQuota": {
      "used": 52428800,
      "limit": 1073741824,
      "percentage": 4.9,
      "remaining": 1021312224
    }
  }
}
```

---

## 🔍 System Monitoring

### Get System Health

**Endpoint:** `GET /api/whatsapp/system/health`

**Description:** Retrieves overall system health and performance metrics.

```javascript
// Get system health status
async function getSystemHealth() {
  const response = await analyticsService.client.get("/system/health");
  return response.data;
}

// Usage
const health = await getSystemHealth();
console.log("System status:", health.data.status);
```

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 2592000,
    "version": "1.0.0",
    "timestamp": "2025-06-19T16:30:00.000Z",
    "services": {
      "whatsapp": {
        "status": "healthy",
        "activeSessions": 25,
        "messageQueue": 12,
        "averageResponseTime": 1100
      },
      "database": {
        "status": "healthy",
        "connections": 15,
        "queryTime": 45,
        "storage": {
          "used": "2.1GB",
          "available": "45.8GB",
          "percentage": 4.4
        }
      },
      "fileStorage": {
        "status": "healthy",
        "totalFiles": 5420,
        "totalSize": "12.5GB",
        "availableSpace": "487.5GB"
      },
      "websocket": {
        "status": "healthy",
        "connections": 8,
        "messagesPerSecond": 2.3
      }
    },
    "performance": {
      "cpu": 15.2,
      "memory": 68.5,
      "disk": 4.4,
      "network": {
        "inbound": "125KB/s",
        "outbound": "89KB/s"
      }
    },
    "alerts": []
  }
}
```

### Get Server Statistics

**Endpoint:** `GET /api/whatsapp/server/stats`

**Description:** Retrieves detailed server performance statistics.

```javascript
// Get server statistics
async function getServerStats(timeframe = "1h") {
  const response = await analyticsService.client.get("/server/stats", {
    params: { timeframe },
  });

  return response.data;
}

// Usage
const serverStats = await getServerStats("24h");
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timeframe": "24h",
    "requests": {
      "total": 15420,
      "successful": 14850,
      "failed": 570,
      "averagePerHour": 642,
      "peakHour": {
        "hour": "14:00",
        "requests": 1250
      }
    },
    "endpoints": [
      {
        "path": "/send",
        "requests": 8500,
        "averageResponseTime": 1100,
        "successRate": 94.2
      },
      {
        "path": "/files/upload",
        "requests": 2100,
        "averageResponseTime": 2500,
        "successRate": 96.8
      }
    ],
    "errors": {
      "4xx": 380,
      "5xx": 190,
      "topErrors": [
        {
          "code": 400,
          "count": 120,
          "message": "Invalid request parameters"
        },
        {
          "code": 429,
          "count": 85,
          "message": "Rate limit exceeded"
        }
      ]
    },
    "performance": {
      "averageResponseTime": 1350,
      "medianResponseTime": 980,
      "p95ResponseTime": 3200,
      "slowestEndpoint": "/files/upload"
    }
  }
}
```

---

## 📋 Custom Reports

### Generate Custom Report

**Endpoint:** `POST /api/whatsapp/reports/generate`

**Description:** Generates custom reports with flexible parameters.

```javascript
// Generate custom report
async function generateCustomReport(reportConfig) {
  const response = await analyticsService.client.post(
    "/reports/generate",
    reportConfig
  );
  return response.data;
}

// Usage examples
const messageReport = await generateCustomReport({
  type: "messages",
  userId: analyticsService.userId,
  dateFrom: "2025-06-01",
  dateTo: "2025-06-19",
  groupBy: "day",
  metrics: ["count", "successRate", "averageResponseTime"],
  filters: {
    status: ["sent", "failed"],
    type: ["text", "image"],
  },
  format: "json",
});

const deviceReport = await generateCustomReport({
  type: "devices",
  userId: analyticsService.userId,
  dateFrom: "2025-06-01",
  dateTo: "2025-06-19",
  metrics: ["uptime", "messageCount", "errorRate"],
  includeDetails: true,
  format: "json",
});
```

### Export Report Data

**Endpoint:** `GET /api/whatsapp/reports/{reportId}/export`

**Description:** Exports report data in various formats.

```javascript
// Export report data
async function exportReport(reportId, format = "csv") {
  const response = await analyticsService.client.get(
    `/reports/${reportId}/export`,
    {
      params: { format },
      responseType: format === "csv" ? "stream" : "json",
    }
  );

  return response.data;
}

// Usage
const csvData = await exportReport("report_123", "csv");
const jsonData = await exportReport("report_123", "json");
const excelData = await exportReport("report_123", "xlsx");
```

---

## 🔔 Alerts & Notifications

### Set Up Monitoring Alerts

```javascript
// Alert management system
class AlertManager {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
    this.alerts = new Map();
    this.thresholds = {
      errorRate: 5.0, // 5% error rate
      responseTime: 3000, // 3 seconds
      messageVolume: 1000, // messages per hour
      diskUsage: 80.0, // 80% disk usage
      deviceDowntime: 300, // 5 minutes
    };
  }

  async checkAlerts() {
    const alerts = [];

    // Check message error rate
    const messageStats = await this.analyticsService.getMessageStats();
    const errorRate =
      (messageStats.data.summary.failedMessages /
        messageStats.data.summary.totalMessages) *
      100;

    if (errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: "HIGH_ERROR_RATE",
        severity: "warning",
        message: `Message error rate is ${errorRate.toFixed(1)}%`,
        threshold: this.thresholds.errorRate,
        currentValue: errorRate,
      });
    }

    // Check response time
    const performance = await this.analyticsService.getSendingPerformance();
    if (performance.data.averageResponseTime > this.thresholds.responseTime) {
      alerts.push({
        type: "SLOW_RESPONSE",
        severity: "warning",
        message: `Average response time is ${performance.data.averageResponseTime}ms`,
        threshold: this.thresholds.responseTime,
        currentValue: performance.data.averageResponseTime,
      });
    }

    // Check system health
    const health = await this.analyticsService.getSystemHealth();
    if (health.data.performance.disk > this.thresholds.diskUsage) {
      alerts.push({
        type: "HIGH_DISK_USAGE",
        severity: "critical",
        message: `Disk usage is ${health.data.performance.disk}%`,
        threshold: this.thresholds.diskUsage,
        currentValue: health.data.performance.disk,
      });
    }

    // Check device status
    const devicePerf = await this.analyticsService.getDevicePerformance();
    const downDevices = devicePerf.data.devices.filter(
      (d) => d.status !== "connected"
    );

    if (downDevices.length > 0) {
      alerts.push({
        type: "DEVICE_DOWN",
        severity: "critical",
        message: `${downDevices.length} device(s) are offline`,
        devices: downDevices.map((d) => ({ id: d.deviceId, alias: d.alias })),
      });
    }

    return alerts;
  }

  async sendAlert(alert) {
    // Implement your notification system here
    // Email, Slack, webhook, etc.
    console.log(`ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);

    // Example webhook notification
    if (process.env.ALERT_WEBHOOK_URL) {
      try {
        await axios.post(process.env.ALERT_WEBHOOK_URL, {
          text: `WhatsApp API Alert: ${alert.message}`,
          severity: alert.severity,
          timestamp: new Date().toISOString(),
          alert,
        });
      } catch (error) {
        console.error("Failed to send alert webhook:", error.message);
      }
    }
  }

  async runMonitoring() {
    try {
      const alerts = await this.checkAlerts();

      for (const alert of alerts) {
        // Check if we've already sent this alert recently
        const alertKey = `${alert.type}_${alert.severity}`;
        const lastSent = this.alerts.get(alertKey);
        const now = Date.now();

        // Only send alert if it hasn't been sent in the last hour
        if (!lastSent || now - lastSent > 3600000) {
          await this.sendAlert(alert);
          this.alerts.set(alertKey, now);
        }
      }

      return alerts;
    } catch (error) {
      console.error("Monitoring check failed:", error.message);
      return [];
    }
  }

  // Set up periodic monitoring
  startMonitoring(intervalMinutes = 5) {
    console.log(`Starting monitoring with ${intervalMinutes} minute intervals`);

    setInterval(async () => {
      await this.runMonitoring();
    }, intervalMinutes * 60 * 1000);

    // Run initial check
    this.runMonitoring();
  }
}

// Usage
const alertManager = new AlertManager(analyticsService);
alertManager.startMonitoring(5); // Check every 5 minutes
```

---

## 📊 Dashboard Integration

### Real-time Dashboard Data

```javascript
// Dashboard data aggregator
class DashboardService {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  async getDashboardData() {
    try {
      // Fetch all required data in parallel
      const [
        messageStats,
        performance,
        systemHealth,
        devicePerf,
        fileAnalytics,
        recentActivity,
      ] = await Promise.all([
        this.analyticsService.getMessageStats(null, null, "hour"),
        this.analyticsService.getSendingPerformance("24h"),
        this.analyticsService.getSystemHealth(),
        this.analyticsService.getDevicePerformance("24h"),
        this.analyticsService.getFileAnalytics(),
        this.analyticsService.getUserActivity(),
      ]);

      return {
        timestamp: new Date().toISOString(),
        overview: {
          totalMessages: messageStats.data.summary.totalMessages,
          successRate: messageStats.data.summary.successRate,
          activeDevices: devicePerf.data.summary.connectedDevices,
          systemStatus: systemHealth.data.status,
        },
        performance: {
          averageResponseTime: performance.data.averageResponseTime,
          throughput: performance.data.throughput.messagesPerHour,
          errorRate:
            (messageStats.data.summary.failedMessages /
              messageStats.data.summary.totalMessages) *
            100,
        },
        trends: {
          hourlyMessages: messageStats.data.breakdown.slice(-24),
          responseTimeTrend: performance.data.trends.slice(-24),
          deviceUptime: devicePerf.data.devices.map((d) => ({
            device: d.alias,
            uptime: d.uptime,
          })),
        },
        resources: {
          cpu: systemHealth.data.performance.cpu,
          memory: systemHealth.data.performance.memory,
          disk: systemHealth.data.performance.disk,
          storage: fileAnalytics.data.storageQuota.percentage,
        },
        alerts: await this.getActiveAlerts(),
      };
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error.message);
      return null;
    }
  }

  async getActiveAlerts() {
    // This would integrate with your alert system
    return [
      {
        type: "info",
        message: "System running normally",
        timestamp: new Date().toISOString(),
      },
    ];
  }

  // WebSocket endpoint for real-time updates
  setupRealtimeUpdates(ws) {
    const sendUpdate = async () => {
      const data = await this.getDashboardData();
      if (data && ws.readyState === 1) {
        // WebSocket.OPEN
        ws.send(
          JSON.stringify({
            type: "dashboard_update",
            data,
          })
        );
      }
    };

    // Send initial data
    sendUpdate();

    // Send updates every 30 seconds
    const interval = setInterval(sendUpdate, 30000);

    ws.on("close", () => {
      clearInterval(interval);
    });

    return interval;
  }
}

// Usage
const dashboardService = new DashboardService(analyticsService);

// Get dashboard data
const dashboardData = await dashboardService.getDashboardData();
console.log("Dashboard data:", dashboardData);

// Set up real-time updates (in your WebSocket handler)
// dashboardService.setupRealtimeUpdates(websocketConnection);
```

---

## 🔧 Advanced Analytics

### Predictive Analytics

```javascript
// Predictive analytics helper
class PredictiveAnalytics {
  constructor(analyticsService) {
    this.analyticsService = analyticsService;
  }

  async predictMessageVolume(days = 7) {
    const historicalData = await this.analyticsService.getMessageStats(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      new Date().toISOString().split("T")[0],
      "day"
    );

    const dailyVolumes = historicalData.data.breakdown.map(
      (d) => d.totalMessages
    );
    const trend = this.calculateTrend(dailyVolumes);
    const seasonality = this.calculateSeasonality(dailyVolumes);

    const predictions = [];
    for (let i = 1; i <= days; i++) {
      const baseVolume = dailyVolumes[dailyVolumes.length - 1];
      const trendAdjustment = trend * i;
      const seasonalAdjustment = seasonality[i % 7] || 1;

      const predicted = Math.round(
        (baseVolume + trendAdjustment) * seasonalAdjustment
      );

      predictions.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        predictedVolume: predicted,
        confidence: this.calculateConfidence(dailyVolumes, i),
      });
    }

    return predictions;
  }

  calculateTrend(data) {
    if (data.length < 2) return 0;

    const n = data.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = data.reduce((sum, y, x) => sum + (x + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  calculateSeasonality(data) {
    const dayOfWeek = {};
    data.forEach((volume, index) => {
      const day = index % 7;
      if (!dayOfWeek[day]) dayOfWeek[day] = [];
      dayOfWeek[day].push(volume);
    });

    const seasonality = {};
    const overallAverage = data.reduce((a, b) => a + b, 0) / data.length;

    for (const [day, volumes] of Object.entries(dayOfWeek)) {
      const dayAverage = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      seasonality[day] = dayAverage / overallAverage;
    }

    return seasonality;
  }

  calculateConfidence(data, daysAhead) {
    const variance = this.calculateVariance(data);
    const baseConfidence = 95;
    const confidenceDecay = Math.min(daysAhead * 2, 30);

    return Math.max(baseConfidence - confidenceDecay, 50);
  }

  calculateVariance(data) {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map((value) => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
  }

  async generateInsights() {
    const messageStats = await this.analyticsService.getMessageStats();
    const devicePerf = await this.analyticsService.getDevicePerformance();
    const predictions = await this.predictMessageVolume(7);

    const insights = [];

    // Volume insights
    const avgDaily = messageStats.data.summary.averagePerDay;
    const nextWeekAvg =
      predictions.reduce((sum, p) => sum + p.predictedVolume, 0) /
      predictions.length;

    if (nextWeekAvg > avgDaily * 1.2) {
      insights.push({
        type: "volume_increase",
        severity: "info",
        message: `Expected 20% increase in message volume next week`,
        recommendation: "Consider scaling up resources",
      });
    }

    // Performance insights
    const lowPerformingDevices = devicePerf.data.devices.filter(
      (d) => d.successRate < 90
    );
    if (lowPerformingDevices.length > 0) {
      insights.push({
        type: "performance_issue",
        severity: "warning",
        message: `${lowPerformingDevices.length} device(s) have success rate below 90%`,
        recommendation: "Review device configurations and connectivity",
      });
    }

    // Efficiency insights
    const errorRate =
      (messageStats.data.summary.failedMessages /
        messageStats.data.summary.totalMessages) *
      100;
    if (errorRate > 3) {
      insights.push({
        type: "high_error_rate",
        severity: "warning",
        message: `Error rate is ${errorRate.toFixed(1)}%, above recommended 3%`,
        recommendation:
          "Investigate common failure causes and implement retry logic",
      });
    }

    return {
      predictions,
      insights,
      generatedAt: new Date().toISOString(),
    };
  }
}

// Usage
const predictiveAnalytics = new PredictiveAnalytics(analyticsService);
const insights = await predictiveAnalytics.generateInsights();
console.log("Predictive insights:", insights);
```

---

This analytics and monitoring documentation provides comprehensive coverage of all tracking and monitoring capabilities. Use these patterns and examples to implement robust analytics and monitoring for your WhatsApp API integration.
