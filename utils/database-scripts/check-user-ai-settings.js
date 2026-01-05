// Check AI settings for a specific userId
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const { Device, UserAISettings, StoredFile } = require("../../src/models");

async function checkUserAISettings(userId) {
  try {
    console.log(`\n🔍 Checking AI settings for userId: ${userId}\n`);
    console.log("=" .repeat(60));

    // Get user-level AI settings
    const userAISettings = await UserAISettings.findOne({
      where: { userId },
    });

    if (userAISettings) {
      console.log("\n📋 User-Level AI Settings:");
      console.log(JSON.stringify(userAISettings.toJSON(), null, 2));
    } else {
      console.log("\n📋 User-Level AI Settings: Not configured (using defaults)");
    }

    // Get all devices for this user
    const devices = await Device.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });

    console.log(`\n📱 Devices for userId "${userId}": ${devices.length}`);
    console.log("=" .repeat(60));

    for (const device of devices) {
      console.log(`\n🔹 Device: ${device.alias} (ID: ${device.id})`);
      console.log(`   Session ID: ${device.sessionId}`);
      console.log(`   Status: ${device.status}`);
      console.log(`\n   AI Settings:`);
      console.log(`   - AI Enabled: ${device.aiEnabled}`);
      console.log(`   - AI Auto Reply: ${device.aiAutoReply}`);
      console.log(`   - AI Provider: ${device.aiProvider || "openai"}`);
      console.log(`   - AI Model: ${device.aiModel || "default"}`);
      console.log(`   - AI Bot Name: ${device.aiBotName || "N/A"}`);
      console.log(`   - AI Language: ${device.aiLanguage || "id"}`);
      console.log(`   - AI Max Tokens: ${device.aiMaxTokens || 500}`);
      console.log(`   - AI Temperature: ${device.aiTemperature || 0.7}`);

      // Check product knowledge
      if (device.productKnowledge) {
        let productKnowledge = device.productKnowledge;
        
        // Handle both string and object formats
        if (typeof productKnowledge === "string") {
          try {
            productKnowledge = JSON.parse(productKnowledge);
          } catch (e) {
            console.log(`   - Product Knowledge: Invalid JSON format`);
            continue;
          }
        }

        if (productKnowledge && productKnowledge.items && Array.isArray(productKnowledge.items)) {
          console.log(`\n   📦 Product Knowledge (${productKnowledge.items.length} items):`);
          
          for (const item of productKnowledge.items) {
            console.log(`\n      Product: ${item.name || "Unnamed"}`);
            console.log(`      - Image ID: ${item.imageId || "NOT SET"}`);
            console.log(`      - Image URL: ${item.imageUrl || "N/A"}`);
            console.log(`      - Price: ${item.price || "N/A"}`);
            console.log(`      - Description: ${item.description ? item.description.substring(0, 50) + "..." : "N/A"}`);
            
            // Verify if image file exists
            if (item.imageId) {
              const imageFile = await StoredFile.findOne({
                where: {
                  id: item.imageId,
                  fileType: "image",
                },
              });
              
              if (imageFile) {
                console.log(`      ✅ Image file found:`);
                console.log(`         - File Name: ${imageFile.originalName}`);
                console.log(`         - File Path: ${imageFile.filePath}`);
                console.log(`         - User ID: ${imageFile.userId}`);
                console.log(`         - Expired: ${imageFile.isExpired()}`);
                console.log(`         - Size: ${imageFile.size} bytes`);
                
                // Check if file belongs to correct user
                if (imageFile.userId !== userId) {
                  console.log(`      ⚠️  WARNING: Image belongs to userId "${imageFile.userId}", not "${userId}"`);
                }
              } else {
                console.log(`      ❌ Image file NOT FOUND in database (ID: ${item.imageId})`);
              }
            }
          }
        } else {
          console.log(`   - Product Knowledge: Empty or invalid structure`);
        }
      } else {
        console.log(`   - Product Knowledge: Not configured`);
      }

      // Check sales scripts
      if (device.salesScripts) {
        let salesScripts = device.salesScripts;
        if (typeof salesScripts === "string") {
          try {
            salesScripts = JSON.parse(salesScripts);
          } catch (e) {
            // Ignore parse errors
          }
        }
        if (salesScripts && salesScripts.items) {
          console.log(`\n   💼 Sales Scripts: ${salesScripts.items.length} items`);
        }
      }

      console.log("\n" + "-".repeat(60));
    }

    // List all image files for this user
    console.log(`\n📁 Image Files for userId "${userId}":`);
    const imageFiles = await StoredFile.findAll({
      where: {
        userId,
        fileType: "image",
      },
      order: [["createdAt", "DESC"]],
      limit: 20,
    });

    if (imageFiles.length > 0) {
      console.log(`Found ${imageFiles.length} image files:\n`);
      imageFiles.forEach((file, index) => {
        console.log(`${index + 1}. ID: ${file.id}`);
        console.log(`   Name: ${file.originalName}`);
        console.log(`   Path: ${file.filePath}`);
        console.log(`   Size: ${file.size} bytes`);
        console.log(`   Created: ${file.createdAt}`);
        console.log(`   Expired: ${file.isExpired()}`);
        console.log(`   Preview URL: http://localhost:3000/api/whatsapp/files/${file.id}/preview`);
        console.log("");
      });
    } else {
      console.log("No image files found for this userId.\n");
    }

    console.log("=" .repeat(60));
    console.log("\n✅ Check completed!\n");

    await require("../../src/models").sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error checking AI settings:", error);
    await require("../../src/models").sequelize.close();
    process.exit(1);
  }
}

// Get userId from command line argument or use default
const userId = process.argv[2] || "workspace_3";

checkUserAISettings(userId);

