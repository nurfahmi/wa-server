-- ================================================
-- WhatsApp Warmer Feature - Database Cleanup Script
-- ================================================
-- This script removes all database tables related to the warmer feature
-- 
-- IMPORTANT: Backup your database before running this script!
-- 
-- Usage:
--   mysql -u your_username -p your_database < cleanup-warmer-tables.sql
-- 
-- Or run directly in MySQL:
--   mysql> source /path/to/cleanup-warmer-tables.sql
-- ================================================

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Drop warmer-related tables in correct order (child tables first)
DROP TABLE IF EXISTS `WarmerConversationLogs`;
DROP TABLE IF EXISTS `WarmerConversationTemplates`;
DROP TABLE IF EXISTS `WarmerCampaigns`;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verify tables are dropped
SELECT 
    'Cleanup complete! The following warmer tables have been removed:' AS Status;
SELECT 
    '- WarmerConversationLogs' AS RemovedTable
UNION ALL
SELECT 
    '- WarmerConversationTemplates'
UNION ALL
SELECT 
    '- WarmerCampaigns';

-- Show remaining tables (for verification)
SELECT 
    'Remaining tables in database:' AS Info;
SHOW TABLES;
