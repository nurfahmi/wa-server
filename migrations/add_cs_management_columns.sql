-- Run this SQL to add the new CS Management columns
-- Connect to your database first: mysql -h localhost -P 8889 -u user1 db_wa

-- ChatSettings new columns (run each separately if one fails due to duplicate)
ALTER TABLE ChatSettings ADD COLUMN assignedAgentId VARCHAR(255) NULL;
ALTER TABLE ChatSettings ADD COLUMN assignedAgentName VARCHAR(255) NULL;
ALTER TABLE ChatSettings ADD COLUMN assignedAt DATETIME NULL;
ALTER TABLE ChatSettings ADD COLUMN labels JSON DEFAULT NULL;
ALTER TABLE ChatSettings ADD COLUMN humanTakeover TINYINT(1) DEFAULT 0;
ALTER TABLE ChatSettings ADD COLUMN humanTakeoverAt DATETIME NULL;
ALTER TABLE ChatSettings ADD COLUMN humanTakeoverBy VARCHAR(255) NULL;
ALTER TABLE ChatSettings ADD COLUMN status ENUM('open','pending','resolved','closed') DEFAULT 'open';
ALTER TABLE ChatSettings ADD COLUMN priority ENUM('low','normal','high','urgent') DEFAULT 'normal';

-- ChatHistory table (new table)
CREATE TABLE IF NOT EXISTS ChatHistories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  deviceId BIGINT NOT NULL,
  sessionId VARCHAR(255) NOT NULL,
  chatId VARCHAR(255) NOT NULL,
  phoneNumber VARCHAR(255) NOT NULL,
  messageId VARCHAR(255) NULL,
  direction ENUM('incoming', 'outgoing') NOT NULL,
  messageType VARCHAR(255) NOT NULL DEFAULT 'text',
  content TEXT NULL,
  mediaUrl TEXT NULL,
  caption TEXT NULL,
  timestamp DATETIME NOT NULL,
  fromMe TINYINT(1) NOT NULL DEFAULT 0,
  senderName VARCHAR(255) NULL,
  rawMessage JSON NULL,
  agentId VARCHAR(255) NULL,
  agentName VARCHAR(255) NULL,
  isAiGenerated TINYINT(1) DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_device_chat (deviceId, chatId),
  INDEX idx_session_chat (sessionId, chatId),
  INDEX idx_timestamp (timestamp),
  INDEX idx_phone (phoneNumber)
);

-- Add unique index separately (may fail if duplicate messages exist)
-- ALTER TABLE ChatHistories ADD UNIQUE INDEX unique_device_message (deviceId, messageId);
