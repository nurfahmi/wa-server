import { sequelize } from "../models/index.js";
import { QueryTypes } from "sequelize";

async function backfillStatus() {
  try {
    const queryInterface = sequelize.getQueryInterface();

    console.log("Backfilling outgoing messages status to 'sent'...");
    await sequelize.query(
      "UPDATE ChatHistories SET status = 'sent', sentAt = timestamp WHERE (status = 'pending' OR status IS NULL) AND direction = 'outgoing'",
      { type: QueryTypes.UPDATE }
    );
    console.log("Outgoing messages updated.");

    console.log("Backfilling incoming messages status to 'delivered'...");
    await sequelize.query(
      "UPDATE ChatHistories SET status = 'delivered', deliveredAt = timestamp WHERE (status = 'pending' OR status IS NULL) AND direction = 'incoming'",
      { type: QueryTypes.UPDATE }
    );
    console.log("Incoming messages updated.");

    console.log("Backfill completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  }
}

backfillStatus();
