# 🔌 SaaS Integration Quick Start Guide

## For Developers Building Apps That Connect to This Membership System

This guide shows you how to integrate your SaaS application with the membership system for authentication, payments, and subscription management.

---

## 🎯 What You Get

When you integrate with this membership hub:
- ✅ **No authentication code needed** - Users authenticate through the hub
- ✅ **No payment processing** - Checkout handled by the hub
- ✅ **No subscription management** - All managed centrally  
- ✅ **Focus on your features** - Build your product, not infrastructure

---

## 🚀 Integration in 3 Steps

### Step 1: Get Your API Credentials

Contact the admin to register your service. You'll receive:
- Service ID (e.g., `5`)
- API Key (e.g., `sk_abc123...`)
- Webhook Secret (e.g., `whsec_xyz789...`)

### Step 2: Configure Your .env

```bash
# Membership Hub Configuration
MEMBERSHIP_HUB_URL=https://membership.yourdomain.com
MEMBERSHIP_SERVICE_ID=5
MEMBERSHIP_API_KEY=sk_abc123...
MEMBERSHIP_WEBHOOK_SECRET=whsec_xyz789...
```

### Step 3: Use the Client Boilerplate

You can copy the **`SAAS_CLIENT_BOILERPLATE.js`** file from this repository into your micro-SaaS project. It handles all the communication and security for you.

```bash
# Copy the file to your project
cp membership-hub/SAAS_CLIENT_BOILERPLATE.js ./lib/membership-hub.js
```


---

## 📦 Package Configuration

### Define Your Package Tiers

When setting up your service in the hub, define packages with flexible metadata:

**Example: WhatsApp Gateway**

**Starter Plan - $29/month:**
```json
{
  "device_limit": 3,
  "agent_limit": 1,
  "message_limit": 1000,
  "webhook_limit": 10,
  "api_calls_per_day": 5000
}
```

**Pro Plan - $99/month:**
```json
{
  "device_limit": 10,
  "agent_limit": 5,
  "message_limit": -1,
  "webhook_limit": 50,
  "api_calls_per_day": -1
}
```

**Each service defines its own schema!** No predefined limits - totally flexible.

---

## 🔐 Authentication Flow

### Option A: Let Hub Handle Login (Recommended)

**1. User visits your app unauthenticated**
- Redirect to: `https://membership.yourdomain.com/saas/login?service_id=5&return_to=https://yourapp.com`

**2. User logs in on hub domain**
- Hub validates credentials
- Checks if user has active subscription to your service

**3. User redirected back with token**
- `https://yourapp.com?token=jwt_token_here`

**4. Validate token and get user info**
```javascript
const response = await fetch(`${MEMBERSHIP_HUB_URL}/api/saas/validate-token`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${MEMBERSHIP_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ token: req.query.token })
});

const data = await response.json();
/*
{
  valid: true,
  user: {
    id: 123,
    email: "user@example.com",
    name: "John Doe"
  },
  subscription: {
    id: 42,
    package_name: "Starter",
    status: "active",
    expires_at: "2026-02-01T00:00:00Z"
  }
}
*/
```

### Option B: Embedded Login (API-based)

If you want to keep users on your domain, call the API directly:

```javascript
const response = await fetch(`${MEMBERSHIP_HUB_URL}/api/saas/auth/login`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${MEMBERSHIP_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    service_id: 5
  })
});

const data = await response.json();
// Returns: { token: 'jwt...', user: {...}, subscription: {...} }
```

---

## 🎫 Check User Access & Limits

### Get User's Subscription Limits

```javascript
const response = await fetch(
  `${MEMBERSHIP_HUB_URL}/api/saas/user/${userId}/limits?service_id=${SERVICE_ID}`,
  {
    headers: { 'Authorization': `Bearer ${MEMBERSHIP_API_KEY}` }
  }
);

const limits = await response.json();
/*
{
  subscription_id: 42,
  package_name: "Starter",
  status: "active",
  expires_at: "2026-02-01T00:00:00Z",
  limits: {
    device_limit: 3,
    agent_limit: 1,
    message_limit: 1000,
    webhook_limit: 10
  },
  features: {
    ai_agent: false,
    api_access: false,
    priority_support: false
  }
}
*/
```

### Enforce Limits in Your App

```javascript
// Example: User tries to add a device
async function addDevice(userId, deviceData) {
  const limits = await getUserLimits(userId);
  
  if (!limits) {
    throw new Error('No active subscription');
  }
  
  const currentDevices = await getDeviceCount(userId);
  
  if (currentDevices >= limits.limits.device_limit) {
    throw new Error(`You've reached your ${limits.limits.device_limit} device limit. Upgrade to add more!`);
  }
  
  // Add device...
}

// Example: User tries to use AI agent
async function useAIAgent(userId) {
  const limits = await getUserLimits(userId);
  
  if (!limits.features.ai_agent) {
    throw new Error('AI Agent is only available in Pro plan. Upgrade now!');
  }
  
  // Use AI agent...
}
```

---

## 💰 Payment Flow

### When User Wants to Buy

**Don't build your own checkout!** Redirect to the hub:

```javascript
// User clicks "Buy Starter Plan"
const checkoutUrl = `${MEMBERSHIP_HUB_URL}/saas/checkout/${SERVICE_ID}/starter?user_id=${userId}&return_to=${encodeURIComponent('https://yourapp.com/success')}`;

// Redirect user
window.location.href = checkoutUrl;
```

**Hub handles:**
1. Payment processing (Duitku)
2. Subscription creation
3. Webhook to your app
4. Redirect back to your app

**Your app receives:**
- User redirected to: `https://yourapp.com/success?subscription_id=42&status=active`
- Webhook delivered to your endpoint (see below)

---

## 🔔 Webhook Integration

### Setup

Tell the admin your webhook URL:
- `https://yourapp.com/webhooks/membership`

### Handle Webhooks

```javascript
import crypto from 'crypto';

app.post('/webhooks/membership', (req, res) => {
  // 1. Verify signature
  const signature = req.headers['x-webhook-signature'];
  const event = req.headers['x-webhook-event'];
  
  const expectedSignature = crypto
    .createHmac('sha256', MEMBERSHIP_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signature !== expectedSignature) {
    console.error('Invalid webhook signature');
    return res.status(401).send('Unauthorized');
  }
  
  // 2. Handle event
  switch(event) {
    case 'subscription.created':
      handleSubscriptionCreated(req.body);
      break;
    
    case 'subscription.upgraded':
      handleSubscriptionUpgraded(req.body);
      break;
    
    case 'subscription.cancelled':
      handleSubscriptionCancelled(req.body);
      break;
    
    case 'subscription.expired':
      handleSubscriptionExpired(req.body);
      break;
  }
  
  res.status(200).send('OK');
});

function handleSubscriptionCreated(data) {
  /*
  data = {
    subscription_id: 42,
    user_id: 123,
    package_id: 1,
    package_name: "Starter",
    status: "active",
    started_at: "2026-01-11T00:00:00Z",
    expires_at: "2026-02-11T00:00:00Z",
    limits: { device_limit: 3, ... }
  }
  */
  
  // Activate user account in your system
  // Send welcome email
  // Enable features based on package
}

function handleSubscriptionCancelled(data) {
  // Disable user account
  // Send cancellation email
}
```

### Webhook Events

| Event | When It Fires |
|-------|--------------|
| `subscription.created` | New subscription activated |
| `subscription.upgraded` | User upgraded to higher tier |
| `subscription.downgraded` | User downgraded to lower tier |
| `subscription.renewed` | Auto-renewal successful |
| `subscription.cancelled` | User cancelled subscription |
| `subscription.expired` | Subscription expired |
| `subscription.suspended` | Payment failed / account suspended |

---

## 🎨 Show Pricing on Your App

### Fetch Available Packages

```javascript
const response = await fetch(
  `${MEMBERSHIP_HUB_URL}/api/saas/services/${SERVICE_ID}/packages`,
  {
    headers: { 'Authorization': `Bearer ${MEMBERSHIP_API_KEY}` }
  }
);

const packages = await response.json();
/*
[
  {
    id: 1,
    name: "Starter",
    price: 29.00,
    billing_cycle: "monthly",
    description: "Perfect for small teams",
    limits: { device_limit: 3, ... },
    features: { ai_agent: false, ... }
  },
  {
    id: 2,
    name: "Pro",
    price: 99.00,
    ...
  }
]
*/
```

### Display Pricing Table

```jsx
{packages.map(pkg => (
  <div key={pkg.id} className="pricing-card">
    <h3>{pkg.name}</h3>
    <p className="price">${pkg.price}/month</p>
    <p>{pkg.description}</p>
    
    <ul>
      <li>{pkg.limits.device_limit} devices</li>
      <li>{pkg.limits.agent_limit} AI agents</li>
      <li>{pkg.limits.message_limit === -1 ? 'Unlimited' : pkg.limits.message_limit} messages</li>
    </ul>
    
    <button onClick={() => buyPackage(pkg.id)}>
      Choose {pkg.name}
    </button>
  </div>
))}
```

---

## 🔧 Example: Complete Integration

Here's a complete example app:

```javascript
import express from 'express';
import crypto from 'crypto';

const app = express();
const MEMBERSHIP_HUB_URL = process.env.MEMBERSHIP_HUB_URL;
const SERVICE_ID = process.env.MEMBERSHIP_SERVICE_ID;
const API_KEY = process.env.MEMBERSHIP_API_KEY;
const WEBHOOK_SECRET = process.env.MEMBERSHIP_WEBHOOK_SECRET;

// Middleware to check authentication
async function requireAuth(req, res, next) {
  const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.redirect(`${MEMBERSHIP_HUB_URL}/saas/login?service_id=${SERVICE_ID}&return_to=${req.originalUrl}`);
  }
  
  // Validate token
  const response = await fetch(`${MEMBERSHIP_HUB_URL}/api/saas/validate-token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token })
  });
  
  const data = await response.json();
  
  if (!data.valid) {
    return res.redirect(`${MEMBERSHIP_HUB_URL}/saas/login?service_id=${SERVICE_ID}&return_to=${req.originalUrl}`);
  }
  
  req.user = data.user;
  req.subscription = data.subscription;
  next();
}

// Home page (protected)
app.get('/dashboard', requireAuth, async (req, res) => {
  // Get user limits
  const limitsResponse = await fetch(`${MEMBERSHIP_HUB_URL}/api/saas/user/${req.user.id}/limits?service_id=${SERVICE_ID}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  
  const limits = await limitsResponse.json();
  
  res.render('dashboard', {
    user: req.user,
    subscription: req.subscription,
    limits: limits.limits,
    features: limits.features
  });
});

// Add device (with limit check)
app.post('/devices/add', requireAuth, async (req, res) => {
  const limits = await getUserLimits(req.user.id);
  const currentDevices = await getDeviceCount(req.user.id);
  
  if (currentDevices >= limits.limits.device_limit) {
    return res.status(403).json({
      error: `You've reached your ${limits.limits.device_limit} device limit`,
      upgrade_url: `${MEMBERSHIP_HUB_URL}/saas/upgrade/${SERVICE_ID}`
    });
  }
  
  // Add device...
  res.json({ success: true });
});

// Webhook handler
app.post('/webhooks/membership', express.json(), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const event = req.headers['x-webhook-event'];
  
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Unauthorized');
  }
  
  switch(event) {
    case 'subscription.created':
      console.log('New subscription!', req.body);
      break;
    case 'subscription.cancelled':
      console.log('Subscription cancelled', req.body);
      break;
  }
  
  res.status(200).send('OK');
});

app.listen(3000);
```

---

## 📚 API Reference

### Base URL
```
https://membership.yourdomain.com/api/saas
```

### Authentication
All API requests require an API key in the header:
```
Authorization: Bearer sk_your_api_key_here
```

### Endpoints

#### Validate Token
```http
POST /validate-token
Content-Type: application/json

{
  "token": "jwt_token_here"
}
```

#### Get User Limits
```http
GET /user/:userId/limits?service_id=5
```

#### Get Service Packages
```http
GET /services/:serviceId/packages
```

---

## 🎉 You're Done!

With this integration, your app has:
- ✅ User authentication (delegated to hub)
- ✅ Payment processing (delegated to hub)
- ✅ Subscription management (delegated to hub)
- ✅ Flexible package limits
- ✅ Real-time webhook notifications

**Tip:** See the `SAAS_CLIENT_BOILERPLATE.js` file for a "copy-paste" integration class that implements everything above! 🚀

