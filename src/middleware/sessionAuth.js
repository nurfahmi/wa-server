import WhatsAppService from "../services/WhatsAppService.js";

const sessionAuth = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const validation = await WhatsAppService.validateSession(sessionId);

    if (!validation.valid) {
      return res.status(404).json({ error: validation.error });
    }

    // Attach session info to request object
    req.whatsapp = {
      session: validation.session,
      device: validation.device,
      status: validation.status,
    };

    next();
  } catch (error) {
    console.error("Session validation error:", error);
    res.status(500).json({ error: "Failed to validate session" });
  }
};

export default sessionAuth;
