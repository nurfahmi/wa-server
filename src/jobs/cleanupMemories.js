import AIService from "../services/AIService.js";
import cron from "node-cron";

// Create an instance of AIService
const aiService = new AIService();

// Run cleanup every hour
cron.schedule("0 * * * *", async () => {
  console.log(
    "[Memory Cleanup] Starting cleanup of expired AI conversation memories"
  );
  try {
    await aiService.cleanupExpiredMemories();
    console.log("[Memory Cleanup] Successfully cleaned up expired memories");
  } catch (error) {
    console.error("[Memory Cleanup] Error during cleanup:", error);
  }
});
