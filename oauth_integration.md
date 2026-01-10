# OAuth 2.0 Integration Guide

This guide explains how to integrate your external application with the IndosoftHouse Membership System using OAuth 2.0.

## Overview

The system implements the **Authorization Code Flow**, which is the standard method for web applications to securely obtain access tokens.

### Endpoints

| Endpoint | URL | Method | Description |
|----------|-----|--------|-------------|
| **Authorize** | `https://your-domain.com/oauth/authorize` | `GET` | User login and consent |
| **Token** | `https://your-domain.com/oauth/token` | `POST` | Exchange code for tokens |
| **UserInfo** | `https://your-domain.com/oauth/userinfo` | `GET` | Get user profile |
| **Introspect**| `https://your-domain.com/oauth/introspect`| `POST` | Validate token (Resource Servers) |
| **Revoke** | `https://your-domain.com/oauth/revoke` | `POST` | Revoke a token |

---

## 1. Register Your Application

Before you begin, you must be registered as a client in the Membership System to obtain:
*   `client_id`
*   `client_secret`
*   Registered `redirect_uri`

## 2. Authorization Flow

### Step A: Redirect user to Authorization Endpoint

Redirect the user's browser to the authorize URL with the following query parameters:

```http
GET /oauth/authorize?response_type=code
    &client_id=YOUR_CLIENT_ID
    &redirect_uri=YOUR_CALLBACK_URL
    &scope=profile email subscriptions
    &state=RANDOM_STRING
```

*   `response_type`: Must be `code`.
*   `client_id`: Your application's ID.
*   `redirect_uri`: Must match one of your registered callback URLs.
*   `scope`: Space-separated list of scopes (e.g., `profile email subscriptions`).
*   `state`: A random string to prevent CSRF attacks (verify this in the callback).

### Step B: Handle the Callback

After the user logs in and approves access, they will be redirected back to your `redirect_uri` with a code:

```
https://your-app.com/callback?code=AUTHORIZATION_CODE&state=RANDOM_STRING
```

**Security Check:** Verify that the `state` parameter matches the one you sent in Step A.

### Step C: Exchange Code for Access Token

Make a server-side `POST` request to the token endpoint:

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTHORIZATION_CODE
&redirect_uri=YOUR_CALLBACK_URL
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200...",
  "scope": "profile email subscriptions"
}
```

## 3. Using the Access Token

Use the `access_token` to make authenticated requests to the API.

### Get User Profile

```http
GET /oauth/userinfo
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response:**

```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "subscriptions": [
      {
          "id": 42,
          "product_name": "Premium Plan",
          "active": true
      }
  ]
}
```

## 4. Refreshing Tokens

When the `access_token` expires (typically 1 hour), use the `refresh_token` to get a new one without prompting the user.

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=YOUR_REFRESH_TOKEN
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
```

---

## Example: Node.js Client (using axios)

```javascript
const axios = require('axios');

const AUTH_URL = 'https://membership.indosofthouse.com';
const CLIENT_ID = 'your_client_id';
const CLIENT_SECRET = 'your_client_secret';
const REDIRECT_URI = 'https://your-app.com/callback';

// 1. Get Login URL
function getLoginUrl() {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: 'profile email subscriptions',
        state: 'random_state_string'
    });
    return `${AUTH_URL}/oauth/authorize?${params.toString()}`;
}

// 2. Exchange Code for Token
async function getToken(code) {
    try {
        const response = await axios.post(`${AUTH_URL}/oauth/token`, new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        }));
        return response.data;
    } catch (error) {
        console.error('Error fetching token:', error.response?.data || error.message);
        throw error;
    }
}

// 3. Get User Profile
async function getUserProfile(accessToken) {
    const response = await axios.get(`${AUTH_URL}/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
}
```
