const { BusinessTemplate } = require("../models");

// Import individual business type seeders
const { seedEcommerceTemplates } = require("./ecommerce-templates");
const { seedHealthcareTemplates } = require("./healthcare-templates");
const { seedRestaurantTemplates } = require("./restaurant-templates");
const { seedEducationTemplates } = require("./education-templates");
const { seedTravelTemplates } = require("./travel-templates");
const { seedAutomotiveTemplates } = require("./automotive-templates");
const { seedRealEstateTemplates } = require("./real-estate-templates");
const { seedFinanceTemplates } = require("./finance-templates");
const { seedBeautyTemplates } = require("./beauty-templates");

// Import AI providers seeder
const { seedAIProviders } = require("./ai-providers-seeder");

// All business types mapping for easier management
const businessTypeSeeders = {
  ecommerce: seedEcommerceTemplates,
  healthcare: seedHealthcareTemplates,
  restaurant: seedRestaurantTemplates,
  education: seedEducationTemplates,
  travel: seedTravelTemplates,
  automotive: seedAutomotiveTemplates,
  "real-estate": seedRealEstateTemplates,
  finance: seedFinanceTemplates,
  beauty: seedBeautyTemplates,
};

// Function to seed all remaining business type templates
async function seedRemainingTemplates() {
  try {
    console.log("📋 Seeding remaining business templates...");

    const results = await Promise.all([
      seedRestaurantTemplates(),
      seedEducationTemplates(),
      seedTravelTemplates(),
      seedAutomotiveTemplates(),
      seedRealEstateTemplates(),
      seedFinanceTemplates(),
      seedBeautyTemplates(),
    ]);

    const totalCreated = results.flat().length;
    console.log(
      `✅ Remaining business types: ${totalCreated} templates seeded`
    );

    return results.flat();
  } catch (error) {
    console.error("❌ Error seeding remaining templates:", error);
    throw error;
  }
}

// Master seeding function
async function seedAllBusinessTemplates() {
  try {
    console.log("🌱 Starting comprehensive business templates seeding...");
    console.log("=".repeat(60));

    const results = [];

    // Seed each business type using dedicated seeders
    results.push(await seedEcommerceTemplates());
    results.push(await seedHealthcareTemplates());
    results.push(await seedRemainingTemplates());

    const totalCreated = results.flat().length;

    console.log("\n" + "=".repeat(60));
    console.log(`🎉 SEEDING COMPLETED SUCCESSFULLY!`);
    console.log(`📈 Total templates seeded: ${totalCreated}`);

    // Get final summary
    const allTemplates = await BusinessTemplate.findAll();
    const finalSummary = {};
    allTemplates.forEach((template) => {
      if (!finalSummary[template.businessType]) {
        finalSummary[template.businessType] = [];
      }
      finalSummary[template.businessType].push(template.language);
    });

    console.log(`\n📊 Final coverage summary:`);
    Object.keys(finalSummary)
      .sort()
      .forEach((businessType) => {
        const languages = [...new Set(finalSummary[businessType])].sort();
        console.log(
          `🔹 ${businessType.toUpperCase()}: ${languages.join(", ")}`
        );
      });

    console.log(`\n🌐 Business Types: ${Object.keys(finalSummary).length}`);
    console.log(`🌍 Languages: ID, EN, MS`);
    console.log(`📊 Total Templates: ${allTemplates.length}`);

    return allTemplates;
  } catch (error) {
    console.error("❌ Error in master seeding:", error);
    throw error;
  }
}

// Function to seed everything including AI providers
async function seedEverything() {
  try {
    console.log(
      "🚀 Starting comprehensive seeding (Business Templates + AI Providers)..."
    );
    console.log("=".repeat(70));

    // Seed AI Providers first
    console.log("\n🤖 PHASE 1: AI Providers and Models");
    await seedAIProviders();

    console.log("\n📋 PHASE 2: Business Templates");
    await seedAllBusinessTemplates();

    console.log("\n" + "=".repeat(70));
    console.log("🎊 ALL SEEDING COMPLETED SUCCESSFULLY!");
    console.log("✅ AI Providers and Models are ready");
    console.log("✅ Business Templates are ready");
    console.log("🔥 Your application is fully seeded!");

    return true;
  } catch (error) {
    console.error("❌ Error in comprehensive seeding:", error);
    throw error;
  }
}

// Individual seeding functions for specific business types
async function seedSpecificBusinessType(businessType) {
  try {
    console.log(`🎯 Seeding specific business type: ${businessType}`);

    const normalizedType = businessType.toLowerCase();
    const seederFunction = businessTypeSeeders[normalizedType];

    if (seederFunction) {
      return await seederFunction();
    } else {
      console.log(`⚠️  Unknown business type: '${businessType}'`);
      console.log(`💡 Available business types:`);
      Object.keys(businessTypeSeeders).forEach((type) => {
        console.log(`   • ${type}`);
      });
      return [];
    }
  } catch (error) {
    console.error(`❌ Error seeding ${businessType}:`, error);
    throw error;
  }
}

// Export functions
module.exports = {
  seedAllBusinessTemplates,
  seedSpecificBusinessType,
  seedAIProviders,
  seedEverything,
  ...businessTypeSeeders,
  seedRemainingTemplates,
};

// Auto-run if called directly
if (require.main === module) {
  (async () => {
    try {
      const { sequelize } = require("../models");
      await sequelize.authenticate();
      console.log("📊 Database connected");

      // Check for command line arguments
      const args = process.argv.slice(2);

      if (args.length > 0) {
        const command = args[0].toLowerCase();

        if (command === "ai" || command === "ai-providers") {
          await seedAIProviders();
        } else if (command === "everything" || command === "all") {
          await seedEverything();
        } else {
          await seedSpecificBusinessType(command);
        }
      } else {
        // Default to business templates only
        await seedAllBusinessTemplates();
      }

      process.exit(0);
    } catch (error) {
      console.error("💥 Master seeding failed:", error);
      process.exit(1);
    }
  })();
}
