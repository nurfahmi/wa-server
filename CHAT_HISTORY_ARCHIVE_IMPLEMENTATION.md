# Chat History Archive & Restoration System

## 📋 Overview

This implementation creates a comprehensive **Chat History Archive System** that allows users to:

1. **Archive devices** (instead of deleting) when WhatsApp number gets blocked
2. **View historical chats** in a WhatsApp-like interface
3. **Restore/export chat history** from archived devices to active devices
4. **Capture real WhatsApp number** when device connects

---

## 🎯 User Stories

### Story 1: Device Gets Blocked
> As a user, when my WhatsApp number gets blocked, I want to archive my device instead of deleting it, so I don't lose my valuable chat history.

### Story 2: View Historical Chats
> As a user, I want to browse my archived chat history in a familiar WhatsApp-like interface, so I can review past conversations with customers.

### Story 3: Restore History to New Device
> As a user, after setting up a new WhatsApp number, I want to restore chat history from my archived device to my new active device, so customers see continuity when they contact me again.

### Story 4: Phone Number Capture
> As a user, I want the system to automatically capture my connected WhatsApp number, so the system can match customers across different devices.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐   │
│  │   Devices.jsx  │    │   ChatHistory.jsx   │    │ HistoryRestore.jsx  │   │
│  │                │    │   (New Page)        │    │   (Modal)           │   │
│  │ - Archive btn  │───▶│ - Device selector   │───▶│ - Select target     │   │
│  │ - Status badge │    │ - Chat list         │    │ - Preview changes   │   │
│  │                │    │ - Message view      │    │ - Confirm restore   │   │
│  └────────────────┘    └─────────────────────┘    └─────────────────────┘   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                              BACKEND                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     API Routes                                       │    │
│  │  POST   /devices/:id/archive                                        │    │
│  │  GET    /devices/archived                                           │    │
│  │  GET    /chat-history/devices/:deviceId/conversations               │    │
│  │  GET    /chat-history/devices/:deviceId/messages/:chatId            │    │
│  │  POST   /chat-history/restore                                       │    │
│  │  GET    /chat-history/restore/preview                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │               ChatHistoryMigrationService.js                        │    │
│  │  - getArchivedDevices()                                             │    │
│  │  - getConversationsByDevice()                                       │    │
│  │  - getMessagesByChat()                                              │    │
│  │  - previewRestore()                                                 │    │
│  │  - executeRestore()                                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                              DATABASE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Devices                ChatSettings              ChatHistory               │
│  ┌──────────────┐       ┌──────────────┐         ┌──────────────┐          │
│  │ + status:    │       │ + deviceId   │         │ + deviceId   │          │
│  │   archived   │       │ + chatId     │         │ + chatId     │          │
│  │ + realPhone  │──────▶│ + phoneNumber│────────▶│ + phoneNumber│          │
│  │   Number     │       │ + archived   │         │ + restoredTo │          │
│  │ + archivedAt │       │              │         │   DeviceId   │          │
│  └──────────────┘       └──────────────┘         └──────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Files to Create/Modify

### Phase 1: Database & Backend Foundation

| File | Action | Description |
|------|--------|-------------|
| `src/migrations/20260113_add_device_archive_support.cjs` | CREATE | Add `archived` status, `realPhoneNumber`, `archivedAt` |
| `src/migrations/20260113_add_history_restoration_tracking.cjs` | CREATE | Track which records were restored where |
| `src/models/Device.js` | MODIFY | Add new fields |
| `src/models/ChatHistory.js` | MODIFY | Add `restoredFromDeviceId` field |
| `src/models/ChatSettings.js` | MODIFY | Add `archivedDeviceId` field |

### Phase 2: Services & Controllers

| File | Action | Description |
|------|--------|-------------|
| `src/services/ChatHistoryMigrationService.js` | CREATE | Core migration logic |
| `src/controllers/chatHistoryArchiveController.js` | CREATE | Handle archive/restore endpoints |
| `src/routes/chatHistoryArchive.js` | CREATE | Route definitions |
| `src/controllers/deviceController.js` | MODIFY | Add archive endpoint |
| `src/services/WhatsAppService.js` | MODIFY | Capture real phone number on connect |

### Phase 3: Frontend Pages

| File | Action | Description |
|------|--------|-------------|
| `client/src/pages/ChatHistoryArchive.jsx` | CREATE | Main history browsing page |
| `client/src/components/history/DeviceSelector.jsx` | CREATE | Dropdown to select archived device |
| `client/src/components/history/ConversationList.jsx` | CREATE | List of chats for selected device |
| `client/src/components/history/MessageViewer.jsx` | CREATE | WhatsApp-like message display |
| `client/src/components/history/RestoreModal.jsx` | CREATE | Modal for restore confirmation |
| `client/src/pages/Devices.jsx` | MODIFY | Add archive button, status badges |
| `client/src/App.jsx` | MODIFY | Add route for history page |

### Phase 4: UI Polish & Translations

| File | Action | Description |
|------|--------|-------------|
| `client/src/context/LanguageContext.jsx` | MODIFY | Add translations for new feature |
| `client/src/components/layout/Sidebar.jsx` | MODIFY | Add menu item for Chat History |

---

## 🔧 Detailed Implementation

### Step 1: Database Migration - Device Archive Support

**File: `src/migrations/20260113_add_device_archive_support.cjs`**

```javascript
// Migration adds:
// - Device.status = 'archived' option
// - Device.realPhoneNumber - captured from WhatsApp on connection
// - Device.archivedAt - timestamp when archived
// - Device.archiveReason - optional reason (blocked, switched, etc)
```

**Changes to Device status enum:**
```
'connecting' | 'connected' | 'disconnected' | 'logged_out' | 'archived'
```

### Step 2: Capture Real Phone Number

**Modify: `src/services/WhatsAppService.js`**

When WhatsApp connects successfully, extract the actual phone number from the connection info:

```javascript
// In connection.update handler
if (connection === 'open') {
  const jid = sock.user?.id; // e.g., "628123456789:5@s.whatsapp.net"
  const realPhoneNumber = jid?.split(':')[0] || jid?.split('@')[0];
  
  await Device.update(
    { realPhoneNumber, status: 'connected', lastConnection: new Date() },
    { where: { sessionId } }
  );
}
```

### Step 3: Archive Device Endpoint

**Add to: `src/controllers/deviceController.js`**

```javascript
export const archiveDevice = async (req, res) => {
  const { deviceId } = req.params;
  const { reason } = req.body; // 'blocked', 'switched_number', 'other'
  
  // 1. Logout WhatsApp session
  // 2. Update device status to 'archived'
  // 3. Set archivedAt timestamp
  // 4. Keep all related data (NO CASCADE DELETE)
  
  await device.update({
    status: 'archived',
    archivedAt: new Date(),
    archiveReason: reason || 'manual'
  });
};
```

### Step 4: Chat History Migration Service

**Create: `src/services/ChatHistoryMigrationService.js`**

```javascript
class ChatHistoryMigrationService {
  
  // Get all archived devices for a user
  async getArchivedDevices(userId) {
    return Device.findAll({
      where: { userId, status: 'archived' },
      order: [['archivedAt', 'DESC']]
    });
  }
  
  // Get conversation list for a device (like WhatsApp chat list)
  async getConversationsByDevice(deviceId) {
    return ChatSettings.findAll({
      where: { deviceId },
      attributes: [
        'id', 'chatId', 'contactName', 'phoneNumber', 
        'profilePictureUrl', 'lastMessageContent', 
        'lastMessageTimestamp', 'unreadCount'
      ],
      order: [['lastMessageTimestamp', 'DESC']]
    });
  }
  
  // Get messages for a specific chat
  async getMessagesByChat(deviceId, chatId, page = 1, limit = 50) {
    return ChatHistory.findAll({
      where: { deviceId, chatId },
      order: [['timestamp', 'ASC']],
      limit,
      offset: (page - 1) * limit
    });
  }
  
  // Preview what will be restored
  async previewRestore(sourceDeviceId, targetDeviceId, options) {
    // Count matching phone numbers
    // Show what data will be merged/added
    // Return preview summary
  }
  
  // Execute the restoration
  async executeRestore(sourceDeviceId, targetDeviceId, options) {
    // options: { 
    //   mode: 'merge' | 'copy',           // merge combines, copy creates separate
    //   matchBy: 'phone' | 'all',          // phone matches by number, all imports everything
    //   includeAIMemory: true,
    //   selectedChats: [] | null           // specific chats or all
    // }
  }
}
```

### Step 5: Chat History Archive Page UI

**Create: `client/src/pages/ChatHistoryArchive.jsx`**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📦 Chat History Archive                                     [Settings] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ Select Device ───────────────────────────────────────────────────┐  │
│  │ 📱 iPhone Business (archived Jan 10, 2026)              [▼]       │  │
│  │    +62 812-345-6789  •  127 conversations  •  2,450 messages      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Conversations ────────────┐  ┌─ Messages ────────────────────────┐  │
│  │ 🔍 Search conversations... │  │ 👤 John Doe (+62 813-xxx-xxxx)   │  │
│  │                            │  │    Customer since: Jan 1, 2026   │  │
│  │ ┌───────────────────────┐  │  ├──────────────────────────────────┤  │
│  │ │ 👤 John Doe           │  │  │                                  │  │
│  │ │ Thanks for the info!  │  │  │  ┌────────────────────┐         │  │
│  │ │ Today, 10:30 AM       │◀─┼──│  │ Hi, I want to ask  │         │  │
│  │ └───────────────────────┘  │  │  │ about your product │         │  │
│  │ ┌───────────────────────┐  │  │  └────────────────────┘ 10:28   │  │
│  │ │ 👤 Jane Smith         │  │  │                                  │  │
│  │ │ Deal! Let me pay now  │  │  │         ┌────────────────────┐  │  │
│  │ │ Yesterday             │  │  │         │ Sure! Here are the │  │  │
│  │ └───────────────────────┘  │  │         │ details you need.. │  │  │
│  │ ┌───────────────────────┐  │  │  10:29  └────────────────────┘  │  │
│  │ │ 👤 Ahmad              │  │  │                                  │  │
│  │ │ Is this still avail?  │  │  │  ┌────────────────────┐         │  │
│  │ │ 3 days ago            │  │  │  │ Thanks for the     │         │  │
│  │ └───────────────────────┘  │  │  │ information!       │         │  │
│  │                            │  │  └────────────────────┘ 10:30   │  │
│  │        [Load More]         │  │                                  │  │
│  └────────────────────────────┘  └──────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ [📤 Export Selected]  [🔄 Restore to Active Device]  [🗑️ Delete] │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step 6: Restore Modal

**Create: `client/src/components/history/RestoreModal.jsx`**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔄 Restore Chat History                                          [X]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Source: iPhone Business (archived) - +62 812-345-6789                   │
│                                                                          │
│  ┌─ Target Device ───────────────────────────────────────────────────┐  │
│  │ 📱 Android Work                                         [▼]       │  │
│  │    +62 817-123-4567  •  Connected  •  Active                      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Restore Options ─────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  ○ Restore All Conversations (127 chats, 2,450 messages)         │  │
│  │  ● Restore Only Matching Phone Numbers                            │  │
│  │    └─ Found 45 matching contacts between devices                  │  │
│  │  ○ Restore Selected Conversations Only                            │  │
│  │                                                                    │  │
│  │  ☑️ Include AI Memory & Context                                   │  │
│  │  ☑️ Include Purchase Intent Scores                                │  │
│  │  ☐ Include Conversation Outcomes                                  │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Preview ─────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  📊 Restore Summary:                                               │  │
│  │  • 45 conversations will be merged with existing                  │  │
│  │  • 82 conversations will be added as new                          │  │
│  │  • 1,200 messages will be restored                                │  │
│  │  • AI memory for 45 contacts will be transferred                  │  │
│  │                                                                    │  │
│  │  ⚠️ Note: Original data in archived device will be preserved      │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    [Cancel]        [🔄 Restore Now]               │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema Changes

### Device Model Additions

```javascript
// New fields for Device model
realPhoneNumber: {
  type: DataTypes.STRING,
  allowNull: true,
  comment: "Actual WhatsApp phone number captured on connection"
},
archivedAt: {
  type: DataTypes.DATE,
  allowNull: true,
  comment: "When device was archived"
},
archiveReason: {
  type: DataTypes.ENUM('blocked', 'switched_number', 'inactive', 'manual'),
  allowNull: true,
  comment: "Reason for archiving"
}
```

### ChatHistory Model Additions

```javascript
// New fields for ChatHistory model
restoredFromDeviceId: {
  type: DataTypes.BIGINT,
  allowNull: true,
  comment: "Original device ID if this was restored from archive"
},
originalMessageId: {
  type: DataTypes.BIGINT,
  allowNull: true,
  comment: "Original message ID in source device"
}
```

### ChatSettings Model Additions

```javascript
// New fields for ChatSettings model  
restoredFromDeviceId: {
  type: DataTypes.BIGINT,
  allowNull: true,
  comment: "Original device ID if restored from archive"
},
mergedWith: {
  type: DataTypes.JSON,
  defaultValue: [],
  comment: "Array of device IDs that contributed to this chat record"
}
```

---

## 🚀 Implementation Order

### Week 1: Backend Foundation
1. ✅ Create database migrations
2. ✅ Modify Device model
3. ✅ Capture real phone number in WhatsAppService
4. ✅ Add archive device endpoint

### Week 2: History Service & APIs
5. ✅ Create ChatHistoryMigrationService
6. ✅ Create API routes for history browsing
7. ✅ Create API routes for restoration
8. ✅ Add preview functionality

### Week 3: Frontend - History Page
9. ✅ Create ChatHistoryArchive page
10. ✅ Create DeviceSelector component
11. ✅ Create ConversationList component
12. ✅ Create MessageViewer component (WhatsApp-like)

### Week 4: Frontend - Restore & Polish
13. ✅ Create RestoreModal component
14. ✅ Modify Devices page (archive button)
15. ✅ Add sidebar menu item
16. ✅ Add translations (ID/EN)
17. ✅ Testing & bug fixes

---

## 🔐 Security Considerations

1. **User Isolation**: Users can only access their own archived devices
2. **Validation**: Verify both source and target devices belong to same user
3. **Rate Limiting**: Limit restore operations (expensive DB operations)
4. **Audit Trail**: Log all archive/restore operations

---

## 📱 Mobile Responsiveness

The Chat History page will follow WhatsApp mobile layout:
- On mobile: Show either conversation list OR messages (not both)
- Swipe or back button to navigate between views
- Touch-friendly message bubbles

---

## 🔄 Restoration Logic Details

### Merge Strategy

When restoring a chat that exists in both devices:

```
┌────────────────────────────────────────────────────────────────┐
│ Customer: +62812345678                                          │
│                                                                 │
│ Source (Archived Device)        Target (Active Device)         │
│ ├── Message 1 (Jan 1)    ─────▶ ├── Message 1 (Jan 1) new     │
│ ├── Message 2 (Jan 2)    ─────▶ ├── Message 2 (Jan 2) new     │
│ ├── Message 3 (Jan 3)    ─────▶ ├── Message 3 (Jan 3) new     │
│ └── (number blocked)            ├── Message A (Jan 5) existing │
│                                 ├── Message B (Jan 6) existing │
│                                 └── Messages sorted by time    │
└────────────────────────────────────────────────────────────────┘
```

### Phone Number Matching

```javascript
// Match by normalized phone number
const normalizePhone = (phone) => {
  return phone.replace(/[^0-9]/g, '').replace(/^0/, '62');
};

// Find matching chats between devices
const findMatchingChats = (sourceChats, targetChats) => {
  return sourceChats.filter(source => 
    targetChats.some(target => 
      normalizePhone(source.phoneNumber) === normalizePhone(target.phoneNumber)
    )
  );
};
```

---

## ✅ Acceptance Criteria

1. [ ] User can archive a device instead of deleting it
2. [ ] Archived devices appear in a dedicated "Chat History" page
3. [ ] User can browse conversations from archived devices
4. [ ] Messages display in WhatsApp-like chat bubble format
5. [ ] User can select which conversations to restore
6. [ ] User can choose target device for restoration
7. [ ] Preview shows what will be restored before confirming
8. [ ] Restoration merges messages correctly by timestamp
9. [ ] AI memory can optionally be transferred
10. [ ] Real phone number is captured when WhatsApp connects
11. [ ] All features work on mobile devices
12. [ ] UI is translated in Indonesian and English

---

## 🎨 Design Notes

- Use existing design system colors and components
- Chat bubbles: Green for outgoing, White for incoming (like WhatsApp)
- Archive status: Orange badge on device cards
- Restore button: Primary action color
- Warning states for destructive actions

---

**Ready to implement? Let me know and I'll start with Phase 1!** 🚀

---

## 🔍 Current State Analysis

### Device Model - Current Status Enum (Line 37-51)
```javascript
status: {
  type: DataTypes.ENUM(
    "pending",
    "connecting",
    "synchronizing",
    "connected",
    "disconnected",
    "disconnecting",
    "error",
    "auth_failed",
    "logged_out",
    "reconnecting",
    "conflict",
    "deleted"
  ),
  defaultValue: "pending",
},
```

### Missing Fields in Device Model
| Field | Purpose | Status |
|-------|---------|--------|
| `realPhoneNumber` | Captured from WhatsApp on connection | ❌ Missing |
| `archivedAt` | Timestamp when device was archived | ❌ Missing |
| `archiveReason` | Why device was archived | ❌ Missing |
| `archived` status | Status for archived devices | ❌ Missing |

### ConnectionHandler.js - Where to Capture Real Phone Number (Line 269-286)

Current code when connection opens:
```javascript
if (connection === "open") {
  this.service.sessionManager.resetReconnectAttempts(sessionId);
  this.service.qrAttempts.delete(sessionId);
  this.service.sessionManager.clearQRTimeout(sessionId);

  await device.update({
    status: "connected",
    lastConnection: getJakartaTime(),
    lastError: null,
  });
  // ... more code
}
```

**We need to add:**
```javascript
if (connection === "open") {
  // Get the actual connected WhatsApp number from socket
  const connectedJid = sock.user?.id;
  const realPhoneNumber = connectedJid 
    ? connectedJid.split(':')[0] || connectedJid.split('@')[0]
    : null;
  
  await device.update({
    status: "connected",
    realPhoneNumber: realPhoneNumber,  // <-- NEW
    lastConnection: getJakartaTime(),
    lastError: null,
  });
}
```

---

## 📋 Detailed Task Breakdown

### Task 1: Database Migration - Add Archive Support
**File:** `src/migrations/20260113_add_device_archive_support.cjs`

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Add realPhoneNumber column
      await queryInterface.addColumn('Devices', 'realPhoneNumber', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Actual WhatsApp phone number captured on connection'
      }, { transaction });

      // 2. Add archivedAt column
      await queryInterface.addColumn('Devices', 'archivedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When device was archived'
      }, { transaction });

      // 3. Add archiveReason column
      await queryInterface.addColumn('Devices', 'archiveReason', {
        type: Sequelize.ENUM('blocked', 'switched_number', 'inactive', 'manual'),
        allowNull: true,
        comment: 'Reason for archiving'
      }, { transaction });

      // 4. Modify status enum to add 'archived'
      await queryInterface.sequelize.query(`
        ALTER TABLE Devices 
        MODIFY COLUMN status ENUM(
          'pending', 'connecting', 'synchronizing', 'connected', 
          'disconnected', 'disconnecting', 'error', 'auth_failed', 
          'logged_out', 'reconnecting', 'conflict', 'deleted', 'archived'
        ) DEFAULT 'pending'
      `, { transaction });

      // 5. Add restoredFromDeviceId to ChatHistory
      await queryInterface.addColumn('ChatHistories', 'restoredFromDeviceId', {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'Original device ID if this was restored from archive'
      }, { transaction });

      // 6. Add restoredFromDeviceId to ChatSettings
      await queryInterface.addColumn('ChatSettings', 'restoredFromDeviceId', {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'Original device ID if restored from archive'
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Rollback code
  }
};
```

### Task 2: Update Device Model
**File:** `src/models/Device.js`

Add new fields after line 50:
```javascript
// Archive Support
realPhoneNumber: {
  type: DataTypes.STRING,
  allowNull: true,
  comment: "Actual WhatsApp phone number captured on connection"
},
archivedAt: {
  type: DataTypes.DATE,
  allowNull: true,
  comment: "When device was archived"
},
archiveReason: {
  type: DataTypes.ENUM('blocked', 'switched_number', 'inactive', 'manual'),
  allowNull: true,
  comment: "Reason for archiving"
},
```

Update status enum to include 'archived':
```javascript
status: {
  type: DataTypes.ENUM(
    "pending",
    "connecting", 
    "synchronizing",
    "connected",
    "disconnected",
    "disconnecting",
    "error",
    "auth_failed", 
    "logged_out",
    "reconnecting",
    "conflict",
    "deleted",
    "archived"    // <-- NEW
  ),
  defaultValue: "pending",
},
```

### Task 3: Capture Real Phone Number on Connection
**File:** `src/services/whatsapp/ConnectionHandler.js`

Modify connection open handler (around line 270):
```javascript
if (connection === "open") {
  this.service.sessionManager.resetReconnectAttempts(sessionId);
  this.service.qrAttempts.delete(sessionId);
  this.service.sessionManager.clearQRTimeout(sessionId);

  // Capture real phone number from WhatsApp
  const connectedJid = sock.user?.id;
  let realPhoneNumber = null;
  if (connectedJid) {
    // Format: "628123456789:5@s.whatsapp.net" or "628123456789@s.whatsapp.net"
    realPhoneNumber = connectedJid.includes(':') 
      ? connectedJid.split(':')[0]
      : connectedJid.split('@')[0];
  }

  await device.update({
    status: "connected",
    realPhoneNumber: realPhoneNumber,
    lastConnection: getJakartaTime(),
    lastError: null,
  });

  console.log(`[CONNECTION] Session ${sessionId} connected with phone: ${realPhoneNumber}`);
  // ... rest of code
}
```

### Task 4: Create Chat History Migration Service
**File:** `src/services/ChatHistoryMigrationService.js`

Core migration logic class with methods:
- `getArchivedDevices(userId)` - List archived devices for user
- `getConversationsByDevice(deviceId)` - Get chat list for device
- `getMessagesByChat(deviceId, chatId, page, limit)` - Get paginated messages
- `previewRestore(sourceDeviceId, targetDeviceId, options)` - Preview what will be restored
- `executeRestore(sourceDeviceId, targetDeviceId, options)` - Execute restoration

### Task 5: Create Archive Controller
**File:** `src/controllers/chatHistoryArchiveController.js`

Endpoints:
- `GET /api/devices/archived` - List archived devices
- `POST /api/devices/:id/archive` - Archive a device
- `GET /api/chat-history/devices/:deviceId/conversations` - Get conversations
- `GET /api/chat-history/devices/:deviceId/messages/:chatId` - Get messages
- `POST /api/chat-history/restore` - Execute restore
- `GET /api/chat-history/restore/preview` - Preview restore

### Task 6: Create Frontend - Chat History Archive Page
**File:** `client/src/pages/ChatHistoryArchive.jsx`

Features:
- Device selector dropdown (shows archived devices)
- Conversation list (left panel)
- Message viewer (right panel, WhatsApp-like bubbles)
- Search/filter functionality
- Restore button with modal

### Task 7: Create Frontend - Restore Modal
**File:** `client/src/components/history/RestoreModal.jsx`

Features:
- Target device selector
- Restore options (all/matching/selected)
- Preview summary
- Confirmation button

### Task 8: Update Devices Page
**File:** `client/src/pages/Devices.jsx`

Changes:
- Add "Archive" button to device cards (instead of delete for devices with data)
- Add "archived" status badge with orange color
- Hide archived devices from main list (show in separate section or link to History page)
- Show real phone number if available

### Task 9: Add Routing & Navigation
**Files:**
- `client/src/App.jsx` - Add route `/chat-history`
- `client/src/components/layout/Sidebar.jsx` - Add menu item

### Task 10: Add Translations
**File:** `client/src/context/LanguageContext.jsx`

Add translations for:
- Archive related text
- Chat history page labels
- Restore modal text
- Status badges

---

## 🚦 Implementation Priority

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 🔴 High | Task 1-2: Database migration & model update | 2h | Foundation |
| 🔴 High | Task 3: Capture real phone number | 1h | Critical |
| 🔴 High | Task 4: Migration service | 4h | Core feature |
| 🟡 Medium | Task 5: Archive controller & routes | 2h | API layer |
| 🟡 Medium | Task 6: History archive page | 4h | User-facing |
| 🟡 Medium | Task 7: Restore modal | 2h | User-facing |
| 🟢 Low | Task 8: Update devices page | 2h | UX improvement |
| 🟢 Low | Task 9-10: Routing & translations | 1h | Polish |

**Total Estimated Effort: ~18 hours**

---

## 🔒 Data Safety Guarantees

1. **Original data never deleted** - Archive copies data, doesn't move it
2. **Restoration creates copies** - Original archived data remains intact
3. **Rollback possible** - Restored data can be identified by `restoredFromDeviceId`
4. **Deduplication** - Messages matched by `messageId` to prevent duplicates
