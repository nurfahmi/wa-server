import config from "../config/config.js";

const adminAuth = (req, res, next) => {
  const adminToken = req.header("X-Admin-Token");

  // Check if admin token is provided and matches the configured admin token
  if (!adminToken || adminToken !== config.adminToken) {
    return res.status(403).json({
      error: "Access denied. Admin privileges required.",
      message: "This endpoint requires superadmin authentication",
    });
  }

  // Mark request as authenticated admin
  req.isAdmin = true;
  next();
};

export default adminAuth;
