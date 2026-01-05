#!/usr/bin/env node

/**
 * AI Providers Seeder Utility
 * Quick script to populate AI providers and models
 */

require("dotenv").config();

const { seedAIProviders } = require("../src/seeders/ai-providers-seeder");

async function runSeeder() {
  try {
    console.log("🚀 Starting AI Providers Seeder...");
    console.log("=".repeat(50));

    // Import sequelize here to ensure env vars are loaded
    const { sequelize } = require("../src/models");

    // Test database connection
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");

    // Run the seeder
    await seedAIProviders();

    console.log("\n" + "=".repeat(50));
    console.log("🎉 AI Providers seeding completed successfully!");
    console.log("🔧 Your UniversalAIService is now ready to use");
    console.log("📚 Check your database for the new providers and models");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    console.error(
      "💡 Make sure your database is running and .env is configured"
    );
    process.exit(1);
  }
}

// Show usage if help is requested
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
🤖 AI Providers Seeder

This script populates your database with AI providers and models for the UniversalAIService.

Usage:
  node utils/seed-ai-providers.js
  npm run seed:ai (if you add this to package.json)

What gets seeded:
  ✅ OpenAI (GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo)
  ✅ DeepSeek (Chat V3, Reasoner R1)
  ✅ Anthropic (Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus)
  ✅ Google AI (Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini Pro)
  ✅ Groq (Llama 3.1 70B, Llama 3.1 8B, Mixtral 8x7B)

Pricing is current as of 2024/2025.

Requirements:
  - Database connection configured in .env
  - AIProvider and AIModel tables exist (run migrations first)
  `);
  process.exit(0);
}

// Run the seeder
runSeeder();
