# Chat Management Guide

## 1. How to Delete a Chat and Its History

### Backend API Endpoint
**DELETE** `/api/whatsapp/devices/:deviceId/chat-settings/:phoneNumber`

### Example Usage
```javascript
// Delete a chat
const deleteChat = async (deviceId, phoneNumber) => {
  const response = await fetch(
    `http://localhost:3000/api/whatsapp/devices/${deviceId}/chat-settings/${phoneNumber}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const result = await response.json();
  console.log(result);
  // {
  //   success: true,
  //   message: "Chat and history deleted successfully",
  //   deletedMessages: 42
  // }
};
```

### What Gets Deleted
1. **ChatSettings** record - All chat configuration and metadata
2. **ChatHistory** records - All message history for that chat
3. The chat will disappear from the chat list

### Important Notes
- This action is **irreversible**
- All messages, media URLs, and conversation history will be permanently deleted
- The chat will reappear if a new message is received from that number

---

## 2. Real-Time Chat Handling

### How It Works

#### A. New Incoming Messages (Real-Time)
YES, it's **100% real-time** via WebSocket!

**Flow:**
1. WhatsApp message arrives → Baileys socket receives it
2. `ConnectionHandler` broadcasts via WebSocket (`messages.upsert` event)
3. Frontend (`Chats.jsx`) listens and updates UI immediately
4. `MessageHandler` processes and saves to database
5. Creates/updates `ChatSettings` automatically

**Code Location:**
- Backend: `src/services/whatsapp/ConnectionHandler.js` (lines 337-368)
- Frontend: `client/src/pages/Chats.jsx` (WebSocket `onmessage` handler)

#### B. New Chat from Unknown Number
**Automatic Handling:**

1. **First Message Arrives:**
   ```javascript
   // MessageHandler.js - handleIncomingMessage()
   if (!chatSettings) {
     chatSettings = await ChatSettings.create({
       userId: device.userId,
       sessionId: device.sessionId,
       deviceId: device.id,
       chatId: effectiveSender,
       phoneNumber: phoneNumber,
       contactName: message.pushName || "Unknown",
       lastMessageContent: messageContent,
       lastMessageDirection: "incoming",
       lastMessageTimestamp: new Date(),
       aiEnabled: true,
     });
   }
   ```

2. **Chat List Updates:**
   - New chat appears in the list automatically
   - Sorted by `lastMessageTimestamp` (most recent first)
   - Shows contact name from WhatsApp or "Unknown"

3. **Real-Time Notification:**
   - WebSocket broadcasts the message
   - Frontend can show notification badge
   - Chat list refreshes automatically

#### C. Unopened Chat Handling

**Scenario 1: User hasn't opened the chat yet**
- Messages accumulate in `ChatHistory`
- `ChatSettings.lastMessageContent` updates with each new message
- `ChatSettings.lastMessageTimestamp` updates
- Chat moves to top of list with each new message
- All messages are saved and will appear when user opens the chat

**Scenario 2: Chat is open in another tab/device**
- WebSocket ensures all connected clients receive updates
- Messages sync across all open sessions
- No message loss or duplication

### WebSocket Events

#### 1. `messages.upsert`
Sent when new messages arrive (incoming or outgoing)

```javascript
{
  type: "messages.upsert",
  sessionId: "1-test2",
  data: {
    messages: [
      {
        key: { remoteJid: "6281234567890@s.whatsapp.net", fromMe: false, id: "..." },
        message: { conversation: "Hello!" },
        messageTimestamp: 1234567890,
        pushName: "John Doe"
      }
    ]
  },
  timestamp: "2026-01-10T02:00:00.000Z"
}
```

#### 2. `message_update`
Sent when message metadata updates (e.g., media URL after upload)

```javascript
{
  type: "message_update",
  sessionId: "1-test2",
  data: {
    messageId: "3EB0ABC123...",
    mediaUrl: "https://cdn.example.com/image.jpg"
  },
  timestamp: "2026-01-10T02:00:05.000Z"
}
```

#### 3. `session_update`
Sent when device connection status changes

```javascript
{
  type: "session_update",
  sessionId: "1-test2",
  status: "connected",
  timestamp: "2026-01-10T02:00:00.000Z"
}
```

### Frontend Implementation Example

```javascript
// In Chats.jsx
useEffect(() => {
  const ws = new WebSocket(`ws://localhost:3001?token=${API_TOKEN}`);
  
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      sessionId: selectedDevice.sessionId
    }));
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    // Handle new messages
    if (data.type === "messages.upsert") {
      const newMsgs = data.data.messages;
      
      // Update chat list (new chats appear automatically)
      refreshChatList();
      
      // Update current chat if it's the active one
      if (selectedChat) {
        const relevant = newMsgs.filter(m => 
          m.key.remoteJid === selectedChat.chatId
        );
        if (relevant.length) {
          setMessages(prev => [...prev, ...relevant]);
        }
      }
    }
    
    // Handle media updates
    if (data.type === "message_update") {
      setMessages(prev => prev.map(msg => {
        if (msg.key?.id === data.data.messageId) {
          return { ...msg, mediaUrl: data.data.mediaUrl };
        }
        return msg;
      }));
    }
  };
  
  return () => ws.close();
}, [selectedDevice]);
```

### Database Schema

#### ChatSettings Table
```sql
CREATE TABLE ChatSettings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  deviceId INT NOT NULL,
  sessionId VARCHAR(255) NOT NULL,
  chatId VARCHAR(255) NOT NULL,           -- WhatsApp JID (e.g., "6281234567890@s.whatsapp.net")
  phoneNumber VARCHAR(50),                 -- Clean phone number
  contactName VARCHAR(255),                -- Contact display name
  lastMessageContent TEXT,                 -- Preview of last message
  lastMessageDirection ENUM('incoming', 'outgoing'),
  lastMessageTimestamp DATETIME,           -- For sorting chats
  aiEnabled BOOLEAN DEFAULT true,
  humanTakeover BOOLEAN DEFAULT false,
  assignedAgentId INT,
  assignedAgentName VARCHAR(255),
  -- ... other fields
  UNIQUE KEY unique_device_chat (deviceId, chatId)
);
```

#### ChatHistory Table
```sql
CREATE TABLE ChatHistory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deviceId INT NOT NULL,
  sessionId VARCHAR(255) NOT NULL,
  chatId VARCHAR(255) NOT NULL,
  phoneNumber VARCHAR(50),
  messageId VARCHAR(255) UNIQUE,           -- WhatsApp message ID
  direction ENUM('incoming', 'outgoing'),
  messageType ENUM('text', 'image', 'video', 'audio', 'document', 'sticker'),
  content TEXT,                            -- Message text or description
  caption TEXT,                            -- For media messages
  mediaUrl TEXT,                           -- CDN URL for media
  timestamp DATETIME,
  fromMe BOOLEAN,
  senderName VARCHAR(255),                 -- For incoming: contact name
  agentId INT,                             -- For outgoing: which agent sent it
  agentName VARCHAR(255),
  isAiGenerated BOOLEAN DEFAULT false,
  -- ... other fields
);
```

### Performance Considerations

1. **Chat List Pagination:**
   - Default: 50 chats per page
   - Use `limit` and `offset` query params
   - Sorted by `lastMessageTimestamp DESC`

2. **Message History:**
   - Load last 50 messages initially
   - Implement infinite scroll for older messages
   - Use `before` timestamp for pagination

3. **WebSocket Efficiency:**
   - Only one WebSocket connection per device/session
   - Messages filtered by `remoteJid` on frontend
   - Automatic reconnection on disconnect

### Common Patterns

#### Pattern 1: Delete Chat with Confirmation
```javascript
const handleDeleteChat = async (chat) => {
  if (!confirm(`Delete chat with ${chat.contactName}? This will remove all ${chat.messageCount} messages.`)) {
    return;
  }
  
  try {
    await axios.delete(
      `/api/whatsapp/devices/${deviceId}/chat-settings/${chat.phoneNumber}`
    );
    
    // Remove from local state
    setChats(prev => prev.filter(c => c.phoneNumber !== chat.phoneNumber));
    
    // Clear selected chat if it was deleted
    if (selectedChat?.phoneNumber === chat.phoneNumber) {
      setSelectedChat(null);
      setMessages([]);
    }
    
    toast.success('Chat deleted successfully');
  } catch (error) {
    toast.error('Failed to delete chat');
  }
};
```

#### Pattern 2: Handle New Chat Notification
```javascript
const [unreadChats, setUnreadChats] = useState(new Set());

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === "messages.upsert") {
    const newMsgs = data.data.messages;
    
    newMsgs.forEach(msg => {
      if (!msg.key.fromMe) {
        const chatId = msg.key.remoteJid;
        
        // If chat is not currently open, mark as unread
        if (selectedChat?.chatId !== chatId) {
          setUnreadChats(prev => new Set([...prev, chatId]));
        }
      }
    });
    
    // Refresh chat list to show new chat or update position
    refreshChatList();
  }
};
```

---

## Summary

✅ **Chat Deletion:** Fully implemented via DELETE endpoint  
✅ **Real-Time Updates:** 100% real-time via WebSocket  
✅ **New Chats:** Automatically created and appear in list  
✅ **Unopened Chats:** Messages accumulate, ready when opened  
✅ **Multi-Device:** WebSocket ensures sync across all clients  

The system is designed to handle all scenarios automatically with minimal frontend logic required!
