# Warmer System API Documentation

## Overview

The warmer system allows you to create automated WhatsApp messaging campaigns using multiple devices. This documentation covers the API endpoints and includes frontend implementation examples.

## Base URL

```
http://your-api-base-url/api/warmer
```

## Authentication

All requests require an API token in the header:

```
X-API-Token: your_api_token
```

## API Endpoints

### 1. Create Warmer Campaign

Creates a new warmer campaign with specified devices and settings.

**Endpoint:** `POST /campaigns`

**Query Parameters:**

- `userId` (required) - The ID of the user creating the campaign

**Request Headers:**

```http
Content-Type: application/json
X-API-Token: your_api_token
```

**Request Body:**

```json
{
  "name": "Campaign Name",
  "description": "Campaign Description",
  "selectedDevices": [
    "device_session_id_1",
    "device_session_id_2",
    "device_session_id_3"
  ],
  "dailyMessageSettings": {
    "day1_7": {
      "min": 2,
      "max": 3
    },
    "day8_14": {
      "min": 3,
      "max": 5
    }
  },
  "timingSettings": {
    "workingHours": {
      "start": "09:00",
      "end": "17:00"
    },
    "timezone": "Asia/Jakarta",
    "pauseDays": [0, 6] // Sunday and Saturday
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "campaign_id",
    "name": "Campaign Name",
    "description": "Campaign Description",
    "selectedDevices": ["device_session_id_1", "device_session_id_2", "device_session_id_3"],
    "dailyMessageSettings": { ... },
    "timingSettings": { ... },
    "status": "active",
    "startedAt": "2025-06-23T20:18:05.821Z",
    "totalConversations": 0,
    "totalMessagesSent": 0
  },
  "message": "Warmer campaign created successfully"
}
```

### 2. Delete Warmer Campaign

Deletes an existing warmer campaign.

**Endpoint:** `DELETE /campaigns/:campaignId`

**Query Parameters:**

- `userId` (required) - The ID of the user who owns the campaign

**Response:**

```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

## Frontend Implementation Examples

### HTML Form Example

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Create Warmer Campaign</title>
    <style>
      .form-group {
        margin-bottom: 15px;
      }
      label {
        display: block;
        margin-bottom: 5px;
      }
      .error {
        color: red;
        display: none;
      }
    </style>
  </head>
  <body>
    <h2>Create Warmer Campaign</h2>
    <form id="warmerCampaignForm">
      <div class="form-group">
        <label for="name">Campaign Name:</label>
        <input type="text" id="name" name="name" required />
      </div>

      <div class="form-group">
        <label for="description">Description:</label>
        <textarea id="description" name="description"></textarea>
      </div>

      <div class="form-group">
        <label>Devices:</label>
        <div id="devicesList">
          <!-- Devices will be populated dynamically -->
        </div>
        <span class="error" id="devicesError"
          >Please select at least 3 devices</span
        >
      </div>

      <div class="form-group">
        <label>Daily Message Settings (Days 1-7):</label>
        <input
          type="number"
          id="day1_7_min"
          placeholder="Min messages"
          min="1"
          required
        />
        <input
          type="number"
          id="day1_7_max"
          placeholder="Max messages"
          min="1"
          required
        />
      </div>

      <div class="form-group">
        <label>Daily Message Settings (Days 8-14):</label>
        <input
          type="number"
          id="day8_14_min"
          placeholder="Min messages"
          min="1"
          required
        />
        <input
          type="number"
          id="day8_14_max"
          placeholder="Max messages"
          min="1"
          required
        />
      </div>

      <div class="form-group">
        <label>Working Hours:</label>
        <input type="time" id="workingHoursStart" required />
        <input type="time" id="workingHoursEnd" required />
      </div>

      <div class="form-group">
        <label>Timezone:</label>
        <select id="timezone" required>
          <option value="Asia/Jakarta">Asia/Jakarta</option>
          <!-- Add more timezone options as needed -->
        </select>
      </div>

      <div class="form-group">
        <label>Pause Days:</label>
        <div>
          <input type="checkbox" id="sunday" value="0" /> Sunday
          <input type="checkbox" id="saturday" value="6" /> Saturday
        </div>
      </div>

      <button type="submit">Create Campaign</button>
    </form>

    <script src="warmerCampaign.js"></script>
  </body>
</html>
```

### JavaScript Implementation (warmerCampaign.js)

```javascript
class WarmerCampaignManager {
  constructor(apiBaseUrl, apiToken) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiToken = apiToken;
    this.userId = "1"; // Set your user ID here
  }

  // Fetch available devices
  async fetchDevices() {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/whatsapp/users/${this.userId}/devices`,
        {
          headers: {
            "X-API-Token": this.apiToken,
          },
        }
      );
      const data = await response.json();
      return data.devices || [];
    } catch (error) {
      console.error("Error fetching devices:", error);
      return [];
    }
  }

  // Create warmer campaign
  async createCampaign(campaignData) {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/warmer/campaigns?userId=${this.userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Token": this.apiToken,
          },
          body: JSON.stringify(campaignData),
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error creating campaign:", error);
      throw error;
    }
  }

  // Delete warmer campaign
  async deleteCampaign(campaignId) {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/warmer/campaigns/${campaignId}?userId=${this.userId}`,
        {
          method: "DELETE",
          headers: {
            "X-API-Token": this.apiToken,
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      throw error;
    }
  }
}

// Initialize the form
document.addEventListener("DOMContentLoaded", async () => {
  const campaignManager = new WarmerCampaignManager(
    "http://your-api-base-url",
    "your-api-token"
  );

  // Populate devices list
  const devices = await campaignManager.fetchDevices();
  const devicesList = document.getElementById("devicesList");
  devices.forEach((device) => {
    const checkbox = document.createElement("div");
    checkbox.innerHTML = `
            <input type="checkbox" id="device_${device.id}" 
                   value="${device.sessionId}">
            <label for="device_${device.id}">${device.alias}</label>
        `;
    devicesList.appendChild(checkbox);
  });

  // Handle form submission
  const form = document.getElementById("warmerCampaignForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get selected devices
    const selectedDevices = Array.from(
      document.querySelectorAll('#devicesList input[type="checkbox"]:checked')
    ).map((cb) => cb.value);

    // Validate minimum devices
    if (selectedDevices.length < 3) {
      document.getElementById("devicesError").style.display = "block";
      return;
    }

    // Get pause days
    const pauseDays = Array.from(
      document.querySelectorAll('input[type="checkbox"]:checked')
    )
      .filter((cb) => cb.id === "sunday" || cb.id === "saturday")
      .map((cb) => parseInt(cb.value));

    // Create campaign data
    const campaignData = {
      name: document.getElementById("name").value,
      description: document.getElementById("description").value,
      selectedDevices,
      dailyMessageSettings: {
        day1_7: {
          min: parseInt(document.getElementById("day1_7_min").value),
          max: parseInt(document.getElementById("day1_7_max").value),
        },
        day8_14: {
          min: parseInt(document.getElementById("day8_14_min").value),
          max: parseInt(document.getElementById("day8_14_max").value),
        },
      },
      timingSettings: {
        workingHours: {
          start: document.getElementById("workingHoursStart").value,
          end: document.getElementById("workingHoursEnd").value,
        },
        timezone: document.getElementById("timezone").value,
        pauseDays,
      },
    };

    try {
      const result = await campaignManager.createCampaign(campaignData);
      if (result.success) {
        alert("Campaign created successfully!");
        form.reset();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert("Failed to create campaign. Please try again.");
    }
  });
});
```

## Important Notes

1. **Device Requirements**

   - A minimum of 3 devices is required for each campaign
   - Devices must be properly connected to WhatsApp before being used in a campaign
   - Device session IDs are used for identification, not device IDs

2. **Working Hours**

   - Set in 24-hour format (HH:mm)
   - Must be in the specified timezone

3. **Message Limits**

   - Different limits can be set for days 1-7 and days 8-14
   - Min value must be less than max value

4. **Error Handling**
   - Always check the `success` field in responses
   - Handle network errors appropriately
   - Validate device connections before creating campaigns

## Best Practices

1. **Device Management**

   - Verify device connection status before adding to campaign
   - Monitor device health during campaign
   - Handle device disconnections gracefully

2. **Campaign Settings**

   - Set reasonable message limits to avoid spam
   - Consider timezone differences
   - Use pause days to respect weekends/holidays

3. **Error Handling**
   - Implement proper error handling in frontend
   - Show meaningful error messages to users
   - Log errors for debugging
