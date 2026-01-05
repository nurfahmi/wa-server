// Check product knowledge imageIds for a userId
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const { Device } = require("../../src/models");

async function checkProductImages(userId) {
  try {
    const device = await Device.findOne({
      where: { userId },
    });

    if (!device) {
      console.log(`❌ No device found for userId: ${userId}`);
      await require("../../src/models").sequelize.close();
      process.exit(1);
    }

    console.log(`\n📱 Device: ${device.alias} (ID: ${device.id})`);
    console.log(`   User ID: ${device.userId}`);
    console.log(`   Status: ${device.status}\n`);

    const productKnowledge = device.productKnowledge?.items || [];
    console.log(`\n📦 Product Knowledge (${productKnowledge.length} products):\n`);
    console.log("=" .repeat(80));

    productKnowledge.forEach((product, index) => {
      console.log(`\n${index + 1}. Product: ${product.name || "Unnamed"}`);
      console.log(`   Description: ${product.description || "N/A"}`);
      console.log(`   Price: ${product.price || "N/A"}`);
      console.log(`   Image ID: ${product.imageId || "NOT SET"}`);
      if (product.imageId) {
        console.log(`   Preview URL: http://localhost:3000/api/whatsapp/files/${product.imageId}/preview`);
      }
    });

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
checkProductImages(userId);

