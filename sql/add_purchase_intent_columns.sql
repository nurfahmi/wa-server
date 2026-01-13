-- Purchase Intent Tracking Columns Migration
-- Run this SQL script to add intent tracking columns to ChatSettings table

-- Add purchase intent score (0-100)
ALTER TABLE ChatSettings ADD COLUMN IF NOT EXISTS purchaseIntentScore INT DEFAULT 0 COMMENT 'Purchase intent score from 0 (cold) to 100 (ready to buy)';

-- Add purchase intent stage
ALTER TABLE ChatSettings ADD COLUMN IF NOT EXISTS purchaseIntentStage VARCHAR(20) DEFAULT 'cold' COMMENT 'Intent stage: cold, curious, interested, hot, closing';

-- Add detected buying signals
ALTER TABLE ChatSettings ADD COLUMN IF NOT EXISTS intentSignals JSON DEFAULT NULL COMMENT 'Array of detected buying signals';

-- Add detected objections
ALTER TABLE ChatSettings ADD COLUMN IF NOT EXISTS intentObjections JSON DEFAULT NULL COMMENT 'Array of objections/hesitations detected';

-- Add products of interest
ALTER TABLE ChatSettings ADD COLUMN IF NOT EXISTS productsOfInterest JSON DEFAULT NULL COMMENT 'Array of products the customer has shown interest in';

-- Add AI recommended action
ALTER TABLE ChatSettings ADD COLUMN IF NOT EXISTS aiRecommendedAction VARCHAR(50) DEFAULT NULL COMMENT 'AI recommended next action: nurture, educate, present_offer, handle_objection, close_sale, handover';

-- Add intent updated timestamp
ALTER TABLE ChatSettings ADD COLUMN IF NOT EXISTS intentUpdatedAt DATETIME DEFAULT NULL COMMENT 'Last time intent was analyzed';

-- Add intent history for tracking changes
ALTER TABLE ChatSettings ADD COLUMN IF NOT EXISTS intentHistory JSON DEFAULT NULL COMMENT 'History of intent score changes over time';

-- Add indexes for efficient sorting
CREATE INDEX IF NOT EXISTS idx_purchase_intent_score ON ChatSettings (purchaseIntentScore);
CREATE INDEX IF NOT EXISTS idx_purchase_intent_stage ON ChatSettings (purchaseIntentStage);

-- Verify columns were added
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'ChatSettings' 
AND COLUMN_NAME LIKE '%intent%' OR COLUMN_NAME LIKE 'purchase%';
