import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.replace("Bearer ", "");
    const secret = process.env.JWT_SECRET || "default_jwt_secret_change_me";
    console.log("[AUTH] Verifying token with secret (first 4):", secret.substring(0, 4));
    
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtError) {
      console.error("[AUTH] JWT Verification failed:", jwtError.message);
      return res.status(401).json({ error: "Invalid token." });
    }

    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      console.error("[AUTH] User not found for ID:", decoded.id);
      return res.status(401).json({ error: "Invalid token. User not found." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("[AUTH] Middleware internal error:", error);
    res.status(500).json({ error: "Internal server error during authentication." });
  }
};

export default authMiddleware;
