import { sequelize, Device, Product } from "../../src/models/index.js";

async function migrateLegacyProducts() {
  try {
    console.log("Starting migration of legacy products to Products table...");

    // Sync only Product table to ensure it exists without touching others
    await Product.sync({ alter: true });
    console.log("Product table synced.");

    // Fetch all devices with product catalog data
    const devices = await Device.findAll();

    for (const device of devices) {
      console.log(`Processing Device ID: ${device.id} (${device.alias})`);
      
      // 1. Check aiProductCatalog (The most recent structured format)
      let catalog = device.aiProductCatalog; 
      // It's already parsed by the model getter, returns { items: [] } if empty
      
      let itemsToMigrate = [];

      if (catalog && Array.isArray(catalog.items) && catalog.items.length > 0) {
        console.log(`- Found ${catalog.items.length} items in aiProductCatalog`);
        itemsToMigrate = [...itemsToMigrate, ...catalog.items];
      }

      // 2. Check productKnowledge (Legacy format)
      // The model getter ensures structure { items: [], otherDescription: "" }
      const legacyKnowledge = device.productKnowledge;
      if (legacyKnowledge && Array.isArray(legacyKnowledge.items) && legacyKnowledge.items.length > 0) {
         console.log(`- Found ${legacyKnowledge.items.length} items in productKnowledge (Legacy)`);
         // Filter out duplicates if any (simple name check)
         const newLegacyItems = legacyKnowledge.items.filter(li => !itemsToMigrate.some(i => i.name === li.name));
         if (newLegacyItems.length > 0) {
             itemsToMigrate = [...itemsToMigrate, ...newLegacyItems];
             console.log(`-- Added ${newLegacyItems.length} unique legacy items`);
         }
      }

      // 3. Migrate Items
      if (itemsToMigrate.length > 0) {
        let successCount = 0;
        for (const item of itemsToMigrate) {
          try {
             // Validation
             if (!item.name) continue;

             // Check if already migrated/exists
             const existing = await Product.findOne({
                where: { deviceId: device.id, name: item.name }
             });

             if (existing) {
                console.log(`-- Skipping ${item.name} (already exists)`);
                continue;
             }

             // Price Parsing
             let rawPrice = 0;
             if (item.price) {
                // Try to strip non-numeric
                const numeric = String(item.price).replace(/[^0-9.]/g, "");
                rawPrice = parseFloat(numeric) || 0;
             }

             await Product.create({
                deviceId: device.id,
                name: item.name,
                description: item.description || "",
                // Store complex price in JSON
                pricing: {
                    raw: rawPrice,
                    currency: item.currency || "IDR",
                    formatted: item.price || "",  // Keep original string as display/formatted
                    promo: item.promo ? { description: item.promo } : null
                },
                // Images
                images: item.imageUrl || item.imageId ? [{
                    url: item.imageUrl || "",
                    id: item.imageId || null,
                    caption: item.name,
                    type: "main"
                }] : [],
                // Default others
                inventoryType: "always_in_stock",
                tags: ["migrated"]
             });
             successCount++;
          } catch (itemError) {
             console.error(`-- Failed to migrate item ${item.name}: ${itemError.message}`);
          }
        }
        console.log(`- Successfully migrated ${successCount} products for Device ${device.id}`);
      } else {
        console.log("- No products found to migrate.");
      }
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateLegacyProducts();
