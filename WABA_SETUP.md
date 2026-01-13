
# WhatsApp Business API (WABA) Setup Guide

This system now supports both **Baileys** (Unofficial) and **WhatsApp Official API** (WABA).

## 1. Prerequisites
- A Meta Business Account.
- A WhatsApp Business API App created in [developers.facebook.com](https://developers.facebook.com).
- A Phone Number added to the App (not currently registered on a physical WhatsApp app).

## 2. Configure Webhook
1. Go to your App Dashboard > WhatsApp > Configuration.
2. Click **Edit** under Webhooks.
3. **Callback URL**: `https://your-public-domain.com/api/webhooks/waba`
   - *Note: localhost won't work directly. Use ngrok for testing.*
4. **Verify Token**: `baileys_api_secret` (or check `config.apiToken`).
5. Verify and Save.
6. Under **Webhook Fields**, subscribe to:
   - `messages`
   - `message_status` (optional, redundant with messages sometimes)

## 3. Connect a Device (UI)
1. Go to the **Devices** page in your dashboard.
2. Click **Add Device**.
3. Select **Official API** tab.
4. Enter your **Phone Number ID**, **Business Account ID**, and **Access Token**.
5. Click **Connect Official API**.

Your device is now connected and ready to send/receive messages!

## 4. Testing
- Send a message to your WABA number. It should appear in your chats.
- Reply via the Chat UI. It should be sent via the Cloud API.
