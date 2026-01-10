import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_change_me");

    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid token. User not found." });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid token." });
  }
};

export default authMiddleware;
