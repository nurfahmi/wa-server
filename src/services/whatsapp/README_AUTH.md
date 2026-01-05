# Custom MySQL Auth State Handler

## Overview

This project uses a **custom MySQL authentication state handler** instead of the `mysql-baileys` package for better reliability and control over WhatsApp session authentication.

## Why Custom Implementation?

The `mysql-baileys` package had several issues:
- ❌ Potential authentication errors (stream error 516)
- ❌ Session disconnection problems
- ❌ Less control over data serialization
- ❌ Dependency on external package maintenance

Our custom implementation:
- ✅ Direct control over auth data storage
- ✅ Uses Sequelize for database operations
- ✅ Proper Buffer handling with Baileys' BufferJSON
- ✅ Better error handling and logging
- ✅ No external auth package dependencies

## Implementation

### File Structure

```
src/services/whatsapp/
├── MySQLAuthState.js       # Custom auth state handler
├── SessionManager.js        # Uses custom auth state
└── README_AUTH.md          # This file
```

### How It Works

1. **Auth Data Storage**: Stores authentication data in the `auth_data` table
   - `session`: Session identifier (e.g., "userId-alias")
   - `id`: Data identifier (e.g., "creds", "app-state-sync-key-XXXXX")
   - `value`: JSON serialized auth data

2. **Buffer Handling**: Uses Baileys' `BufferJSON` for proper serialization
   - Converts Buffers to base64 for storage
   - Restores Buffers when reading from database

3. **Key Management**: Implements Baileys' auth state interface
   - `state.creds`: Authentication credentials
   - `state.keys.get()`: Retrieve keys by type and IDs
   - `state.keys.set()`: Store or remove keys
   - `saveCreds()`: Save credentials to database
   - `removeCreds()`: Remove all session auth data

## Database Schema

The `auth_data` table structure:

```sql
CREATE TABLE `auth_data` (
  `session` VARCHAR(50) NOT NULL,
  `id` VARCHAR(100) NOT NULL,
  `value` JSON,
  PRIMARY KEY (`session`, `id`),
  KEY `idx_session` (`session`),
  KEY `idx_id` (`id`)
) ENGINE=InnoDB;
```

## Usage

The custom auth state is automatically used by `SessionManager`:

```javascript
// In SessionManager.js
import { useCustomMySQLAuthState } from "./MySQLAuthState.js";

async getAuthState(sessionId) {
  return await useCustomMySQLAuthState(sessionId);
}
```

## Benefits

1. **Reliability**: Direct database operations with Sequelize
2. **Maintainability**: Full control over the codebase
3. **Debugging**: Better error messages and logging
4. **Performance**: Optimized queries with proper indexing
5. **Compatibility**: Always compatible with latest Baileys version

## Migration from mysql-baileys

If you were previously using `mysql-baileys`, the data structure is compatible. No migration needed - the custom handler will read existing auth data seamlessly.

## Troubleshooting

### Session Authentication Fails

1. Check database connection
2. Verify `auth_data` table exists
3. Check logs for specific error messages

### Session Disconnects Frequently

1. Ensure only one instance per session
2. Check network stability
3. Verify WhatsApp Web version compatibility

### Cannot Read Auth Data

1. Check database permissions
2. Verify JSON data is not corrupted
3. Check session ID format

## Related Files

- `src/models/AuthData.js` - Sequelize model definition
- `src/services/whatsapp/SessionManager.js` - Session management
- `src/services/whatsapp/ConnectionHandler.js` - Connection handling

