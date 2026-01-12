# 🚀 SaaS SSO Integration: Simple Step-by-Step

This guide explains how to connect your **Micro-SaaS** to the **Membership Hub** so your users can log in once and access everything.

---

## 📋 Prerequisites
Before you start, go to the Admin Panel of the Membership Hub:
1.  **Service ID**: Note your ID (e.g., `1`).
2.  **API Key**: Generate a "Secret Key" (looks like `sk_...`).
3.  **Return URL**: Decide on your callback route (e.g., `http://localhost:3000/auth/callback`).

---

## 🛠️ The 3-Step Implementation

### Step 1: The "Login" Button
In your Micro-SaaS, when a user clicks "Login", redirect them to the Hub.

**The URL structure:**
`http://localhost:5001/saas/login?service_id=YOUR_ID&return_to=YOUR_CALLBACK_URL`

**Example (React/Frontend):**
```javascript
const handleLogin = () => {
    const hubUrl = "http://localhost:5001/saas/login";
    const serviceId = "1";
    const returnTo = "http://localhost:3000/auth/callback";
    
    window.location.href = `${hubUrl}?service_id=${serviceId}&return_to=${returnTo}`;
};
```

---

### Step 2: The "Callback" Handler (Crucial)
This is the backend route that receives the "Letter of Recommendation" (Token) from the Hub and turns it into a **local session** on your SaaS.

**Node.js/Express Example:**
```javascript
// GET /auth/callback
app.get('/auth/callback', async (req, res) => {
    const { token } = req.query; // Hub sends this token back to you

    if (!token) return res.redirect('/login');

    try {
        // Verify token with Hub
        const response = await fetch('http://localhost:5001/api/saas/validate-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk_your_api_key_here' // Your Secret Key
            },
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (data.valid) {
            // ✅ LOG THE USER IN LOCALLY
            // This sets the cookie for YOUR port (3000)
            req.session.user = data.user; 
            req.session.subscription = data.subscriptions[0];

            return res.redirect('/dashboard');
        } else {
            return res.redirect('/login?error=invalid_auth');
        }
    } catch (err) {
        res.redirect('/login?error=hub_connection_failed');
    }
});
```

---

### Step 3: Protecting Your Routes
Now that you have a local session, your routes just check `req.session.user`.

```javascript
app.get('/api/auth/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    res.json({ user: req.session.user });
});
```

---

## ❓ Why do I need a Callback route?
Because of **Browser Security (CORS/Cookies)**:
1.  **Port 5001** can only set cookies for Port 5001.
2.  **Port 3000** can only set cookies for Port 3000.
3.  The **Callback** route acts as the bridge. It takes proof from the Hub and tells Port 3000: *"Hey, it's okay to let this guy in, the Hub says he is who he says he is."*

---

## 💡 Troubleshooting
*   **Stuck on Login?** Ensure `return_to` is URL-encoded if it contains query parameters.
*   **Token Invalid?** Ensure your `JWT_SECRET` in `.env` is identical across both applications.
*   **400 Bad Request?** This usually means your frontend is asking for user info (`/api/auth/me`) before the Callback route has finished setting the session.
