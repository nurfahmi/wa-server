import axios from "axios";
import jwt from "jsonwebtoken";
import { User, Device } from "../models/index.js";
import config from "../config/config.js";

// OAuth Configuration
// Mapped from environment variables provided by user
const OAUTH_URL = process.env.AUTH_SERVER_URL || "https://membership.indosofthouse.com";
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || "http://localhost:5173/auth/callback";

// Generate JWT for frontend
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      name: user.name 
    },
    process.env.JWT_SECRET || "default_jwt_secret_change_me",
    { expiresIn: "24h" }
  );
};

export const login = (req, res) => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "profile email subscriptions",
    state: Math.random().toString(36).substring(7),
  });

  const authUrl = `${OAUTH_URL}/oauth/authorize?${params.toString()}`;
  res.redirect(authUrl);
};

// New function to exchange code coming from Frontend
export const exchange = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code missing" });
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await axios.post(
      `${OAUTH_URL}/oauth/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI, // Must match the one used in authorize
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token } = tokenResponse.data;

    // 2. Get User Profile
    const userResponse = await axios.get(`${OAUTH_URL}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const userData = userResponse.data;
    console.log("Full UserInfo Response:", JSON.stringify(userData, null, 2)); 

    // Attempt to find ID in common fields
    const remoteId = userData.id || userData.userId || userData.user_id || userData.sub;

    if (!remoteId) {
       console.error("Critical: Missing User ID in OAuth response", userData);
       return res.status(500).json({ 
         error: "OAuth UserInfo missing 'id' field", 
         receivedData: userData 
       });
    }

    // 3. Determine Plan & Limits
    let planName = "Free";
    let deviceLimit = 1;
    let role = "user";

    // Fix: Check for super_admin (underscore) as well
    const remoteRole = userData.role || "";
    if (remoteRole === "admin" || remoteRole === "superadmin" || remoteRole === "super_admin") {
      role = "superadmin";
      deviceLimit = 1000;
      planName = "Enterprise";
    }

    // Check if user exists by email to prevent ID collision
    // If user exists with DIFFERENT ID, we should just update it or warn.
    // Ideally we want to sync the ID, but if PK is different, that's hard.
    let user = await User.findOne({ where: { email: userData.email } });
    
    if (user) {
        console.log(`User found by email ${userData.email} (ID: ${user.id}). Updating...`);
        // Update existing user
        user.name = userData.name || "Unknown User";
        user.role = role;
        user.planName = planName;
        user.deviceLimit = deviceLimit;
        user.lastLogin = new Date();
        // If the implementation allows updating ID, we could: user.id = parseInt(remoteId);
        // But usually we can't change PK easily. We'll stick to existing ID.
        await user.save();
    } else {
        console.log(`Creating new user with ID: ${remoteId}`);
        // Create new
        user = await User.create({
          id: parseInt(remoteId), // Ensure it's an integer
          name: userData.name || "Unknown User",
          email: userData.email,
          role: role,
          planName: planName,
          deviceLimit: deviceLimit,
          lastLogin: new Date(),
        });
    }

    console.log("User synced successfully:", user.id);

    // 4. Generate JWT
    const frontendToken = generateToken(user);

    // 5. Return token to frontend
    res.json({ token: frontendToken, user });

  } catch (error) {
    console.error("OAuth Exchange Error:", error.response?.data || error.message);
    console.error("Full Error Details:", error);
    res.status(500).json({ error: "Authentication failed", details: error.response?.data || error.message });
  }
};

// Keep callback for legacy/server-side flow if needed, or remove. 
// For now, let's keep it but redirect to new frontend flow if hit accidentally?
// Actually, with the new flow, the browser goes straight to frontend. 
// We don't strictly need a backend GET /callback anymore if REDIRECT_URI is frontend.
// But we will keep 'exchange' as the main handler.

import bcrypt from "bcryptjs";

export const loginLocal = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user);
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.json({ 
      user, 
      wsToken: config.apiToken,
      wsPort: config.wsPort || 3001
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
