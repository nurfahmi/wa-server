"use strict";

/**
 * Migration: Add Purchase Intent Tracking to ChatSettings
 * This enables AI to track and score customer purchase interest
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    // Add purchase intent score (0-100)
    await queryInterface.addColumn("ChatSettings", "purchaseIntentScore", {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Purchase intent score from 0 (cold) to 100 (ready to buy)",
    });

    // Add purchase intent stage
    await queryInterface.addColumn("ChatSettings", "purchaseIntentStage", {
      type: DataTypes.STRING(20),
      defaultValue: "cold",
      comment: "Intent stage: cold, curious, interested, hot, closing",
    });

    // Add detected buying signals
    await queryInterface.addColumn("ChatSettings", "intentSignals", {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "Array of detected buying signals",
    });

    // Add detected objections
    await queryInterface.addColumn("ChatSettings", "intentObjections", {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "Array of objections/hesitations detected",
    });

    // Add products of interest
    await queryInterface.addColumn("ChatSettings", "productsOfInterest", {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "Array of products the customer has shown interest in",
    });

    // Add AI recommended action
    await queryInterface.addColumn("ChatSettings", "aiRecommendedAction", {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "AI recommended next action: nurture, educate, present_offer, handle_objection, close_sale, handover",
    });

    // Add intent updated timestamp
    await queryInterface.addColumn("ChatSettings", "intentUpdatedAt", {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last time intent was analyzed",
    });

    // Add intent history for tracking changes
    await queryInterface.addColumn("ChatSettings", "intentHistory", {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "History of intent score changes over time",
    });

    // Add index for efficient sorting by intent score
    await queryInterface.addIndex("ChatSettings", ["purchaseIntentScore"], {
      name: "idx_purchase_intent_score",
    });

    await queryInterface.addIndex("ChatSettings", ["purchaseIntentStage"], {
      name: "idx_purchase_intent_stage",
    });

    console.log("✅ Purchase Intent Tracking columns added to ChatSettings");
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("ChatSettings", "purchaseIntentScore");
    await queryInterface.removeColumn("ChatSettings", "purchaseIntentStage");
    await queryInterface.removeColumn("ChatSettings", "intentSignals");
    await queryInterface.removeColumn("ChatSettings", "intentObjections");
    await queryInterface.removeColumn("ChatSettings", "productsOfInterest");
    await queryInterface.removeColumn("ChatSettings", "aiRecommendedAction");
    await queryInterface.removeColumn("ChatSettings", "intentUpdatedAt");
    await queryInterface.removeColumn("ChatSettings", "intentHistory");

    await queryInterface.removeIndex("ChatSettings", "idx_purchase_intent_score");
    await queryInterface.removeIndex("ChatSettings", "idx_purchase_intent_stage");

    console.log("❌ Purchase Intent Tracking columns removed from ChatSettings");
  },
};
