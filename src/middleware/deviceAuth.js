import { Device } from "../models/index.js";

const deviceAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-device-api-key"];

    // If no device API key is provided, continue to next middleware
    if (!apiKey) {
      return next();
    }

    // Find device by API key
    const device = await Device.findOne({
      where: { apiKey },
      attributes: ["id", "userId", "sessionId", "alias", "status"],
    });

    if (!device) {
      return res.status(401).json({
        error: "Invalid device API key",
      });
    }

    // Attach device to request object
    req.device = device;
    next();
  } catch (error) {
    console.error("Error in device authentication:", error);
    res.status(500).json({
      error: "Internal server error during device authentication",
    });
  }
};

export default deviceAuth;
