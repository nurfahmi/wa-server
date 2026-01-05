// Check all devices for a userId
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const { Device } = require("../../src/models");

async function checkAllDevices(userId) {
  try {
    const devices = await Device.findAll({
      where: { userId },
      order: [["id", "DESC"]],
    });

    console.log(`\n📱 All Devices for userId "${userId}": ${devices.length} devices\n`);
    console.log("=" .repeat(80));

    for (const device of devices) {
      console.log(`\nDevice ID: ${device.id}`);
      console.log(`   Alias: ${device.alias}`);
      console.log(`   Status: ${device.status}`);
      console.log(`   AI Enabled: ${device.aiEnabled}`);
      console.log(`   AI Auto Reply: ${device.aiAutoReply}`);
      console.log(`   AI Provider: ${device.aiProvider}`);
      console.log(`   AI Model: ${device.aiModel || "default"}`);
      
      const productKnowledge = device.productKnowledge?.items || [];
      console.log(`   Products: ${productKnowledge.length} items`);
      
      if (productKnowledge.length > 0) {
        console.log(`   Product Images:`);
        productKnowledge.forEach((product, idx) => {
          console.log(`      ${idx + 1}. ${product.name || "Unnamed"}: ${product.imageId || "NOT SET"}`);
        });
      }
    }

    console.log("\n" + "=" .repeat(80));
    await require("../../src/models").sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    await require("../../src/models").sequelize.close();
    process.exit(1);
  }
}

const userId = process.argv[2] || "workspace_3";
checkAllDevices(userId);

