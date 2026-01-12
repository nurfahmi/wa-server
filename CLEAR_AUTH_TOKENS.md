# 🔧 Clear Authentication Tokens

## Problem
You're getting "invalid signature" errors because your browser has old JWT tokens that were signed with a different secret.

## Quick Fix (Do this now)

### Method 1: Browser Console (Fastest)
1. Open your app in the browser (http://localhost:3000)
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Run this command:
```javascript
localStorage.clear();
location.reload();
```

### Method 2: Application Storage
1. Open Developer Tools (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Local Storage**
4. Click on `http://localhost:3000`
5. Find the `token` key and delete it
6. Refresh the page 

### Method 3: Logout and Login Again
1. If you can access the app, click the logout button
2. Login again through the Membership Hub

## Why This Happens
- Your JWT_SECRET changed from the old value to `baileys_secret_key_2026_sso_integration`
- Old tokens in localStorage were signed with the old secret
- The backend can't verify tokens signed with a different secret

## Prevention
After clearing tokens, the new login will generate tokens with the correct secret and everything will work! ✅
