# Contact & Chat Management API

Complete guide for managing contacts, chat settings, group operations, and conversation management in WhatsApp API integration.

## 📋 Overview

The Contact & Chat Management API provides comprehensive functionality for managing WhatsApp contacts, chat configurations, group operations, and conversation settings. This includes contact synchronization, chat customization, and automated response management.

### Key Features

- **Contact Management**: Sync, organize, and manage WhatsApp contacts
- **Chat Settings**: Customize chat behavior per contact or globally
- **Group Operations**: Create, manage, and moderate WhatsApp groups
- **Auto-Reply**: Intelligent automated responses with AI integration
- **Conversation History**: Track and manage conversation threads
- **Contact Segmentation**: Organize contacts for targeted messaging

## 🔧 Base Configuration

```javascript
// Contact service setup
const axios = require("axios");

class ContactService {
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
const contactService = new ContactService(
  process.env.WHATSAPP_API_TOKEN,
  process.env.WHATSAPP_API_BASE_URL,
  req.user.id
);
```

---

## 👥 Contact Management

### Sync Contacts

**Endpoint:** `POST /api/whatsapp/contacts/sync`

**Description:** Synchronizes contacts from a WhatsApp device.

```javascript
// Sync contacts from device
async function syncContacts(sessionId) {
  const response = await contactService.client.post("/contacts/sync", {
    sessionId: sessionId,
  });

  return response.data;
}

// Usage
const syncResult = await syncContacts("user_user123_device_business");
console.log("Synced contacts:", syncResult.data.contactCount);
```

**Request Body:**

```json
{
  "sessionId": "user_user123_device_business"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "contactCount": 150,
    "newContacts": 25,
    "updatedContacts": 8,
    "syncedAt": "2025-06-19T12:00:00.000Z",
    "contacts": [
      {
        "id": "contact_123",
        "phoneNumber": "+1234567890",
        "name": "John Doe",
        "pushName": "John",
        "isGroup": false,
        "profilePicture": "https://...",
        "lastSeen": "2025-06-19T11:30:00.000Z",
        "isBlocked": false,
        "isBusiness": true
      }
    ]
  },
  "message": "Contacts synchronized successfully"
}
```

### Get Contacts

**Endpoint:** `GET /api/whatsapp/users/{userId}/contacts`

**Description:** Retrieves contacts with filtering and pagination.

```javascript
// Get contacts with filtering
async function getContacts(options = {}) {
  const {
    limit = 50,
    offset = 0,
    search = "",
    isGroup = null,
    isBusiness = null,
    sortBy = "name",
    sortOrder = "asc",
  } = options;

  const params = { limit, offset, sortBy, sortOrder };
  if (search) params.search = search;
  if (isGroup !== null) params.isGroup = isGroup;
  if (isBusiness !== null) params.isBusiness = isBusiness;

  const response = await contactService.client.get(
    `/users/${contactService.userId}/contacts`,
    { params }
  );

  return response.data;
}

// Usage examples
const allContacts = await getContacts();
const businessContacts = await getContacts({ isBusiness: true });
const searchResults = await getContacts({ search: "john" });
const groups = await getContacts({ isGroup: true });
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "contact_123",
      "userId": "user123",
      "phoneNumber": "+1234567890",
      "name": "John Doe",
      "pushName": "John",
      "isGroup": false,
      "profilePicture": "https://...",
      "lastSeen": "2025-06-19T11:30:00.000Z",
      "isBlocked": false,
      "isBusiness": true,
      "tags": ["customer", "vip"],
      "notes": "Important client - handle with priority",
      "createdAt": "2025-06-15T10:00:00.000Z",
      "updatedAt": "2025-06-19T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### Update Contact

**Endpoint:** `PUT /api/whatsapp/contacts/{contactId}`

**Description:** Updates contact information and metadata.

```javascript
// Update contact information
async function updateContact(contactId, updates) {
  const response = await contactService.client.put(
    `/contacts/${contactId}`,
    updates
  );
  return response.data;
}

// Usage examples
await updateContact("contact_123", {
  name: "John Doe - VIP Customer",
  tags: ["customer", "vip", "priority"],
  notes: "Premium customer - immediate response required",
});

await updateContact("contact_123", {
  customFields: {
    company: "Acme Corp",
    position: "CEO",
    lastOrderDate: "2025-06-15",
    preferredLanguage: "en",
  },
});
```

**Request Body:**

```json
{
  "name": "John Doe - VIP Customer",
  "tags": ["customer", "vip", "priority"],
  "notes": "Premium customer - immediate response required",
  "customFields": {
    "company": "Acme Corp",
    "position": "CEO",
    "lastOrderDate": "2025-06-15",
    "preferredLanguage": "en"
  }
}
```

### Delete Contact

**Endpoint:** `DELETE /api/whatsapp/contacts/{contactId}`

**Description:** Removes a contact from the system.

```javascript
// Delete contact
async function deleteContact(contactId) {
  const response = await contactService.client.delete(`/contacts/${contactId}`);
  return response.data;
}

// Usage
await deleteContact("contact_123");
```

---

## 💬 Chat Settings Management

### Get Chat Settings

**Endpoint:** `GET /api/whatsapp/chats/{phoneNumber}/settings`

**Description:** Retrieves chat-specific settings and configurations.

```javascript
// Get chat settings
async function getChatSettings(phoneNumber) {
  const response = await contactService.client.get(
    `/chats/${phoneNumber}/settings`
  );
  return response.data;
}

// Usage
const chatSettings = await getChatSettings("+1234567890");
console.log("Auto-reply enabled:", chatSettings.data.autoReplyEnabled);
```

**Response:**

```json
{
  "success": true,
  "data": {
    "phoneNumber": "+1234567890",
    "userId": "user123",
    "autoReplyEnabled": true,
    "autoReplyMessage": "Thank you for your message. We'll respond shortly.",
    "autoReplyDelay": 30,
    "aiEnabled": true,
    "aiProvider": "openai",
    "aiModel": "gpt-3.5-turbo",
    "aiPrompt": "You are a helpful customer service assistant...",
    "customerSegment": "vip",
    "businessType": "ecommerce",
    "workingHours": {
      "enabled": true,
      "start": "09:00",
      "end": "17:00",
      "timezone": "Asia/Jakarta",
      "days": [1, 2, 3, 4, 5]
    },
    "notifications": {
      "emailAlerts": true,
      "webhookUrl": "https://your-app.com/webhooks/whatsapp"
    },
    "restrictions": {
      "maxMessagesPerHour": 10,
      "allowedFileTypes": ["image", "document"],
      "blockedKeywords": ["spam", "promotion"]
    }
  }
}
```

### Update Chat Settings

**Endpoint:** `PUT /api/whatsapp/chats/{phoneNumber}/settings`

**Description:** Updates chat-specific settings and configurations.

```javascript
// Update chat settings
async function updateChatSettings(phoneNumber, settings) {
  const response = await contactService.client.put(
    `/chats/${phoneNumber}/settings`,
    settings
  );
  return response.data;
}

// Usage examples
await updateChatSettings("+1234567890", {
  autoReplyEnabled: true,
  autoReplyMessage:
    "Hello! Thanks for contacting us. How can we help you today?",
  autoReplyDelay: 60,
  aiEnabled: true,
  customerSegment: "premium",
});

await updateChatSettings("+1234567890", {
  workingHours: {
    enabled: true,
    start: "08:00",
    end: "18:00",
    timezone: "Asia/Jakarta",
    days: [1, 2, 3, 4, 5, 6], // Monday to Saturday
  },
});
```

### Bulk Update Chat Settings

**Endpoint:** `POST /api/whatsapp/chats/settings/bulk`

**Description:** Updates settings for multiple chats at once.

```javascript
// Bulk update chat settings
async function bulkUpdateChatSettings(updates) {
  const response = await contactService.client.post(
    "/chats/settings/bulk",
    updates
  );
  return response.data;
}

// Usage
const bulkUpdates = await bulkUpdateChatSettings({
  phoneNumbers: ["+1234567890", "+1234567891", "+1234567892"],
  settings: {
    autoReplyEnabled: true,
    autoReplyMessage:
      "Thank you for contacting us. We will respond during business hours.",
    customerSegment: "standard",
  },
});
```

---

## 👥 Group Management

### Create Group

**Endpoint:** `POST /api/whatsapp/groups`

**Description:** Creates a new WhatsApp group.

```javascript
// Create WhatsApp group
async function createGroup(sessionId, groupName, participants) {
  const response = await contactService.client.post("/groups", {
    sessionId: sessionId,
    name: groupName,
    participants: participants,
    description: "Group created via API",
  });

  return response.data;
}

// Usage
const group = await createGroup(
  "user_user123_device_business",
  "Customer Support Team",
  ["+1234567890", "+1234567891", "+1234567892"]
);
```

**Request Body:**

```json
{
  "sessionId": "user_user123_device_business",
  "name": "Customer Support Team",
  "participants": ["+1234567890", "+1234567891", "+1234567892"],
  "description": "Group for customer support coordination"
}
```

### Get Group Info

**Endpoint:** `GET /api/whatsapp/groups/{groupId}`

**Description:** Retrieves detailed group information.

```javascript
// Get group information
async function getGroupInfo(groupId) {
  const response = await contactService.client.get(`/groups/${groupId}`);
  return response.data;
}

// Usage
const groupInfo = await getGroupInfo("group_123@g.us");
console.log("Group participants:", groupInfo.data.participants.length);
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "group_123@g.us",
    "name": "Customer Support Team",
    "description": "Group for customer support coordination",
    "owner": "+1234567890",
    "createdAt": "2025-06-19T12:00:00.000Z",
    "participants": [
      {
        "phoneNumber": "+1234567890",
        "name": "John Doe",
        "isAdmin": true,
        "joinedAt": "2025-06-19T12:00:00.000Z"
      },
      {
        "phoneNumber": "+1234567891",
        "name": "Jane Smith",
        "isAdmin": false,
        "joinedAt": "2025-06-19T12:01:00.000Z"
      }
    ],
    "settings": {
      "onlyAdminsCanSend": false,
      "onlyAdminsCanEdit": true,
      "disappearingMessages": false
    }
  }
}
```

### Add/Remove Participants

**Endpoint:** `POST /api/whatsapp/groups/{groupId}/participants`
**Endpoint:** `DELETE /api/whatsapp/groups/{groupId}/participants`

**Description:** Manages group participants.

```javascript
// Add participants to group
async function addParticipants(groupId, phoneNumbers) {
  const response = await contactService.client.post(
    `/groups/${groupId}/participants`,
    {
      participants: phoneNumbers,
    }
  );
  return response.data;
}

// Remove participants from group
async function removeParticipants(groupId, phoneNumbers) {
  const response = await contactService.client.delete(
    `/groups/${groupId}/participants`,
    {
      data: { participants: phoneNumbers },
    }
  );
  return response.data;
}

// Usage
await addParticipants("group_123@g.us", ["+1234567893", "+1234567894"]);
await removeParticipants("group_123@g.us", ["+1234567892"]);
```

---

## 🤖 Auto-Reply & AI Integration

### Configure Auto-Reply

```javascript
// Auto-reply configuration helper
class AutoReplyManager {
  constructor(contactService) {
    this.contactService = contactService;
    this.templates = new Map();
  }

  // Register auto-reply templates
  registerTemplate(name, template) {
    this.templates.set(name, template);
  }

  // Set up basic auto-reply
  async setupBasicAutoReply(phoneNumber, message, delay = 30) {
    return await this.contactService.updateChatSettings(phoneNumber, {
      autoReplyEnabled: true,
      autoReplyMessage: message,
      autoReplyDelay: delay,
    });
  }

  // Set up AI-powered auto-reply
  async setupAIAutoReply(phoneNumber, config) {
    const {
      provider = "openai",
      model = "gpt-3.5-turbo",
      prompt = "You are a helpful customer service assistant.",
      maxTokens = 150,
      temperature = 0.7,
    } = config;

    return await this.contactService.updateChatSettings(phoneNumber, {
      autoReplyEnabled: true,
      aiEnabled: true,
      aiProvider: provider,
      aiModel: model,
      aiPrompt: prompt,
      aiSettings: {
        maxTokens,
        temperature,
      },
    });
  }

  // Set up conditional auto-reply
  async setupConditionalAutoReply(phoneNumber, conditions) {
    const settings = {
      autoReplyEnabled: true,
      conditionalReplies: conditions,
    };

    return await this.contactService.updateChatSettings(phoneNumber, settings);
  }

  // Set up business hours auto-reply
  async setupBusinessHoursReply(
    phoneNumber,
    workingHours,
    insideHoursMsg,
    outsideHoursMsg
  ) {
    return await this.contactService.updateChatSettings(phoneNumber, {
      autoReplyEnabled: true,
      workingHours: workingHours,
      autoReplyMessage: insideHoursMsg,
      outsideHoursMessage: outsideHoursMsg,
    });
  }
}

// Usage examples
const autoReplyManager = new AutoReplyManager(contactService);

// Basic auto-reply
await autoReplyManager.setupBasicAutoReply(
  "+1234567890",
  "Thank you for your message! We will respond within 1 hour.",
  60
);

// AI-powered auto-reply
await autoReplyManager.setupAIAutoReply("+1234567890", {
  provider: "openai",
  model: "gpt-3.5-turbo",
  prompt: `You are a customer service assistant for an e-commerce company. 
           Be helpful, professional, and concise. 
           If you cannot help with something, politely direct them to contact support.`,
  temperature: 0.3,
});

// Conditional auto-reply
await autoReplyManager.setupConditionalAutoReply("+1234567890", [
  {
    condition: "contains",
    keywords: ["order", "tracking", "shipment"],
    response:
      "For order inquiries, please provide your order number and we will check the status for you.",
  },
  {
    condition: "contains",
    keywords: ["refund", "return", "exchange"],
    response:
      "For returns and refunds, please visit our returns portal or contact our support team.",
  },
  {
    condition: "contains",
    keywords: ["urgent", "emergency", "asap"],
    response:
      "We understand this is urgent. Our priority support team will contact you within 15 minutes.",
  },
]);

// Business hours auto-reply
await autoReplyManager.setupBusinessHoursReply(
  "+1234567890",
  {
    enabled: true,
    start: "09:00",
    end: "17:00",
    timezone: "Asia/Jakarta",
    days: [1, 2, 3, 4, 5],
  },
  "Hello! Thank you for contacting us. How can we help you today?",
  "Thank you for your message. Our office hours are 9 AM to 5 PM, Monday to Friday. We will respond during the next business day."
);
```

---

## 📊 Conversation Management

### Get Conversation History

**Endpoint:** `GET /api/whatsapp/conversations/{phoneNumber}`

**Description:** Retrieves conversation history with a specific contact.

```javascript
// Get conversation history
async function getConversationHistory(phoneNumber, options = {}) {
  const {
    limit = 50,
    offset = 0,
    dateFrom = null,
    dateTo = null,
    messageType = null,
  } = options;

  const params = { limit, offset };
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  if (messageType) params.messageType = messageType;

  const response = await contactService.client.get(
    `/conversations/${phoneNumber}`,
    { params }
  );

  return response.data;
}

// Usage
const conversation = await getConversationHistory("+1234567890", {
  limit: 20,
  dateFrom: "2025-06-01",
});
```

**Response:**

```json
{
  "success": true,
  "data": {
    "phoneNumber": "+1234567890",
    "contactName": "John Doe",
    "totalMessages": 45,
    "messages": [
      {
        "id": 1,
        "messageId": "msg_123",
        "direction": "outbound",
        "message": "Hello! How can I help you?",
        "type": "text",
        "status": "read",
        "timestamp": "2025-06-19T12:00:00.000Z",
        "isAutoReply": false
      },
      {
        "id": 2,
        "messageId": "msg_124",
        "direction": "inbound",
        "message": "I need help with my order",
        "type": "text",
        "timestamp": "2025-06-19T12:01:00.000Z"
      }
    ]
  },
  "pagination": {
    "total": 45,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### Mark Conversation as Read

**Endpoint:** `POST /api/whatsapp/conversations/{phoneNumber}/read`

**Description:** Marks all messages in a conversation as read.

```javascript
// Mark conversation as read
async function markConversationRead(phoneNumber) {
  const response = await contactService.client.post(
    `/conversations/${phoneNumber}/read`
  );
  return response.data;
}

// Usage
await markConversationRead("+1234567890");
```

### Archive/Unarchive Conversation

**Endpoint:** `POST /api/whatsapp/conversations/{phoneNumber}/archive`
**Endpoint:** `POST /api/whatsapp/conversations/{phoneNumber}/unarchive`

**Description:** Archives or unarchives a conversation.

```javascript
// Archive conversation
async function archiveConversation(phoneNumber) {
  const response = await contactService.client.post(
    `/conversations/${phoneNumber}/archive`
  );
  return response.data;
}

// Unarchive conversation
async function unarchiveConversation(phoneNumber) {
  const response = await contactService.client.post(
    `/conversations/${phoneNumber}/unarchive`
  );
  return response.data;
}

// Usage
await archiveConversation("+1234567890");
await unarchiveConversation("+1234567890");
```

---

## 🏷️ Contact Segmentation

### Create Contact Segments

```javascript
// Contact segmentation helper
class ContactSegmentManager {
  constructor(contactService) {
    this.contactService = contactService;
    this.segments = new Map();
  }

  // Create segment
  createSegment(name, criteria) {
    const segment = {
      id: `segment_${Date.now()}`,
      name,
      criteria,
      createdAt: new Date().toISOString(),
      contactCount: 0,
    };

    this.segments.set(segment.id, segment);
    return segment;
  }

  // Apply segment to contacts
  async applySegment(segmentId) {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new Error("Segment not found");
    }

    const contacts = await this.contactService.getContacts({ limit: 1000 });
    const matchingContacts = contacts.data.filter((contact) =>
      this.evaluateSegmentCriteria(contact, segment.criteria)
    );

    // Update contacts with segment tag
    for (const contact of matchingContacts) {
      const currentTags = contact.tags || [];
      if (!currentTags.includes(segment.name)) {
        await this.contactService.updateContact(contact.id, {
          tags: [...currentTags, segment.name],
        });
      }
    }

    segment.contactCount = matchingContacts.length;
    return matchingContacts;
  }

  evaluateSegmentCriteria(contact, criteria) {
    for (const criterion of criteria) {
      switch (criterion.field) {
        case "tags":
          if (criterion.operator === "contains") {
            if (!contact.tags?.some((tag) => criterion.value.includes(tag))) {
              return false;
            }
          }
          break;

        case "isBusiness":
          if (contact.isBusiness !== criterion.value) {
            return false;
          }
          break;

        case "lastSeen":
          const lastSeen = new Date(contact.lastSeen);
          const criterionDate = new Date(criterion.value);
          if (criterion.operator === "before" && lastSeen >= criterionDate) {
            return false;
          }
          if (criterion.operator === "after" && lastSeen <= criterionDate) {
            return false;
          }
          break;

        case "customField":
          const fieldValue = contact.customFields?.[criterion.fieldName];
          if (
            criterion.operator === "equals" &&
            fieldValue !== criterion.value
          ) {
            return false;
          }
          break;
      }
    }
    return true;
  }

  // Get contacts by segment
  async getContactsBySegment(segmentName) {
    const contacts = await this.contactService.getContacts({ limit: 1000 });
    return contacts.data.filter((contact) =>
      contact.tags?.includes(segmentName)
    );
  }

  // Send message to segment
  async sendToSegment(segmentName, message, deviceAlias) {
    const contacts = await this.getContactsBySegment(segmentName);
    const results = [];

    for (const contact of contacts) {
      try {
        // Assuming you have a message service integrated
        const result = await messageService.sendMessage(
          deviceAlias,
          contact.phoneNumber,
          message
        );
        results.push({
          phoneNumber: contact.phoneNumber,
          success: true,
          messageId: result.data.messageId,
        });
      } catch (error) {
        results.push({
          phoneNumber: contact.phoneNumber,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }
}

// Usage examples
const segmentManager = new ContactSegmentManager(contactService);

// Create VIP customer segment
const vipSegment = segmentManager.createSegment("VIP Customers", [
  { field: "tags", operator: "contains", value: ["vip", "premium"] },
  { field: "isBusiness", operator: "equals", value: true },
]);

// Create inactive customer segment
const inactiveSegment = segmentManager.createSegment("Inactive Customers", [
  { field: "lastSeen", operator: "before", value: "2025-06-01" },
  { field: "tags", operator: "contains", value: ["customer"] },
]);

// Apply segments
await segmentManager.applySegment(vipSegment.id);
await segmentManager.applySegment(inactiveSegment.id);

// Send targeted messages
await segmentManager.sendToSegment(
  "VIP Customers",
  "Exclusive offer for our VIP customers! Get 20% off your next order.",
  "business-main"
);

await segmentManager.sendToSegment(
  "Inactive Customers",
  "We miss you! Come back and enjoy 15% off your next purchase.",
  "business-main"
);
```

---

## 🔍 Advanced Features

### Smart Contact Insights

```javascript
// Contact insights analyzer
class ContactInsights {
  constructor(contactService) {
    this.contactService = contactService;
  }

  async analyzeContact(phoneNumber) {
    const [conversation, chatSettings, contactInfo] = await Promise.all([
      this.contactService.getConversationHistory(phoneNumber, { limit: 100 }),
      this.contactService.getChatSettings(phoneNumber),
      this.contactService.getContacts({ search: phoneNumber }),
    ]);

    const contact = contactInfo.data[0];
    const messages = conversation.data.messages;

    return {
      contact: contact,
      insights: {
        messageFrequency: this.calculateMessageFrequency(messages),
        responseTime: this.calculateAverageResponseTime(messages),
        engagement: this.calculateEngagementScore(messages),
        preferredTime: this.getPreferredContactTime(messages),
        sentiment: this.analyzeSentiment(messages),
        topics: this.extractTopics(messages),
      },
      recommendations: this.generateRecommendations(contact, messages),
    };
  }

  calculateMessageFrequency(messages) {
    if (messages.length === 0) return 0;

    const firstMessage = new Date(messages[messages.length - 1].timestamp);
    const lastMessage = new Date(messages[0].timestamp);
    const daysDiff = (lastMessage - firstMessage) / (1000 * 60 * 60 * 24);

    return messages.length / Math.max(daysDiff, 1);
  }

  calculateAverageResponseTime(messages) {
    const responseTimes = [];

    for (let i = 1; i < messages.length; i++) {
      const current = messages[i];
      const previous = messages[i - 1];

      if (current.direction !== previous.direction) {
        const responseTime =
          new Date(current.timestamp) - new Date(previous.timestamp);
        responseTimes.push(responseTime);
      }
    }

    if (responseTimes.length === 0) return null;

    const average =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    return Math.round(average / (1000 * 60)); // Convert to minutes
  }

  calculateEngagementScore(messages) {
    if (messages.length === 0) return 0;

    const inboundMessages = messages.filter(
      (m) => m.direction === "inbound"
    ).length;
    const outboundMessages = messages.filter(
      (m) => m.direction === "outbound"
    ).length;
    const totalMessages = messages.length;

    // Higher score for more balanced conversations
    const balance =
      Math.min(inboundMessages, outboundMessages) /
      Math.max(inboundMessages, outboundMessages, 1);
    const volume = Math.min(totalMessages / 10, 1); // Normalize to 0-1 scale

    return Math.round((balance * 0.6 + volume * 0.4) * 100);
  }

  getPreferredContactTime(messages) {
    const hourCounts = new Array(24).fill(0);

    messages.forEach((message) => {
      if (message.direction === "inbound") {
        const hour = new Date(message.timestamp).getHours();
        hourCounts[hour]++;
      }
    });

    const maxCount = Math.max(...hourCounts);
    const preferredHour = hourCounts.indexOf(maxCount);

    return {
      hour: preferredHour,
      period:
        preferredHour < 12
          ? "morning"
          : preferredHour < 17
          ? "afternoon"
          : "evening",
    };
  }

  analyzeSentiment(messages) {
    // Simple keyword-based sentiment analysis
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "happy",
      "satisfied",
      "love",
      "perfect",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "hate",
      "disappointed",
      "problem",
      "issue",
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    messages.forEach((message) => {
      if (message.direction === "inbound") {
        const text = message.message.toLowerCase();
        positiveWords.forEach((word) => {
          if (text.includes(word)) positiveCount++;
        });
        negativeWords.forEach((word) => {
          if (text.includes(word)) negativeCount++;
        });
      }
    });

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }

  extractTopics(messages) {
    // Simple keyword extraction
    const topicKeywords = {
      order: ["order", "purchase", "buy", "payment"],
      support: ["help", "problem", "issue", "support"],
      shipping: ["delivery", "shipping", "tracking", "arrived"],
      refund: ["refund", "return", "exchange", "money back"],
    };

    const topicCounts = {};

    messages.forEach((message) => {
      const text = message.message.toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        keywords.forEach((keyword) => {
          if (text.includes(keyword)) {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          }
        });
      });
    });

    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([topic, count]) => ({ topic, count }));
  }

  generateRecommendations(contact, messages) {
    const recommendations = [];

    // Engagement recommendations
    const engagementScore = this.calculateEngagementScore(messages);
    if (engagementScore < 30) {
      recommendations.push({
        type: "engagement",
        priority: "medium",
        message:
          "Low engagement detected. Consider more personalized messaging.",
        action: "Review conversation history and adjust communication style",
      });
    }

    // Response time recommendations
    const avgResponseTime = this.calculateAverageResponseTime(messages);
    if (avgResponseTime && avgResponseTime > 60) {
      recommendations.push({
        type: "response_time",
        priority: "high",
        message: "Slow response times detected. Consider enabling auto-reply.",
        action: "Set up auto-reply or prioritize this contact",
      });
    }

    // VIP recommendations
    if (contact.tags?.includes("vip") && !contact.tags?.includes("priority")) {
      recommendations.push({
        type: "vip_handling",
        priority: "high",
        message: "VIP customer without priority handling.",
        action: "Add priority tag and configure immediate notifications",
      });
    }

    return recommendations;
  }
}

// Usage
const contactInsights = new ContactInsights(contactService);
const insights = await contactInsights.analyzeContact("+1234567890");
console.log("Contact insights:", insights);
```

---

This contact and chat management documentation provides comprehensive coverage of all contact-related operations. Use these patterns and examples to implement effective contact management and conversation handling in your WhatsApp API integration.
