# Multi-User Feature Guide

## Overview
The vocab app now supports multiple users with separate progress tracking. Each user's learned words, quiz scores, and statistics are stored independently.

## How It Works

### Data Persistence
- All data is stored in the browser's localStorage
- Each user gets a unique storage key: `vocabProgress_user_[timestamp]`
- User list is stored separately in `vocabUsers`
- Current user selection is saved in `vocabCurrentUser`

### User Management

#### Creating a New User
1. When you first open the app (or if no user is selected), a modal will appear
2. Enter your name in the input field
3. Click "Create New User" or press Enter
4. Your profile is created and you're logged in

#### Switching Users
1. Click the user button in the header (shows current user's name with a user icon)
2. Select a different user from the list
3. The app will reload with that user's data

#### Deleting a User
1. Open the user modal by clicking the user button in the header
2. Click the delete icon (trash can) next to the user you want to remove
3. Confirm the deletion
4. The user's profile and all their data will be permanently deleted

## Testing Multi-User Functionality

### Test Scenario 1: Two Users with Different Progress
1. Create User 1 (e.g., "Alice")
2. Mark 5 words as learned
3. Click the user button and create User 2 (e.g., "Bob")
4. Mark 3 different words as learned
5. Switch back to Alice - you should see 5 words learned
6. Switch back to Bob - you should see 3 words learned

### Test Scenario 2: Data Persistence
1. Create a user and mark some words as learned
2. Close the browser tab completely
3. Reopen the app
4. Your user should be automatically selected
5. All your learned words should still be marked

### Test Scenario 3: Independent Settings
1. Create User 1 and set theme to dark mode
2. Switch to User 2 and set theme to light mode
3. Switch back to User 1 - theme should still be dark
4. Each user maintains their own preferences

## Technical Details

### Storage Structure
```javascript
// User list
vocabUsers: [
  { id: "user_1234567890", name: "Alice", createdAt: "2025-01-15T10:30:00.000Z" },
  { id: "user_1234567891", name: "Bob", createdAt: "2025-01-15T11:00:00.000Z" }
]

// Current user
vocabCurrentUser: "user_1234567890"

// User-specific data
vocabProgress_user_1234567890: {
  learned: [1, 5, 12, 25],
  quizScores: {...},
  sessions: [...],
  preferences: {...},
  stats: {...}
}

vocabProgress_user_1234567891: {
  learned: [2, 8, 15],
  quizScores: {...},
  sessions: [...],
  preferences: {...},
  stats: {...}
}
```

## Features

✅ Separate progress tracking per user
✅ Independent learned words
✅ Separate quiz scores and statistics
✅ Individual user preferences (theme, speech rate, etc.)
✅ Persistent storage (data survives browser refresh)
✅ Easy user switching via header button
✅ User management (create, select, delete)
✅ Prevents conflicts between users

## Notes

- All data is stored locally in your browser
- Data is not synced across different browsers or devices
- Clearing browser data will delete all users and their progress
- Each browser/device will have its own set of users
