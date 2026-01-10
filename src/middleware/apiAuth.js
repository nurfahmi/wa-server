import config from "../config/config.js";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

const apiAuth = async (req, res, next) => {
  // 1. Check for System API Token (Super Admin Access)
  const apiToken = req.header("X-API-Token");
  if (apiToken && apiToken === config.apiToken) {
    req.isSystem = true;
    return next();
  }

  // 2. Check for JWT (User Access)
  const authHeader = req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.replace("Bearer ", "");
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_change_me");
      
      const user = await User.findByPk(decoded.id);
      if (user) {
        req.user = user;
        return next();
      }
    } catch (error) {
      // JWT failed, fall through to error
    }
  }

  // 3. Fallback: Unixauthorized
  return res.status(401).json({ error: "Unauthorized. Invalid API Token or JWT." });
};

export default apiAuth;
