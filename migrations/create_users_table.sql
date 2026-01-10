-- Create Users table
CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role ENUM('user', 'superadmin') DEFAULT 'user',
    planName VARCHAR(255),
    deviceLimit INTEGER DEFAULT 1,
    lastLogin DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Note: Device table already has userId as STRING (UUID) from previous implementation.
-- We might need to adjust it to INTEGER if we strictly want FK to Users.id (which is INTEGER from IndosoftHouse).
-- For now, let's keep it loose or migrate data if needed.
-- Since the existing userId in Device is likely a UUID string, and the new User.id is INT.
-- We will need to decide: EITHER change Device.userId to INT OR change User.id to STRING.
-- IndosoftHouse IDs are usually INTs. So we should probably modify Device.userId to support INTs or just Strings.
-- Be safe: Let's assume we proceed with whatever format User.id is (INTEGER).

-- OPTIONAL: Add index for performance if not exists
-- CREATE INDEX idx_users_email ON Users(email);
