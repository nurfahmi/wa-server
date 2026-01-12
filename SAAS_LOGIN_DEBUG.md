# 🔍 SaaS Login Flow Debugging Guide

## Current Issue
After logging in at port 5001 (membership hub), you're redirected back to this app, but getting:
```
GET http://localhost:3000/api/auth/me 401 (Unauthorized)
```

## Expected Flow

### Step 1: User clicks "Sign in with Membership Hub"
- Frontend calls: `window.location.href = "/api/auth/login"`
- Backend redirects to: `http://localhost:5001/saas/login?service_id=1&return_to=http://localhost:3000/auth/callback`

### Step 2: User logs in at Membership Hub (port 5001)
- User enters credentials
- Hub validates user
- Hub checks if user has subscription to service ID 1

### Step 3: Hub redirects back with token
**Expected URL format:**
```
http://localhost:3000/auth/callback?token=JWT_TOKEN_HERE
```

### Step 4: Frontend exchanges token
- `AuthCallback.jsx` extracts token from URL
- Calls: `POST /api/auth/exchange` with `{ token: "..." }`
- Backend validates token with hub
- Backend creates local user and returns local JWT
- Frontend stores local JWT in localStorage
- Frontend navigates to `/dashboard`

## Debugging Steps

### 1. Check the redirect URL
Open your browser console and check what URL you're redirected to after login:
```javascript
console.log(window.location.href);
```

**Expected:** `http://localhost:3000/auth/callback?token=eyJ...`

**If you see:** `http://localhost:3000/login` or something else, the hub isn't redirecting correctly.

### 2. Check console logs
With the updated code, you should see these logs in order:

```
[AUTH-CALLBACK] Starting authentication callback...
[AUTH-CALLBACK] Current URL: http://localhost:3000/auth/callback?token=...
[AUTH-CALLBACK] Token present: true
[AUTH-CALLBACK] Code present: false
[AUTH-CALLBACK] Token received (first 20 chars): eyJhbGciOiJIUzI1NiIs...
[AUTH-CALLBACK] Exchanging token with backend...
[AUTH-CALLBACK] Exchange successful!
[AUTH-CALLBACK] Received local token (first 20 chars): eyJhbGciOiJIUzI1NiIs...
[AUTH-CALLBACK] User: your@email.com
[AUTH-CALLBACK] Token stored, navigating to dashboard...
```

### 3. Check backend logs
In your terminal running `npm run dev`, you should see:

```
[OAUTH] Starting exchange for token: eyJhbGciOi...
[OAUTH] Hub validation success for user: your@email.com ID: 123
[OAUTH] Syncing user in local DB...
[OAUTH] Generated local token for user: your@email.com
```

## Common Issues

### Issue 1: No token in URL
**Symptom:** URL is `http://localhost:3000/auth/callback` (no ?token=)

**Cause:** Membership hub isn't sending the token back

**Solution:** Check membership hub configuration:
- Verify service ID 1 exists
- Verify API key is correct
- Check hub logs for errors

### Issue 2: Token exchange fails
**Symptom:** Console shows exchange error

**Cause:** Backend can't validate token with hub

**Solution:**
- Check `MEMBERSHIP_HUB_URL` is correct (`http://localhost:5001`)
- Check `MEMBERSHIP_API_KEY` is valid
- Verify hub is running on port 5001

### Issue 3: 401 on /api/auth/me
**Symptom:** 401 error before token exchange completes

**Cause:** AuthContext tries to check user before callback finishes

**Solution:** This is normal! The 401 error happens because:
1. AuthContext loads on every page
2. It checks for token in localStorage
3. On first load, there's no token yet
4. After callback completes, it will work

**This error is harmless if:**
- You see the callback logs completing successfully
- You end up on the dashboard
- Subsequent requests work

## Test the Full Flow

1. **Clear everything:**
```javascript
localStorage.clear();
location.reload();
```

2. **Click "Sign in with Membership Hub"**

3. **Watch the console** for the logs above

4. **Check the URL** at each step

5. **Verify you land on dashboard** with user data loaded

## Still Having Issues?

If the flow still doesn't work, check:

1. **Is the membership hub running?**
```bash
curl http://localhost:5001/health
```

2. **Can the backend reach the hub?**
```bash
curl -X POST http://localhost:5001/api/saas/validate-token \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"token":"test"}'
```

3. **Are the environment variables correct?**
```bash
# In your .env file:
MEMBERSHIP_HUB_URL=http://localhost:5001
MEMBERSHIP_SERVICE_ID=1
MEMBERSHIP_API_KEY=sk_4f2ca93285676b8fda9bee922b0f458207b621eba96ca3b74dc9747ac4642e55
MEMBERSHIP_REDIRECT_URI=http://localhost:3000/auth/callback
JWT_SECRET=baileys_secret_key_2026_sso_integration
```
