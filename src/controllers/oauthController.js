import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import config from "../config/config.js";
import MembershipHub from "../utils/MembershipHub.js";

// Initialize MembershipHub
const hub = new MembershipHub({
  hubUrl: process.env.MEMBERSHIP_HUB_URL,
  serviceId: process.env.MEMBERSHIP_SERVICE_ID,
  apiKey: process.env.MEMBERSHIP_API_KEY,
  webhookSecret: process.env.MEMBERSHIP_WEBHOOK_SECRET
});

const REDIRECT_URI = process.env.MEMBERSHIP_REDIRECT_URI || "http://localhost:3000/auth/callback";

// Generate JWT for frontend
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || "default_jwt_secret_change_me";
  console.log("[OAUTH] Generating token with secret (first 4):", secret.substring(0, 4));
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      name: user.name 
    },
    secret,
    { expiresIn: "24h" }
  );
};

export const login = (req, res) => {
  const authUrl = hub.getLoginUrl(REDIRECT_URI);
  res.redirect(authUrl);
};

// New function to exchange/validate token coming from SaaS Hub
export const exchange = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token missing" });
  }

  try {
    console.log("[OAUTH] Starting exchange for token:", token.substring(0, 10) + "...");
    console.log("[OAUTH] Hub URL:", process.env.MEMBERSHIP_HUB_URL);
    console.log("[OAUTH] Service ID:", process.env.MEMBERSHIP_SERVICE_ID);
    
    // 1. Validate token with SaaS Hub
    const validation = await hub.validateToken(token);
    
    console.log("[OAUTH] Validation response:", JSON.stringify(validation, null, 2));

    if (!validation.valid) {
      console.error("[OAUTH] Hub validation failed:", validation.error || "Invalid token");
      console.error("[OAUTH] Full validation object:", validation);
      
      // Provide specific error message for CSRF issues
      if (validation.csrfError) {
        return res.status(500).json({ 
          error: "Membership hub configuration error",
          message: "The membership hub has CSRF protection enabled on the API endpoint. Please exempt /api/saas/validate-token from CSRF middleware.",
          details: validation.error,
          fix: "See MEMBERSHIP_HUB_CSRF_FIX.md for solutions",
          hubResponse: validation.originalResponse
        });
      }
      
      return res.status(401).json({ 
        error: "Invalid token from membership hub",
        details: validation.error,
        hubResponse: validation.originalResponse
      });
    }

    // Handle both singular and plural from Hub
    const hubUser = validation.user;
    const subscription = validation.subscription || (validation.subscriptions && validation.subscriptions[0]) || null;
    
    console.log("[OAUTH] Hub validation success for user:", hubUser.email, "ID:", hubUser.id);
    
    // 2. Fetch User Limits from Hub
    const limitsData = await hub.getUserLimits(hubUser.id);
    console.log("[OAUTH] Limits fetched for user ID:", hubUser.id);
    
    // 3. Determine Plan & Limits
    let planName = subscription?.package_name || "Free";
    let deviceLimit = limitsData?.limits?.device_limit || 1;
    let role = "user";

    // Map roles if needed
    if (hubUser.role === "admin" || hubUser.role === "superadmin") {
      role = "superadmin";
      deviceLimit = 999; // Superadmin has high limit
    }

    console.log("[OAUTH] Syncing user in local DB...");
    // Sync user in local database
    let user = await User.findOne({ where: { email: hubUser.email } });
    
    if (user) {
        console.log("[OAUTH] Updating existing user ID:", user.id);
        // Update existing user
        user.name = hubUser.name || "Unknown User";
        user.role = role;
        user.planName = planName;
        user.deviceLimit = deviceLimit;
        user.lastLogin = new Date();
        await user.save();
    } else {
        console.log("[OAUTH] Creating new user for:", hubUser.email);
        // Create new
        user = await User.create({
          id: hubUser.id, 
          name: hubUser.name || "Unknown User",
          email: hubUser.email,
          role: role,
          planName: planName,
          deviceLimit: deviceLimit,
          lastLogin: new Date(),
        });
    }

    // 3. Generate local JWT
    const frontendToken = generateToken(user);
    console.log("[OAUTH] Generated local token for user:", user.email);

    // 4. Return token to frontend
    res.json({ token: frontendToken, user, subscription });

  } catch (error) {
    console.error("[OAUTH] SaaS Exchange Error:", error);
    res.status(500).json({ error: "Authentication failed", details: error.message });
  }
};

export const handleWebhook = async (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const event = req.headers["x-webhook-event"];
  const body = req.body;

  // 1. Verify signature
  if (!hub.verifyWebhook(body, signature)) {
    console.error("Invalid SaaS Hub webhook signature");
    return res.status(401).send("Unauthorized");
  }

  console.log(`Received SaaS Hub webhook event: ${event}`, body);

  try {
    const { user_id, package_name, limits } = body;
    const user = await User.findByPk(user_id);

    if (!user) {
      console.warn(`User ${user_id} not found for webhook event ${event}`);
      return res.status(200).send("User not found locally");
    }

    // 2. Handle event
    switch (event) {
      case "subscription.created":
      case "subscription.upgraded":
      case "subscription.renewed":
        user.planName = package_name;
        if (limits?.device_limit) {
          user.deviceLimit = limits.device_limit;
        }
        await user.save();
        break;

      case "subscription.cancelled":
      case "subscription.expired":
      case "subscription.suspended":
        user.planName = "Expired";
        // Optionally reduce limits or disable account
        // user.deviceLimit = 0; 
        await user.save();
        break;
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("SaaS Webhook Processing Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Handle GET requests (Auto-login from Hub)
export const handleGetWebhook = (req, res) => {
  const { token } = req.query;
  
  if (token) {
    console.log('Login token received via GET webhook, redirecting to callback:', token);
    // Redirect browser to the frontend callback page which will handle the exchange
    return res.redirect(`/auth/callback?token=${token}`);
  }
  
  res.status(200).send("Webhook endpoint is active. Use POST for actual membership events.");
};


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
      wsPort: config.port || 3000
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

