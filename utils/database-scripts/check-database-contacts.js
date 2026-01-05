const { sequelize, ContactData } = require("./src/models");

async function checkDatabaseContacts() {
  try {
    console.log("Checking database for saved contacts...");

    // Check for any contacts with messaging history sources
    const messagingHistoryContacts = await ContactData.findAll({
      where: {
        sessionId: "user_6658_device_fahmi",
        source: ["messaging_history", "messaging_history_chats"],
      },
      order: [["lastUpdated", "DESC"]],
    });

    console.log(
      `Found ${messagingHistoryContacts.length} contacts from messaging history`
    );

    if (messagingHistoryContacts.length > 0) {
      console.log("Sample contacts:");
      messagingHistoryContacts.slice(0, 5).forEach((contact, i) => {
        console.log(
          `${i + 1}. ${contact.jid} - ${contact.whatsappName} (${
            contact.source
          })`
        );
      });
    }

    // Check for all contacts for this session
    const allContacts = await ContactData.findAll({
      where: {
        sessionId: "user_6658_device_fahmi",
      },
      order: [["lastUpdated", "DESC"]],
    });

    console.log(`\nTotal contacts for session: ${allContacts.length}`);

    if (allContacts.length > 0) {
      console.log("\nAll contact sources:");
      const sourceCounts = {};
      allContacts.forEach((contact) => {
        sourceCounts[contact.source] = (sourceCounts[contact.source] || 0) + 1;
      });
      console.log(sourceCounts);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error checking database:", error);
    process.exit(1);
  }
}

checkDatabaseContacts();
