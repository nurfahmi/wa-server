import config from "../config/config.js";

const apiAuth = (req, res, next) => {
  const token = req.header("X-API-Token");

  if (!token || token !== config.apiToken) {
    return res.status(401).json({ error: "Invalid API token" });
  }

  next();
};

export default apiAuth;
