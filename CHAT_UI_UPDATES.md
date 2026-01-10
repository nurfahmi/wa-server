# Chat Management UI Updates

## Summary of Changes

### 1. Chat Deletion Feature

#### Backend (Already Implemented)
- ✅ Added `deleteChat` function in `chatSettingsController.js`
- ✅ Added DELETE route: `/api/whatsapp/devices/:deviceId/chat-settings/:phoneNumber`
- ✅ Deletes both `ChatSettings` and `ChatHistory` records

#### Frontend Updates

**A. Chat Header (Main Chat View)**
- Added **AI/Human toggle buttons** in the header
  - Compact design with icons (Bot/User)
  - Shows "AI" or "Human" text on larger screens
  - Active state highlighted with primary color
  - Located between contact info and action buttons

- Added **Delete Chat button** in header
  - Trash icon button
  - Red hover state (destructive color)
  - Positioned next to Info button
  - Includes tooltip "Delete chat"

**B. Chat List (Sidebar)**
- Added **Delete button** to each chat item
  - Small trash icon in top-right corner
  - Only visible on hover (opacity transition)
  - Red destructive color scheme
  - Stops event propagation (doesn't select chat when clicked)

**C. Delete Confirmation**
- Modal confirmation dialog with detailed warning:
  ```
  Are you sure you want to delete this chat with [Name/Number]?
  
  This will permanently delete:
  - All message history
  - Chat settings
  - Conversation context
  
  This action cannot be undone.
  ```

### 2. Code Changes

#### `Chats.jsx` Changes:

1. **Imports**
   ```javascript
   import { ..., Trash2 } from "lucide-react";
   ```

2. **New Function: `handleDeleteChat`**
   ```javascript
   const handleDeleteChat = async () => {
     // Confirmation dialog
     // API call to delete
     // Update local state
     // Clear selected chat if deleted
   }
   ```

3. **Updated `ChatList` Component**
   - Added `onDelete` prop
   - Added delete button with hover effect
   - Restructured click handlers to prevent conflicts

4. **Updated Chat Header**
   - Added AI/Human toggle (moved from sidebar)
   - Added delete button
   - Improved responsive layout

### 3. UI/UX Features

#### Chat List Delete Button
- **Position**: Top-right corner of each chat item
- **Visibility**: Hidden by default, shows on hover
- **Style**: 
  - Small icon (3.5x3.5)
  - Destructive red color
  - Rounded background
  - Smooth opacity transition
- **Behavior**: 
  - Stops click propagation
  - Shows confirmation modal
  - Removes chat from list on success

#### Header AI/Human Toggle
- **Design**: Pill-shaped toggle group
- **States**: 
  - AI mode (Bot icon)
  - Human mode (User icon)
- **Responsive**: 
  - Hidden on mobile (< sm breakpoint)
  - Shows icon only on medium screens
  - Shows icon + text on large screens

#### Header Delete Button
- **Style**: Icon button with hover effects
- **Color**: Muted by default, red on hover
- **Tooltip**: "Delete chat"

### 4. API Integration

**Delete Endpoint:**
```
DELETE /api/whatsapp/devices/{deviceId}/chat-settings/{phoneNumber}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat and history deleted successfully",
  "deletedMessages": 42
}
```

### 5. State Management

After successful deletion:
1. Remove chat from `chats` array
2. Clear `selectedChat` if it was the deleted chat
3. Clear `messages` array
4. Show success alert

### 6. Real-Time Behavior

- ✅ New chats appear automatically via WebSocket
- ✅ Deleted chats removed from all connected clients
- ✅ Message updates sync in real-time
- ✅ AI/Human toggle updates immediately

## Testing Checklist

- [ ] Delete chat from chat list (hover + click trash icon)
- [ ] Delete chat from header (click trash icon)
- [ ] Confirm deletion modal appears
- [ ] Cancel deletion works
- [ ] Successful deletion removes chat
- [ ] Selected chat clears if deleted
- [ ] AI/Human toggle works in header
- [ ] Toggle state persists after refresh
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Hover states work correctly
- [ ] Tooltips appear on hover

## File Changes

1. `/client/src/pages/Chats.jsx`
   - Added Trash2 import
   - Added handleDeleteChat function
   - Updated ChatList component
   - Updated chat header layout
   - Added onDelete prop passing

2. `/src/controllers/chatSettingsController.js`
   - Added deleteChat function (already done)

3. `/src/routes/chatSettings.js`
   - Added DELETE route (already done)

## Notes

- Delete button uses `group-hover` for smooth UX
- Confirmation uses native `window.confirm` (can be upgraded to custom modal)
- AI/Human toggle moved from sidebar to header for better accessibility
- All changes maintain existing design system and color scheme
