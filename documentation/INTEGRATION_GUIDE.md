# WhatsApp API Integration Guide

Complete guide for integrating the WhatsApp Multi-Device API into your projects with curl examples, code samples, and best practices.

## Table of Contents

- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Device Management](#device-management)
- [Message Sending](#message-sending)
- [File Management](#file-management)
- [Contact & Chat Management](#contact--chat-management)
- [AI Features](#ai-features)
- [Webhooks](#webhooks)
- [Business Templates](#business-templates)
- [Warmer System](#warmer-system)
- [Admin Operations](#admin-operations)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Best Practices](#best-practices)

---

## Quick Start

### Prerequisites

```bash
# Base URL (adjust for your environment)
API_BASE="http://localhost:3000"

# Your API token (from .env file: API_TOKEN)
API_TOKEN="your-api-token-here"

# Your user ID (unique identifier for your application/user)
USER_ID="your_user_id"
```

### Test Connection

```bash
# Test if API is accessible
curl -X GET "${API_BASE}/api/whatsapp/server/stats" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeSessions": 2,
    "totalDevices": 5,
    "totalMessages": 1234,
    "uptime": 86400,
    "memory": 45.2,
    "cpu": 12.5
  }
}
```

---

## Authentication

All API requests require the `X-API-Token` header.

### Standard Authentication

```bash
curl -X GET "${API_BASE}/api/whatsapp/users/${USER_ID}/devices" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json"
```

### Admin Authentication

Admin endpoints require an additional `X-Admin-Token` header:

```bash
curl -X GET "${API_BASE}/api/whatsapp/admin/ai/providers" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "X-Admin-Token: ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json"
```

### Device-Specific Authentication

Some endpoints support device-specific API keys:

```bash
curl -X POST "${API_BASE}/api/whatsapp/device/send" \
  -H "X-Device-API-Key: ${DEVICE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "message": "Hello!"
  }'
```

---

## Device Management

### 1. Create a New Device & Display QR Code

Creating a device and connecting it to WhatsApp requires two steps:
1. Create the device via API
2. Connect to WebSocket to receive real-time QR codes

#### Step 1: Create Device

```bash
curl -X POST "${API_BASE}/api/whatsapp/devices" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'${USER_ID}'",
    "alias": "my-business-phone"
  }'
```

**Response:**
```json
{
  "success": true,
  "device": {
    "id": 1,
    "userId": "your_user_id",
    "alias": "my-business-phone",
    "sessionId": "user_your_user_id_device_my-business-phone",
    "status": "pending",
    "apiKey": "dev_abc123xyz..."
  },
  "qr": "2@abc123...",
  "message": "Device created successfully. Please scan the QR code."
}
```

**Note:** The `qr` field may be present in the response if QR code is generated immediately. If not, you'll receive it via WebSocket.

#### Step 2: Connect to WebSocket for Real-Time QR Updates

After creating a device, connect to WebSocket to receive QR codes and connection status updates:

**JavaScript/Node.js Example:**

```javascript
const WebSocket = require('ws');

// Configuration
const API_BASE = 'http://localhost:3000';
const WS_BASE = 'ws://localhost:3001';
const API_TOKEN = 'test123';
const USER_ID = 'your_user_id';

async function createDeviceAndShowQR() {
  try {
    // Step 1: Create device
    const response = await fetch(`${API_BASE}/api/whatsapp/devices`, {
      method: 'POST',
      headers: {
        'X-API-Token': API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: USER_ID,
        alias: 'my-business-phone'
      })
    });

    const data = await response.json();
    console.log('Device created:', data.device);

    // Step 2: Connect to WebSocket
    const ws = new WebSocket(`${WS_BASE}?token=${API_TOKEN}`);

    ws.on('open', () => {
      console.log('WebSocket connected');
      
      // Subscribe to the specific session for QR codes
      ws.send(JSON.stringify({
        type: 'subscribe',
        sessionId: data.device.sessionId
      }));
      console.log(`Subscribed to session: ${data.device.sessionId}`);
    });

    ws.on('message', (message) => {
      const event = JSON.parse(message.toString());
      console.log('Event received:', event.type);

      // Handle QR code
      if (event.type === 'qr' && event.sessionId === data.device.sessionId) {
        console.log('QR Code received!');
        displayQRCode(event.qr); // See display function below
      }

      // Handle connection success
      if (event.type === 'connection' && event.status === 'connected') {
        console.log('Device connected successfully!');
        console.log('Phone number:', event.phoneNumber);
        ws.close(); // Close WebSocket after successful connection
      }

      // Handle session updates
      if (event.type === 'session_update') {
        console.log(`Session status: ${event.status}`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('WebSocket closed');
    });

    // If QR is immediately available, display it
    if (data.qr) {
      console.log('QR code available immediately');
      displayQRCode(data.qr);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Function to display QR code
function displayQRCode(qrData) {
  // Option 1: Using qrcode-terminal (npm install qrcode-terminal)
  const qrcode = require('qrcode-terminal');
  qrcode.generate(qrData, { small: true });

  // Option 2: Using qrcode library to generate image (npm install qrcode)
  const QRCode = require('qrcode');
  QRCode.toDataURL(qrData, (err, url) => {
    if (!err) {
      console.log('QR Code Data URL:', url);
      // You can display this in HTML: <img src="${url}" />
    }
  });

  // Option 3: Save as PNG file
  QRCode.toFile('./qr-code.png', qrData, {
    width: 300,
    margin: 2
  }, (err) => {
    if (!err) {
      console.log('QR code saved to qr-code.png');
    }
  });
}

// Run the function
createDeviceAndShowQR();
```

#### HTML/Browser Example with QR Display

```html
<!DOCTYPE html>
<html>
<head>
  <title>WhatsApp Device Connection</title>
  <script src="https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs@master/qrcode.min.js"></script>
</head>
<body>
  <div>
    <h2>Create WhatsApp Device</h2>
    <input type="text" id="userId" placeholder="User ID" value="test_user_123">
    <input type="text" id="alias" placeholder="Device Alias" value="my-phone">
    <button onclick="createDevice()">Create Device</button>
  </div>

  <div id="status" style="margin-top: 20px;"></div>
  
  <div id="qrContainer" style="margin-top: 20px; display: none;">
    <h3>Scan QR Code with WhatsApp</h3>
    <div id="qrcode"></div>
    <p id="sessionInfo"></p>
  </div>

  <script>
    const API_BASE = 'http://localhost:3000';
    const WS_BASE = 'ws://localhost:3001';
    const API_TOKEN = 'test123';
    
    let ws = null;
    let currentSessionId = null;

    async function createDevice() {
      const userId = document.getElementById('userId').value;
      const alias = document.getElementById('alias').value;
      const statusDiv = document.getElementById('status');
      const qrContainer = document.getElementById('qrContainer');

      try {
        statusDiv.innerHTML = '<p>Creating device...</p>';

        // Step 1: Create device
        const response = await fetch(`${API_BASE}/api/whatsapp/devices`, {
          method: 'POST',
          headers: {
            'X-API-Token': API_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId, alias })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create device');
        }

        currentSessionId = data.device.sessionId;
        statusDiv.innerHTML = `
          <p><strong>Device Created!</strong></p>
          <p>Session ID: ${data.device.sessionId}</p>
          <p>Device ID: ${data.device.id}</p>
          <p>API Key: ${data.device.apiKey.substring(0, 20)}...</p>
          <p>Status: ${data.device.status}</p>
        `;

        // Step 2: Connect to WebSocket
        connectWebSocket(data.device.sessionId);

        // Step 3: Show immediate QR if available
        if (data.qr) {
          displayQR(data.qr, data.device.sessionId);
        } else {
          statusDiv.innerHTML += '<p>Waiting for QR code from WebSocket...</p>';
        }

      } catch (error) {
        statusDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        console.error('Error:', error);
      }
    }

    function connectWebSocket(sessionId) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }

      ws = new WebSocket(`${WS_BASE}?token=${API_TOKEN}`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        document.getElementById('status').innerHTML += '<p>✅ WebSocket connected</p>';

        // Subscribe to session for QR codes
        ws.send(JSON.stringify({
          type: 'subscribe',
          sessionId: sessionId
        }));
        console.log('Subscribed to session:', sessionId);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);

        // Only handle messages for our session
        if (data.sessionId === currentSessionId) {
          if (data.type === 'qr' && data.qr) {
            displayQR(data.qr, data.sessionId);
          }

          if (data.type === 'connection' && data.status === 'connected') {
            document.getElementById('status').innerHTML += `
              <p style="color: green;"><strong>✅ Device Connected!</strong></p>
              <p>Phone: ${data.phoneNumber}</p>
            `;
            document.getElementById('qrContainer').style.display = 'none';
            ws.close();
          }

          if (data.type === 'session_update') {
            document.getElementById('status').innerHTML += 
              `<p>Status update: ${data.status}</p>`;
          }
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        document.getElementById('status').innerHTML += 
          '<p style="color: red;">WebSocket error occurred</p>';
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        document.getElementById('status').innerHTML += 
          '<p>WebSocket disconnected</p>';
      };
    }

    function displayQR(qrData, sessionId) {
      const qrContainer = document.getElementById('qrContainer');
      const qrDiv = document.getElementById('qrcode');
      const sessionInfo = document.getElementById('sessionInfo');

      // Clear previous QR code
      qrDiv.innerHTML = '';

      // Generate QR code using QRCode.js library
      new QRCode(qrDiv, {
        text: qrData,
        width: 300,
        height: 300,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });

      sessionInfo.textContent = `Session: ${sessionId}`;
      qrContainer.style.display = 'block';

      console.log('QR Code displayed for session:', sessionId);
    }
  </script>
</body>
</html>
```

#### Python Example with QR Display

```python
import requests
import websocket
import json
import qrcode
from io import BytesIO
from PIL import Image

API_BASE = 'http://localhost:3000'
WS_BASE = 'ws://localhost:3001'
API_TOKEN = 'test123'

def create_device_and_show_qr(user_id, alias):
    # Step 1: Create device
    response = requests.post(
        f'{API_BASE}/api/whatsapp/devices',
        headers={
            'X-API-Token': API_TOKEN,
            'Content-Type': 'application/json'
        },
        json={
            'userId': user_id,
            'alias': alias
        }
    )
    
    data = response.json()
    print(f"Device created: {data['device']['sessionId']}")
    print(f"Device ID: {data['device']['id']}")
    print(f"API Key: {data['device']['apiKey'][:20]}...")
    
    session_id = data['device']['sessionId']
    
    # Display immediate QR if available
    if 'qr' in data:
        display_qr(data['qr'])
    
    # Step 2: Connect to WebSocket for real-time updates
    def on_message(ws, message):
        event = json.loads(message)
        print(f"Event: {event['type']}")
        
        if event['sessionId'] == session_id:
            if event['type'] == 'qr' and 'qr' in event:
                print("New QR code received!")
                display_qr(event['qr'])
            
            if event['type'] == 'connection' and event.get('status') == 'connected':
                print(f"✅ Device connected! Phone: {event.get('phoneNumber')}")
                ws.close()
    
    def on_open(ws):
        print("WebSocket connected")
        # Subscribe to session
        ws.send(json.dumps({
            'type': 'subscribe',
            'sessionId': session_id
        }))
        print(f"Subscribed to session: {session_id}")
    
    def on_error(ws, error):
        print(f"WebSocket error: {error}")
    
    def on_close(ws, close_status_code, close_msg):
        print("WebSocket closed")
    
    # Connect to WebSocket
    ws_url = f"{WS_BASE}?token={API_TOKEN}"
    ws = websocket.WebSocketApp(
        ws_url,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )
    
    ws.run_forever()

def display_qr(qr_data):
    """Display QR code in terminal and save as image"""
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Display in terminal
    qr.print_ascii(invert=True)
    
    # Save as image
    img = qr.make_image(fill_color="black", back_color="white")
    img.save("qr-code.png")
    print("QR code saved to qr-code.png")

# Usage
if __name__ == '__main__':
    create_device_and_show_qr('test_user_123', 'my-business-phone')
```

#### PHP Example

```php
<?php
require 'vendor/autoload.php'; // For WebSocket client

use WebSocket\Client;

$API_BASE = 'http://localhost:3000';
$WS_BASE = 'ws://localhost:3001';
$API_TOKEN = 'test123';

function createDeviceAndShowQR($userId, $alias) {
    global $API_BASE, $WS_BASE, $API_TOKEN;
    
    // Step 1: Create device
    $ch = curl_init("$API_BASE/api/whatsapp/devices");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-API-Token: ' . $API_TOKEN,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'userId' => $userId,
        'alias' => $alias
    ]));
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    echo "Device created: {$data['device']['sessionId']}\n";
    echo "Device ID: {$data['device']['id']}\n";
    
    $sessionId = $data['device']['sessionId'];
    
    // Display immediate QR if available
    if (isset($data['qr'])) {
        displayQR($data['qr']);
    }
    
    // Step 2: Connect to WebSocket
    $client = new Client("$WS_BASE?token=$API_TOKEN");
    
    // Subscribe to session
    $client->send(json_encode([
        'type' => 'subscribe',
        'sessionId' => $sessionId
    ]));
    echo "Subscribed to session: $sessionId\n";
    
    // Listen for messages
    while (true) {
        try {
            $message = $client->receive();
            $event = json_decode($message, true);
            
            if ($event['sessionId'] === $sessionId) {
                if ($event['type'] === 'qr' && isset($event['qr'])) {
                    echo "New QR code received!\n";
                    displayQR($event['qr']);
                }
                
                if ($event['type'] === 'connection' && $event['status'] === 'connected') {
                    echo "✅ Device connected! Phone: {$event['phoneNumber']}\n";
                    break;
                }
            }
        } catch (Exception $e) {
            echo "Error: {$e->getMessage()}\n";
            break;
        }
    }
    
    $client->close();
}

function displayQR($qrData) {
    // Using chillerlan/php-qrcode library
    $qrcode = (new \chillerlan\QRCode\QRCode)->render($qrData);
    
    // Save to file
    file_put_contents('qr-code.png', $qrcode);
    echo "QR code saved to qr-code.png\n";
    
    // Or display as ASCII in terminal
    echo "Scan this QR code with WhatsApp:\n";
    echo $qrcode . "\n";
}

// Usage
createDeviceAndShowQR('test_user_123', 'my-business-phone');
?>
```

### 2. Get QR Code (Alternative Method)

If you missed the QR code during device creation, you can retrieve it later:

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/qr" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response (Success):**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "status": "pending"
}
```

**Response (Already Connected):**
```json
{
  "success": false,
  "error": "Device is already connected or QR code not available"
}
```

**Note:** This endpoint returns a data URL that can be directly used in an `<img>` tag. For real-time QR updates (recommended), use WebSocket as shown in the examples above.

### 3. List User's Devices

```bash
curl -X GET "${API_BASE}/api/whatsapp/users/${USER_ID}/devices" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "alias": "my-business-phone",
      "sessionId": "user_123_device_my-business-phone",
      "status": "connected",
      "phoneNumber": "+1234567890",
      "connectedAt": "2026-01-03T12:00:00.000Z"
    }
  ]
}
```

### 4. Get Device Details

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 5. Update Device

```bash
curl -X PUT "${API_BASE}/api/whatsapp/devices/1" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "updated-alias",
    "metadata": {
      "department": "sales",
      "location": "NYC"
    }
  }'
```

### 6. Logout Device

```bash
curl -X POST "${API_BASE}/api/whatsapp/devices/1/logout" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 7. Login/Reconnect Device

```bash
curl -X POST "${API_BASE}/api/whatsapp/devices/1/login" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response includes new QR code if needed**

### 8. Delete Device

```bash
curl -X DELETE "${API_BASE}/api/whatsapp/devices/1" \
  -H "X-API-Token: ${API_TOKEN}"
```

---

## WebSocket Events

The WhatsApp API uses WebSocket for real-time events like QR codes, connection status, and incoming messages.

### Connection

Connect to WebSocket:
```
ws://localhost:3001?token=YOUR_API_TOKEN
```

### Subscribe to a Session

After connecting, subscribe to receive events for a specific session:

```json
{
  "type": "subscribe",
  "sessionId": "user_123_device_my-business-phone"
}
```

### Event Types

#### 1. QR Code Event

Sent when a new QR code is generated and needs to be scanned:

```json
{
  "type": "qr",
  "sessionId": "user_123_device_my-business-phone",
  "qr": "2@abc123xyz..."
}
```

**Usage:** Display this QR code for the user to scan with WhatsApp mobile app.

#### 2. Connection Event

Sent when device successfully connects to WhatsApp:

```json
{
  "type": "connection",
  "sessionId": "user_123_device_my-business-phone",
  "status": "connected",
  "phoneNumber": "+1234567890"
}
```

**Status values:**
- `pending` - Waiting for QR scan
- `connecting` - Establishing connection
- `connected` - Successfully connected
- `disconnected` - Connection lost
- `logged_out` - User logged out
- `error` - Connection error

#### 3. Session Update Event

Sent when session status changes:

```json
{
  "type": "session_update",
  "sessionId": "user_123_device_my-business-phone",
  "status": "connecting"
}
```

#### 4. Message Event

Sent when a new message is received:

```json
{
  "type": "message",
  "sessionId": "user_123_device_my-business-phone",
  "message": {
    "id": "msg123",
    "from": "1234567890@s.whatsapp.net",
    "body": "Hello!",
    "timestamp": 1704283200
  }
}
```

### Complete WebSocket Flow Example

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001?token=test123');

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  
  // Subscribe to session
  ws.send(JSON.stringify({
    type: 'subscribe',
    sessionId: 'user_123_device_my-business-phone'
  }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data.toString());
  
  switch(event.type) {
    case 'qr':
      console.log('📱 QR Code received - display to user');
      displayQRCode(event.qr);
      break;
      
    case 'connection':
      if (event.status === 'connected') {
        console.log(`✅ Connected! Phone: ${event.phoneNumber}`);
        ws.close(); // Close after successful connection
      }
      break;
      
    case 'session_update':
      console.log(`📊 Status: ${event.status}`);
      break;
      
    case 'message':
      console.log(`💬 New message from ${event.message.from}`);
      handleIncomingMessage(event.message);
      break;
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
  console.log('🔌 WebSocket closed');
});
```

### WebSocket Best Practices

1. **Always subscribe after connecting:** Send the `subscribe` message immediately after `ws.onopen`
2. **Handle reconnections:** Implement exponential backoff for reconnection attempts
3. **Filter by sessionId:** Always check `event.sessionId` matches your tracked session
4. **Close after connection:** Close WebSocket after device successfully connects
5. **Handle QR expiration:** QR codes expire after 60 seconds - generate new ones if needed
6. **Error handling:** Always implement error handlers to catch connection issues

---

## Message Sending

### 1. Send Text Message

```bash
curl -X POST "${API_BASE}/api/whatsapp/send" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "user_123_device_my-business-phone",
    "phoneNumber": "+1234567890",
    "message": "Hello! This is a test message."
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_abc123",
    "status": "sent",
    "timestamp": "2026-01-03T12:00:00.000Z"
  }
}
```

### 2. Send Image

First, upload the image:

```bash
curl -X POST "${API_BASE}/api/whatsapp/files/upload" \
  -H "X-API-Token: ${API_TOKEN}" \
  -F "file=@/path/to/image.jpg" \
  -F "userId=${USER_ID}" \
  -F "description=Product image"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fileId": "file_abc123",
    "filename": "image.jpg",
    "size": 123456,
    "mimetype": "image/jpeg",
    "url": "/api/whatsapp/files/file_abc123"
  }
}
```

Then send it:

```bash
curl -X POST "${API_BASE}/api/whatsapp/send/image" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "user_123_device_my-business-phone",
    "phoneNumber": "+1234567890",
    "fileId": "file_abc123",
    "caption": "Check out our new product!"
  }'
```

### 3. Send Video

```bash
curl -X POST "${API_BASE}/api/whatsapp/send/video" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "user_123_device_my-business-phone",
    "phoneNumber": "+1234567890",
    "fileId": "file_video123",
    "caption": "Tutorial video"
  }'
```

### 4. Send Document

```bash
curl -X POST "${API_BASE}/api/whatsapp/send/document" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "user_123_device_my-business-phone",
    "phoneNumber": "+1234567890",
    "fileId": "file_doc123",
    "filename": "invoice.pdf",
    "caption": "Your invoice"
  }'
```

### 5. Bulk Send Messages

```bash
curl -X POST "${API_BASE}/api/whatsapp/send/bulk" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "user_123_device_my-business-phone",
    "recipients": [
      {
        "phoneNumber": "+1234567890",
        "fileId": "file_abc123",
        "caption": "Hello John!"
      },
      {
        "phoneNumber": "+0987654321",
        "fileId": "file_abc123",
        "caption": "Hello Jane!"
      }
    ]
  }'
```

### 6. Send Mixed Media

```bash
curl -X POST "${API_BASE}/api/whatsapp/send/mixed" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "user_123_device_my-business-phone",
    "phoneNumber": "+1234567890",
    "files": [
      {
        "fileId": "file_img1",
        "type": "image",
        "caption": "Product 1"
      },
      {
        "fileId": "file_img2",
        "type": "image",
        "caption": "Product 2"
      },
      {
        "fileId": "file_doc1",
        "type": "document",
        "caption": "Catalog PDF"
      }
    ]
  }'
```

### 7. Get Message Status

```bash
curl -X GET "${API_BASE}/api/whatsapp/messages/msg_abc123/status" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_abc123",
    "status": "delivered",
    "sentAt": "2026-01-03T12:00:00.000Z",
    "deliveredAt": "2026-01-03T12:00:05.000Z",
    "readAt": null
  }
}
```

### 8. Resend Failed Message

```bash
curl -X POST "${API_BASE}/api/whatsapp/messages/msg_abc123/resend" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 9. Get Messages History

```bash
# Get all messages for a device and contact
curl -X GET "${API_BASE}/api/whatsapp/devices/1/messages/1234567890@s.whatsapp.net" \
  -H "X-API-Token: ${API_TOKEN}"

# Get user's message logs with filters
curl -X GET "${API_BASE}/api/whatsapp/users/${USER_ID}/message-logs?limit=50&status=sent" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 10. Get Sending Statistics

```bash
curl -X GET "${API_BASE}/api/whatsapp/users/${USER_ID}/sending-stats" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSent": 1234,
    "totalFailed": 12,
    "successRate": 99.03,
    "today": {
      "sent": 45,
      "failed": 1
    },
    "thisWeek": {
      "sent": 321,
      "failed": 5
    },
    "byStatus": {
      "sent": 1100,
      "delivered": 1050,
      "read": 980,
      "failed": 12
    }
  }
}
```

---

## File Management

### 1. Upload File

```bash
curl -X POST "${API_BASE}/api/whatsapp/files/upload" \
  -H "X-API-Token: ${API_TOKEN}" \
  -F "file=@/path/to/file.jpg" \
  -F "userId=${USER_ID}" \
  -F "description=Product image" \
  -F "tags=product,catalog,new"
```

**Supported file types:**
- Images: JPG, PNG, GIF, WebP
- Videos: MP4, AVI, MOV
- Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- Audio: MP3, WAV, OGG

### 2. Get File Details

```bash
curl -X GET "${API_BASE}/api/whatsapp/files/file_abc123" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 3. Get User's Files

```bash
# Get all files
curl -X GET "${API_BASE}/api/whatsapp/files/users/${USER_ID}/stats" \
  -H "X-API-Token: ${API_TOKEN}"

# Get files by type
curl -X GET "${API_BASE}/api/whatsapp/files/users/${USER_ID}/image" \
  -H "X-API-Token: ${API_TOKEN}"

# Available types: image, video, document, audio
```

### 4. Delete File

```bash
curl -X DELETE "${API_BASE}/api/whatsapp/files/file_abc123" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 5. Bulk Delete Files

```bash
curl -X DELETE "${API_BASE}/api/whatsapp/files/bulk" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "fileIds": ["file_abc123", "file_def456", "file_ghi789"]
  }'
```

### 6. Get File Preview/Download

```bash
# Preview (no auth required)
curl "${API_BASE}/api/whatsapp/files/file_abc123/preview"

# Download
curl "${API_BASE}/api/whatsapp/files/file_abc123/download" \
  -H "X-API-Token: ${API_TOKEN}" \
  -o downloaded_file.jpg
```

---

## Contact & Chat Management

### 1. Get Device Contacts

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/contacts" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "contacts": [
    {
      "jid": "1234567890@s.whatsapp.net",
      "phoneNumber": "+1234567890",
      "contactName": "John Doe",
      "whatsappName": "John",
      "source": "contact"
    }
  ]
}
```

### 2. Get Device Chats

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/chats" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 3. Get Device Groups

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/groups" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 4. Get User's All Contacts

```bash
curl -X GET "${API_BASE}/api/whatsapp/users/${USER_ID}/contacts" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 5. Sync WhatsApp Data

```bash
curl -X POST "${API_BASE}/api/whatsapp/devices/1/sync" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "includeContacts": true,
    "includeChats": true,
    "includeGroups": true
  }'
```

### 6. Get Contacts from Baileys Store

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/contacts/baileys-store" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 7. Get Profile Picture

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/profile/1234567890@s.whatsapp.net" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 8. Get Presence Status

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/presence/1234567890@s.whatsapp.net" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jid": "1234567890@s.whatsapp.net",
    "presence": "available",
    "lastSeen": "2026-01-03T12:00:00.000Z"
  }
}
```

### 9. Get Business Profile

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/business/1234567890@s.whatsapp.net" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 10. Get Group Members

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/groups/123456@g.us/members" \
  -H "X-API-Token: ${API_TOKEN}"
```

---

## AI Features

### 1. Get Device AI Settings

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/settings/ai" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "aiEnabled": true,
    "autoReply": true,
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 1000,
    "customRules": [
      "Be professional and friendly",
      "Focus on sales"
    ]
  }
}
```

### 2. Update AI Settings

```bash
curl -X PUT "${API_BASE}/api/whatsapp/devices/1/settings/ai" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "aiEnabled": true,
    "autoReply": true,
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.8,
    "customRules": [
      "Be professional and friendly",
      "Focus on customer satisfaction",
      "Provide product recommendations"
    ]
  }'
```

### 3. Test AI

```bash
curl -X POST "${API_BASE}/api/whatsapp/test-ai" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "prompt": "Hello, how can I help you?",
    "temperature": 0.7
  }'
```

### 4. Get Available AI Providers

```bash
curl -X GET "${API_BASE}/api/whatsapp/ai/providers" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "openai",
      "displayName": "OpenAI",
      "status": "active",
      "models": ["gpt-3.5-turbo", "gpt-4"]
    },
    {
      "id": 2,
      "name": "anthropic",
      "displayName": "Anthropic Claude",
      "status": "active",
      "models": ["claude-3-5-sonnet-20241022"]
    }
  ]
}
```

### 5. Get Chat Settings

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/chat-settings" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 6. Get Specific Chat Settings

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/chat-settings/${encodeURIComponent('+1234567890')}" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 7. Update Chat Settings

```bash
curl -X PUT "${API_BASE}/api/whatsapp/devices/1/chat-settings/%2B1234567890" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "aiEnabled": true,
    "autoReply": true,
    "memoryEnabled": true,
    "customRules": [
      "This is a VIP customer",
      "Offer premium support"
    ]
  }'
```

### 8. Get Chat Conversation History

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/chat-settings/%2B1234567890/conversation" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 9. Get Chat Statistics

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/chat-settings/%2B1234567890/stats" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 10. Clear Chat Memory

```bash
curl -X DELETE "${API_BASE}/api/whatsapp/1/1234567890@s.whatsapp.net/memory" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 11. Bulk Update Chat Settings

```bash
curl -X POST "${API_BASE}/api/whatsapp/devices/1/chat-settings/bulk-update" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "chats": [
      {
        "phoneNumber": "+1234567890",
        "aiEnabled": true,
        "autoReply": true
      },
      {
        "phoneNumber": "+0987654321",
        "aiEnabled": false
      }
    ]
  }'
```

---

## Webhooks

### 1. Get Webhook Settings

```bash
curl -X GET "${API_BASE}/api/whatsapp/devices/1/settings/webhook" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 2. Update Webhook Settings

```bash
curl -X PUT "${API_BASE}/api/whatsapp/devices/1/settings/webhook" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://your-server.com/webhook",
    "enabled": true,
    "events": ["message", "connection", "qr", "status"],
    "secret": "your-webhook-secret",
    "retryOnFailure": true,
    "maxRetries": 3
  }'
```

### Webhook Event Payloads

#### Message Event
```json
{
  "event": "message",
  "timestamp": "2026-01-03T12:00:00.000Z",
  "deviceId": "1",
  "sessionId": "user_123_device_business",
  "data": {
    "messageId": "msg_123",
    "from": "1234567890@s.whatsapp.net",
    "fromNumber": "+1234567890",
    "message": "Hello!",
    "type": "text",
    "timestamp": 1704283200000
  }
}
```

#### Connection Event
```json
{
  "event": "connection",
  "timestamp": "2026-01-03T12:00:00.000Z",
  "deviceId": "1",
  "sessionId": "user_123_device_business",
  "data": {
    "status": "connected",
    "phoneNumber": "+1234567890",
    "device": "Device Name"
  }
}
```

#### QR Code Event
```json
{
  "event": "qr",
  "timestamp": "2026-01-03T12:00:00.000Z",
  "deviceId": "1",
  "sessionId": "user_123_device_business",
  "data": {
    "qrCode": "data:image/png;base64,..."
  }
}
```

#### Message Status Event
```json
{
  "event": "status",
  "timestamp": "2026-01-03T12:00:00.000Z",
  "deviceId": "1",
  "sessionId": "user_123_device_business",
  "data": {
    "messageId": "msg_123",
    "status": "delivered",
    "timestamp": 1704283205000
  }
}
```

### Validating Webhook Signatures

If you set a webhook secret, validate incoming webhooks:

```javascript
const crypto = require('crypto');

function validateWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return hash === signature;
}

// In your webhook endpoint:
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = validateWebhook(req.body, signature, WEBHOOK_SECRET);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook...
});
```

---

## Business Templates

### 1. Get All Templates

```bash
curl -X GET "${API_BASE}/api/business-templates" \
  -H "X-API-Token: ${API_TOKEN}"

# Filter by language
curl -X GET "${API_BASE}/api/business-templates?language=en" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 2. Get Business Types

```bash
curl -X GET "${API_BASE}/api/business-templates/types" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "data": [
    "restaurant",
    "retail",
    "ecommerce",
    "salon",
    "gym",
    "hotel",
    "clinic",
    "education",
    "realestate",
    "automotive"
  ]
}
```

### 3. Get Specific Template

```bash
curl -X GET "${API_BASE}/api/business-templates/restaurant/en" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "businessType": "restaurant",
    "language": "en",
    "displayName": "Restaurant",
    "templates": {
      "greeting": "Welcome to {businessName}! How can we serve you today?",
      "menu": "Check out our menu at {menuLink}",
      "reservation": "Your reservation for {partySize} on {date} at {time} is confirmed!",
      "orderConfirmation": "Order #{orderId} confirmed! Total: {total}. ETA: {eta}",
      "delivery": "Your order is out for delivery! Track: {trackingLink}"
    },
    "categories": ["greeting", "sales", "support"],
    "isActive": true
  }
}
```

### 4. Create/Update Template

```bash
curl -X PUT "${API_BASE}/api/business-templates/mycafe/en" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "businessType": "mycafe",
    "language": "en",
    "displayName": "My Cafe",
    "templates": {
      "greeting": "Welcome to {businessName}! ☕",
      "special": "Today'\''s special: {specialItem} - {specialPrice}"
    },
    "categories": ["greeting", "sales"],
    "isActive": true
  }'
```

### 5. Delete Template

```bash
curl -X DELETE "${API_BASE}/api/business-templates/mycafe/en" \
  -H "X-API-Token: ${API_TOKEN}"
```

### Using Templates in Messages

```javascript
// Example: Using template variables
const template = "Welcome to {businessName}! Your order #{orderId} for {productName} is ready.";
const variables = {
  businessName: "Joe's Coffee",
  orderId: "12345",
  productName: "Cappuccino"
};

// Replace variables
let message = template;
for (const [key, value] of Object.entries(variables)) {
  message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
}

// Send the message
fetch(`${API_BASE}/api/whatsapp/send`, {
  method: 'POST',
  headers: {
    'X-API-Token': API_TOKEN,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId: SESSION_ID,
    phoneNumber: '+1234567890',
    message: message
  })
});
```

---

## Warmer System

The warmer system helps warm up new WhatsApp numbers by gradually increasing message volume.

### 1. Create Warmer Campaign

```bash
curl -X POST "${API_BASE}/api/warmer/campaigns" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Number Warmup",
    "deviceId": 1,
    "targetNumbers": ["+1234567890", "+0987654321"],
    "schedule": {
      "startDate": "2026-01-04",
      "endDate": "2026-01-18",
      "timesPerDay": [
        { "time": "09:00", "count": 2 },
        { "time": "14:00", "count": 3 },
        { "time": "18:00", "count": 2 }
      ]
    },
    "settings": {
      "randomizeDelay": true,
      "minDelay": 300,
      "maxDelay": 900,
      "naturalTyping": true
    }
  }'
```

### 2. Get All Campaigns

```bash
curl -X GET "${API_BASE}/api/warmer/campaigns" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 3. Get Campaign Details

```bash
curl -X GET "${API_BASE}/api/warmer/campaigns/1" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 4. Update Campaign

```bash
curl -X PUT "${API_BASE}/api/warmer/campaigns/1" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Campaign",
    "status": "active"
  }'
```

### 5. Pause Campaign

```bash
curl -X POST "${API_BASE}/api/warmer/campaigns/1/pause" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 6. Resume Campaign

```bash
curl -X POST "${API_BASE}/api/warmer/campaigns/1/resume" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 7. Stop Campaign

```bash
curl -X POST "${API_BASE}/api/warmer/campaigns/1/stop" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 8. Delete Campaign

```bash
curl -X DELETE "${API_BASE}/api/warmer/campaigns/1" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 9. Create Conversation Template

```bash
curl -X POST "${API_BASE}/api/warmer/campaigns/1/templates" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Inquiry",
    "messages": [
      {
        "sender": "bot",
        "message": "Hi! Are you interested in {productName}?",
        "delay": 1000
      },
      {
        "sender": "user",
        "message": "Yes, tell me more",
        "delay": 3000
      },
      {
        "sender": "bot",
        "message": "Great! It'\''s available for {price}. Would you like to order?",
        "delay": 2000
      }
    ],
    "variables": ["productName", "price"]
  }'
```

### 10. Get Campaign Statistics

```bash
curl -X GET "${API_BASE}/api/warmer/campaigns/1/stats" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaignId": 1,
    "totalSent": 145,
    "totalSuccess": 142,
    "totalFailed": 3,
    "successRate": 97.93,
    "avgResponseTime": 1234,
    "conversationsStarted": 42,
    "activeConversations": 5
  }
}
```

### 11. Get Conversation Logs

```bash
curl -X GET "${API_BASE}/api/warmer/campaigns/1/logs?limit=50" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 12. Get Available Devices for Warmer

```bash
curl -X GET "${API_BASE}/api/warmer/devices" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 13. Get Default Templates

```bash
curl -X GET "${API_BASE}/api/warmer/templates/defaults" \
  -H "X-API-Token: ${API_TOKEN}"
```

---

## Admin Operations

Admin endpoints require the `X-Admin-Token` header.

### AI Providers Management

#### 1. Get All AI Providers

```bash
curl -X GET "${API_BASE}/api/whatsapp/admin/ai/providers" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "X-Admin-Token: ${ADMIN_TOKEN}"
```

#### 2. Create AI Provider

```bash
curl -X POST "${API_BASE}/api/whatsapp/admin/ai/providers" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "X-Admin-Token: ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom-llm",
    "displayName": "Custom LLM Provider",
    "endpoint": "https://api.custom-llm.com/v1",
    "apiKey": "sk-custom-key...",
    "status": "active"
  }'
```

#### 3. Update AI Provider

```bash
curl -X PUT "${API_BASE}/api/whatsapp/admin/ai/providers/1" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "X-Admin-Token: ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive",
    "apiKey": "new-api-key..."
  }'
```

#### 4. Delete AI Provider

```bash
curl -X DELETE "${API_BASE}/api/whatsapp/admin/ai/providers/1" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "X-Admin-Token: ${ADMIN_TOKEN}"
```

### AI Models Management

#### 5. Get All AI Models

```bash
curl -X GET "${API_BASE}/api/whatsapp/admin/ai/models" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "X-Admin-Token: ${ADMIN_TOKEN}"
```

#### 6. Create AI Model

```bash
curl -X POST "${API_BASE}/api/whatsapp/admin/ai/models" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "X-Admin-Token: ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gpt-4-turbo",
    "providerId": 1,
    "displayName": "GPT-4 Turbo",
    "inputCost": 0.01,
    "outputCost": 0.03,
    "maxTokens": 128000,
    "contextWindow": 128000,
    "status": "active"
  }'
```

#### 7. Update AI Model

```bash
curl -X PUT "${API_BASE}/api/whatsapp/admin/ai/models/1" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "X-Admin-Token: ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "inputCost": 0.005,
    "outputCost": 0.015,
    "status": "active"
  }'
```

#### 8. Delete AI Model

```bash
curl -X DELETE "${API_BASE}/api/whatsapp/admin/ai/models/1" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "X-Admin-Token: ${ADMIN_TOKEN}"
```

### AI Usage Monitoring

#### 9. Get AI Usage Logs

```bash
curl -X GET "${API_BASE}/api/whatsapp/admin/ai/usage-logs?limit=100&provider=openai" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "X-Admin-Token: ${ADMIN_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "provider": "openai",
        "model": "gpt-4",
        "userId": "user_123",
        "deviceId": 1,
        "inputTokens": 150,
        "outputTokens": 300,
        "cost": 0.0195,
        "duration": 1234,
        "timestamp": "2026-01-03T12:00:00.000Z"
      }
    ],
    "total": 1234,
    "totalCost": 45.67
  }
}
```

#### 10. Get AI Cost Alerts

```bash
curl -X GET "${API_BASE}/api/whatsapp/admin/ai/cost-alerts" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "X-Admin-Token: ${ADMIN_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": 1,
        "type": "daily_limit",
        "threshold": 10.00,
        "current": 9.50,
        "triggered": false,
        "date": "2026-01-03"
      },
      {
        "id": 2,
        "type": "monthly_limit",
        "threshold": 100.00,
        "current": 67.80,
        "triggered": false,
        "month": "2026-01"
      }
    ]
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing API token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Codes

```bash
# Authentication errors
INVALID_API_TOKEN          # API token is invalid
INVALID_ADMIN_TOKEN        # Admin token is invalid
MISSING_API_TOKEN          # API token not provided

# Device errors
DEVICE_NOT_FOUND           # Device doesn't exist
DEVICE_NOT_CONNECTED       # Device not connected to WhatsApp
DEVICE_ALREADY_EXISTS      # Device with this alias already exists
SESSION_EXPIRED            # WhatsApp session expired

# Message errors
MESSAGE_SEND_FAILED        # Failed to send message
INVALID_PHONE_NUMBER       # Phone number format invalid
FILE_NOT_FOUND             # Referenced file doesn't exist
MESSAGE_NOT_FOUND          # Message ID not found

# File errors
FILE_TOO_LARGE             # File exceeds size limit
INVALID_FILE_TYPE          # File type not supported
UPLOAD_FAILED              # File upload failed

# Rate limiting
RATE_LIMIT_EXCEEDED        # Too many requests
DAILY_LIMIT_EXCEEDED       # Daily API limit exceeded

# AI errors
AI_PROVIDER_ERROR          # AI provider API error
AI_COST_LIMIT_EXCEEDED     # AI usage cost limit exceeded
INVALID_AI_CONFIG          # AI configuration invalid
```

### Error Handling Example

```javascript
async function sendMessage(sessionId, phoneNumber, message) {
  try {
    const response = await fetch(`${API_BASE}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'X-API-Token': API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        phoneNumber,
        message
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific errors
      switch (data.code) {
        case 'DEVICE_NOT_CONNECTED':
          console.error('Device is not connected. Please scan QR code.');
          // Fetch QR code and display to user
          break;
        
        case 'INVALID_PHONE_NUMBER':
          console.error('Invalid phone number format:', phoneNumber);
          break;
        
        case 'RATE_LIMIT_EXCEEDED':
          console.error('Rate limit exceeded. Waiting before retry...');
          // Implement exponential backoff
          await new Promise(resolve => setTimeout(resolve, 5000));
          return sendMessage(sessionId, phoneNumber, message);
        
        default:
          console.error('Error sending message:', data.error);
      }
      
      return { success: false, error: data };
    }

    return { success: true, data };

  } catch (error) {
    console.error('Network error:', error);
    return { success: false, error: error.message };
  }
}
```

---

## Rate Limiting

### Default Limits

- **Standard endpoints:** 100 requests per 15 minutes
- **Message sending:** 60 requests per minute
- **File uploads:** 20 requests per minute
- **Admin endpoints:** 200 requests per 15 minutes

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704284400
```

### Handling Rate Limits

```javascript
async function makeAPIRequest(url, options) {
  const response = await fetch(url, options);
  
  // Check rate limit headers
  const limit = response.headers.get('X-RateLimit-Limit');
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');
  
  console.log(`Rate limit: ${remaining}/${limit} requests remaining`);
  
  if (response.status === 429) {
    const resetTime = new Date(parseInt(reset) * 1000);
    const waitTime = resetTime - Date.now();
    
    console.log(`Rate limit exceeded. Waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Retry request
    return makeAPIRequest(url, options);
  }
  
  return response.json();
}
```

---

## Best Practices

### 1. Environment Variables

Store sensitive data in environment variables:

```bash
# .env
WHATSAPP_API_BASE=http://localhost:3000
WHATSAPP_API_TOKEN=your-secure-token-here
WHATSAPP_ADMIN_TOKEN=your-admin-token-here
WHATSAPP_USER_ID=your_user_id
```

### 2. Connection Pooling

Reuse HTTP connections:

```javascript
const axios = require('axios');

const whatsappClient = axios.create({
  baseURL: process.env.WHATSAPP_API_BASE,
  headers: {
    'X-API-Token': process.env.WHATSAPP_API_TOKEN,
    'Content-Type': 'application/json'
  },
  timeout: 30000,
  maxRedirects: 5
});

// Usage
const response = await whatsappClient.post('/api/whatsapp/send', {
  sessionId: SESSION_ID,
  phoneNumber: '+1234567890',
  message: 'Hello!'
});
```

### 3. Retry Logic

Implement exponential backoff for failed requests:

```javascript
async function retryRequest(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const waitTime = delay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Usage
const result = await retryRequest(() => 
  whatsappClient.post('/api/whatsapp/send', messageData)
);
```

### 4. WebSocket for Real-Time Updates

```javascript
const WebSocket = require('ws');

const ws = new WebSocket(
  `ws://localhost:3001?token=${process.env.WHATSAPP_API_TOKEN}`
);

ws.on('open', () => {
  console.log('WebSocket connected');
  
  // Subscribe to specific session events
  ws.send(JSON.stringify({
    type: 'subscribe',
    sessionId: SESSION_ID
  }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data);
  
  switch (event.type) {
    case 'qr_code':
      console.log('New QR code:', event.data.qrCode);
      // Display QR code to user
      break;
    
    case 'device_connected':
      console.log('Device connected!');
      // Update UI status
      break;
    
    case 'message_received':
      console.log('New message:', event.data);
      // Process incoming message
      break;
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket disconnected');
  // Implement reconnection logic
});
```

### 5. Message Queue for Bulk Operations

```javascript
const Queue = require('bull');

const messageQueue = new Queue('whatsapp-messages', {
  redis: { host: 'localhost', port: 6379 }
});

// Add messages to queue
messageQueue.add('send-message', {
  sessionId: SESSION_ID,
  phoneNumber: '+1234567890',
  message: 'Hello!'
}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
});

// Process queue
messageQueue.process('send-message', async (job) => {
  const { sessionId, phoneNumber, message } = job.data;
  
  const response = await whatsappClient.post('/api/whatsapp/send', {
    sessionId,
    phoneNumber,
    message
  });
  
  return response.data;
});
```

### 6. Logging and Monitoring

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log API calls
async function loggedAPICall(endpoint, data) {
  const startTime = Date.now();
  
  try {
    const response = await whatsappClient.post(endpoint, data);
    const duration = Date.now() - startTime;
    
    logger.info('API call successful', {
      endpoint,
      duration,
      status: response.status
    });
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('API call failed', {
      endpoint,
      duration,
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
}
```

### 7. Caching

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

async function getCachedContacts(deviceId) {
  const cacheKey = `contacts_${deviceId}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch from API
  const response = await whatsappClient.get(
    `/api/whatsapp/devices/${deviceId}/contacts`
  );
  
  // Store in cache
  cache.set(cacheKey, response.data);
  
  return response.data;
}
```

### 8. Input Validation

```javascript
function validatePhoneNumber(phoneNumber) {
  // Must start with + and contain 7-15 digits
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  
  if (!phoneRegex.test(phoneNumber)) {
    throw new Error('Invalid phone number format');
  }
  
  return phoneNumber;
}

function validateMessage(message) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message must be a non-empty string');
  }
  
  if (message.length > 4096) {
    throw new Error('Message exceeds maximum length of 4096 characters');
  }
  
  return message.trim();
}
```

### 9. Graceful Shutdown

```javascript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing gracefully...');
  
  // Close WebSocket
  if (ws) {
    ws.close();
  }
  
  // Close queue
  if (messageQueue) {
    await messageQueue.close();
  }
  
  // Close database connections
  // await database.close();
  
  process.exit(0);
});
```

### 10. Security Best Practices

```javascript
// 1. Never expose API tokens in client-side code
// 2. Use environment variables
// 3. Implement request signing for webhooks
// 4. Validate all inputs
// 5. Use HTTPS in production
// 6. Rotate API tokens regularly
// 7. Implement IP whitelisting if possible
// 8. Monitor for suspicious activity

// Example: Request signing
const crypto = require('crypto');

function signRequest(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// Add signature to request
const payload = { sessionId, phoneNumber, message };
const signature = signRequest(payload, SECRET_KEY);

const response = await whatsappClient.post('/api/whatsapp/send', payload, {
  headers: {
    'X-Signature': signature
  }
});
```

---

## Complete Integration Examples

### Express.js Integration

```javascript
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Initialize WhatsApp client
const whatsapp = axios.create({
  baseURL: process.env.WHATSAPP_API_BASE,
  headers: {
    'X-API-Token': process.env.WHATSAPP_API_TOKEN,
    'Content-Type': 'application/json'
  }
});

// Create device
app.post('/devices/create', async (req, res) => {
  try {
    const { userId, alias } = req.body;
    
    const response = await whatsapp.post('/api/whatsapp/devices', {
      userId,
      alias
    });
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
app.post('/messages/send', async (req, res) => {
  try {
    const { sessionId, phoneNumber, message } = req.body;
    
    const response = await whatsapp.post('/api/whatsapp/send', {
      sessionId,
      phoneNumber,
      message
    });
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint
app.post('/webhook/whatsapp', (req, res) => {
  const event = req.body;
  
  console.log('Webhook received:', event.type);
  
  switch (event.type) {
    case 'message':
      // Handle incoming message
      console.log('New message from:', event.data.fromNumber);
      break;
    
    case 'connection':
      // Handle connection status
      console.log('Connection status:', event.data.status);
      break;
  }
  
  res.json({ success: true });
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

### Python Integration

```python
import requests
import os
from typing import Dict, Optional

class WhatsAppAPI:
    def __init__(self, base_url: str, api_token: str):
        self.base_url = base_url
        self.api_token = api_token
        self.headers = {
            'X-API-Token': api_token,
            'Content-Type': 'application/json'
        }
    
    def create_device(self, user_id: str, alias: str) -> Dict:
        """Create a new WhatsApp device"""
        response = requests.post(
            f'{self.base_url}/api/whatsapp/devices',
            json={'userId': user_id, 'alias': alias},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def send_message(self, session_id: str, phone_number: str, message: str) -> Dict:
        """Send a text message"""
        response = requests.post(
            f'{self.base_url}/api/whatsapp/send',
            json={
                'sessionId': session_id,
                'phoneNumber': phone_number,
                'message': message
            },
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def upload_file(self, file_path: str, user_id: str, description: str = '') -> Dict:
        """Upload a file"""
        with open(file_path, 'rb') as f:
            files = {'file': f}
            data = {
                'userId': user_id,
                'description': description
            }
            response = requests.post(
                f'{self.base_url}/api/whatsapp/files/upload',
                files=files,
                data=data,
                headers={'X-API-Token': self.api_token}
            )
        response.raise_for_status()
        return response.json()
    
    def send_image(self, session_id: str, phone_number: str, 
                   file_id: str, caption: str = '') -> Dict:
        """Send an image"""
        response = requests.post(
            f'{self.base_url}/api/whatsapp/send/image',
            json={
                'sessionId': session_id,
                'phoneNumber': phone_number,
                'fileId': file_id,
                'caption': caption
            },
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def get_devices(self, user_id: str) -> Dict:
        """Get all devices for a user"""
        response = requests.get(
            f'{self.base_url}/api/whatsapp/users/{user_id}/devices',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage
if __name__ == '__main__':
    api = WhatsAppAPI(
        base_url=os.getenv('WHATSAPP_API_BASE'),
        api_token=os.getenv('WHATSAPP_API_TOKEN')
    )
    
    # Create device
    device = api.create_device('user_123', 'my-device')
    print(f"Device created: {device['data']['sessionId']}")
    
    # Send message
    result = api.send_message(
        session_id='user_123_device_my-device',
        phone_number='+1234567890',
        message='Hello from Python!'
    )
    print(f"Message sent: {result['data']['messageId']}")
```

### PHP Integration

```php
<?php

class WhatsAppAPI {
    private $baseUrl;
    private $apiToken;
    
    public function __construct($baseUrl, $apiToken) {
        $this->baseUrl = $baseUrl;
        $this->apiToken = $apiToken;
    }
    
    private function request($method, $endpoint, $data = null) {
        $ch = curl_init($this->baseUrl . $endpoint);
        
        $headers = [
            'X-API-Token: ' . $this->apiToken,
            'Content-Type: application/json'
        ];
        
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        
        if ($data !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $result = json_decode($response, true);
        
        if ($httpCode >= 400) {
            throw new Exception($result['error'] ?? 'API request failed');
        }
        
        return $result;
    }
    
    public function createDevice($userId, $alias) {
        return $this->request('POST', '/api/whatsapp/devices', [
            'userId' => $userId,
            'alias' => $alias
        ]);
    }
    
    public function sendMessage($sessionId, $phoneNumber, $message) {
        return $this->request('POST', '/api/whatsapp/send', [
            'sessionId' => $sessionId,
            'phoneNumber' => $phoneNumber,
            'message' => $message
        ]);
    }
    
    public function uploadFile($filePath, $userId, $description = '') {
        $ch = curl_init($this->baseUrl . '/api/whatsapp/files/upload');
        
        $file = new CURLFile($filePath);
        $postData = [
            'file' => $file,
            'userId' => $userId,
            'description' => $description
        ];
        
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'X-API-Token: ' . $this->apiToken
        ]);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
    
    public function getDevices($userId) {
        return $this->request('GET', '/api/whatsapp/users/' . $userId . '/devices');
    }
}

// Usage
$api = new WhatsAppAPI(
    getenv('WHATSAPP_API_BASE'),
    getenv('WHATSAPP_API_TOKEN')
);

// Create device
$device = $api->createDevice('user_123', 'my-device');
echo "Device created: " . $device['data']['sessionId'] . "\n";

// Send message
$result = $api->sendMessage(
    'user_123_device_my-device',
    '+1234567890',
    'Hello from PHP!'
);
echo "Message sent: " . $result['data']['messageId'] . "\n";
```

---

## Support & Resources

### Documentation
- **Quick Start:** `/documentation/api/quick-start.md`
- **Device Management:** `/documentation/api/device-management.md`
- **Message Sending:** `/documentation/api/message-sending.md`
- **File Management:** `/documentation/api/file-management.md`
- **Complete Reference:** `/documentation/api/complete-endpoint-reference.md`

### Testing Tools
- **Interactive API Docs:** `http://localhost:3000/api-docs.html`
- **Test Suite:** `http://localhost:3000/test/`
- **Comprehensive Testing:** `http://localhost:3000/test/comprehensive-testing.html`

### GitHub Repository
- Report issues
- Request features
- Contribute improvements

### Community
- Discord server
- Stack Overflow tag: `whatsapp-baileys-api`

---

**Last Updated:** January 3, 2026  
**API Version:** 1.0.0  
**License:** MIT

