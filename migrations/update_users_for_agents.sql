-- Add password and managerId to Users table to support CS Agents
ALTER TABLE Users ADD COLUMN password VARCHAR(255) NULL AFTER email;
ALTER TABLE Users ADD COLUMN managerId INT NULL AFTER role;
ALTER TABLE Users MODIFY COLUMN role ENUM('user', 'superadmin', 'agent') DEFAULT 'user';
