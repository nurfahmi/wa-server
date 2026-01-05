# Utils Directory

This directory contains utility scripts for database management and migrations.

## Clean Database Script

## Database Management Scripts

### 🚨 **WARNING: DESTRUCTIVE OPERATIONS**

#### **`clean-database.js`** - **COMPLETELY CLEARS ALL WHATSAPP DATA**
- Removes all device sessions and authentication data
- Deletes all messages, contacts, and chats
- Clears all uploaded files and AI conversation history
- **Cannot be undone** - backup your data first!

Usage:
```bash
# ⚠️  WARNING: This will delete ALL data permanently!
npm run db:clean
# OR
node utils/clean-database.js
```

#### **`remove-device.js`** - **Remove Single Device Session**
- Removes a specific WhatsApp device and all its related data
- Keeps all other devices and data intact
- Useful for cleaning up individual corrupted sessions

Usage:
```bash
# Remove specific device by session ID
npm run db:remove-device user_workspace_3_device_account_17
# OR
node utils/remove-device.js user_workspace_3_device_account_17
```

#### **`update-device-status-enum.js`** - **Fix Database Schema**
- Updates the Device status column enum to include 'synchronizing'
- Fixes "Data truncated" errors when Baileys sets status to 'synchronizing'
- Required after Baileys v7.0.0 update

Usage:
```bash
npm run db:migrate-status
# OR
node utils/migration-scripts/update-device-status-enum.js
```

### What Gets Deleted:
- ✅ Device sessions (all WhatsApp connections)
- ✅ Authentication keys (all Baileys auth data)
- ✅ Messages (all chat history)
- ✅ Contacts (all contact information)
- ✅ Chats and chat settings
- ✅ Uploaded files (both database records and files)
- ✅ AI conversation memory and usage logs

### When to Use:
- Starting fresh with a clean WhatsApp setup
- Testing new features without old session conflicts
- Removing corrupted session data
- Preparing for production deployment

### Safety Features:
- Requires typing "YES" to confirm deletion
- Shows detailed warning messages
- Only deletes WhatsApp-related data (preserves templates, AI providers, etc.)

**⚠️ Always backup your database before running this script!**

## Migration Scripts (`migration-scripts/`)

These are the **ESSENTIAL** migration scripts for upgrading your database:

### 🔥 **REQUIRED for All Users**

- **`run-safe-userid-migration.js`** - Converts `userId` from BIGINT to STRING format (UUID)
  - **MUST RUN** when upgrading from older versions
  - Safe migration that preserves all data

### 🤖 **OPTIONAL - AI Features**

- **`run-ai-migrations.js`** - Creates AI-related tables and features
  - Only needed if you want to use AI functionality
  - Creates: AIProviders, AIModels, AIUsageLogs, UserAISettings, etc.

### 🔥 **OPTIONAL - Warmer Features**

- **`create-warmer-tables.js`** - Creates conversation warming system tables
  - Only needed if you want to use the warmer/campaign features
  - Creates: WarmerCampaigns, WarmerTemplates, WarmerLogs, etc.

## Database Scripts (`database-scripts/`)

These are utility scripts for specific database maintenance tasks:

### 🔧 **Maintenance Scripts**

- **`cleanup-migration.js`** - Cleans up failed migration artifacts

  - Use if a migration fails and leaves temporary columns
  - Removes `userId_temp` columns from tables

- **`update-contact-schema.js`** - Updates contact schema for PostgreSQL

  - Adds `lastUpdated` column to contact_data table
  - Updates enum types for contact sources

- **`check-database-contacts.js`** - Diagnostic script for contact data
  - Checks contact data integrity
  - Useful for debugging contact sync issues

## Usage Instructions

### For Basic Migration (Most Users):

```bash
# 1. Backup your database first!
mysqldump -u username -p database_name > backup_$(date +%Y%m%d).sql

# 2. Run the essential migration
node utils/migration-scripts/run-safe-userid-migration.js

# 3. Start your application
npm start
```

### For Full Feature Set:

```bash
# After basic migration, add optional features:
node utils/migration-scripts/run-ai-migrations.js          # For AI features
node utils/migration-scripts/create-warmer-tables.js       # For warmer features
```

### For Database Issues:

```bash
# If migration fails:
node utils/database-scripts/cleanup-migration.js

# For PostgreSQL contact schema updates:
node utils/database-scripts/update-contact-schema.js

# To check contact data:
node utils/database-scripts/check-database-contacts.js
```

## Important Notes

- **Always backup your database** before running any migration scripts
- Run migrations in a **development environment first**
- The `run-safe-userid-migration.js` is the **most important** script for upgrades
- Other scripts are optional based on features you want to use
- If you encounter issues, check the cleanup scripts in `database-scripts/`
