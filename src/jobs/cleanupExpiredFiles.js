import cron from "node-cron";
import { StoredFile } from "../models/index.js";

class FileCleanupService {
  constructor() {
    this.isRunning = false;
  }

  // Start the cleanup cron job
  start() {
    // Run every day at 2 AM
    cron.schedule("0 2 * * *", async () => {
      await this.cleanupExpiredFiles();
    });

    console.log("[FILE-CLEANUP] Cleanup job scheduled to run daily at 2 AM");
  }

  async cleanupExpiredFiles() {
    if (this.isRunning) {
      console.log("[FILE-CLEANUP] Cleanup already running, skipping...");
      return;
    }

    this.isRunning = true;
    console.log("[FILE-CLEANUP] Starting expired files cleanup...");

    try {
      const deletedCount = await StoredFile.cleanupExpired();
      console.log(
        `[FILE-CLEANUP] Successfully cleaned up ${deletedCount} expired files`
      );
    } catch (error) {
      console.error("[FILE-CLEANUP] Error during cleanup:", error);
    } finally {
      this.isRunning = false;
    }
  }

  // Manual cleanup trigger (for API endpoint)
  async manualCleanup() {
    if (this.isRunning) {
      throw new Error("Cleanup is already running");
    }

    return await this.cleanupExpiredFiles();
  }
}

// Create and export singleton instance
const fileCleanupService = new FileCleanupService();

// Auto-start the service
fileCleanupService.start();

export default fileCleanupService;
