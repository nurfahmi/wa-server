// List all image files for a userId
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const { StoredFile } = require("../../src/models");

async function listUserImages(userId) {
  try {
    const files = await StoredFile.findAll({
      where: {
        userId,
        fileType: "image",
      },
      order: [["createdAt", "DESC"]],
    });

    console.log(`\n📁 All Image Files for userId "${userId}": ${files.length} files\n`);
    console.log("=" .repeat(80));

    files.forEach((file, index) => {
      console.log(`\n${index + 1}. File ID: ${file.id}`);
      console.log(`   Original Name: ${file.originalName}`);
      console.log(`   Stored Name: ${file.storedName}`);
      console.log(`   File Path: ${file.filePath}`);
      console.log(`   Size: ${file.size} bytes`);
      console.log(`   MIME Type: ${file.mimeType}`);
      console.log(`   Created: ${file.createdAt}`);
      console.log(`   Expired: ${file.isExpired()}`);
      console.log(`   Preview URL: http://localhost:3000/api/whatsapp/files/${file.id}/preview`);
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
listUserImages(userId);

