# Certification Key API Specification

This document describes the backend API endpoints needed to implement the certification key system for the Vocab Master application.

## Overview

The certification key system ensures that:
1. Each certification key can only be used by ONE user
2. Keys are validated before activation
3. Users can revoke their keys
4. The system tracks when keys were activated

## Database Schema

### CertificationKeys Collection

```javascript
{
  _id: ObjectId,
  key: String,           // The actual certification key (should be indexed and unique)
  isActive: Boolean,     // Whether the key is currently active
  userId: String,        // The user who is currently using this key (null if not in use)
  activatedAt: Date,     // When the key was activated
  createdAt: Date,       // When the key was created
  expiresAt: Date,       // Optional expiration date
  maxActivations: Number // Optional: how many times this key can be activated (default: 1)
}
```

### Users Collection Update

Add these fields to your existing users collection:

```javascript
{
  // ... existing user fields ...
  certificationKey: String,    // The certification key currently assigned to this user
  certificationActivatedAt: Date  // When the user activated their key
}
```

## API Endpoints

### 1. Validate Certification Key

**Endpoint:** `POST /api/certification/validate`

**Purpose:** Check if a certification key exists and is available for use

**Request:**
```json
{
  "certificationKey": "XXXX-XXXX-XXXX-XXXX"
}
```

**Response (Success - 200):**
```json
{
  "valid": true,
  "available": true,
  "message": "Certification key is valid and available"
}
```

**Response (Key in use - 200):**
```json
{
  "valid": true,
  "available": false,
  "message": "Certification key is already in use"
}
```

**Response (Invalid - 404):**
```json
{
  "valid": false,
  "available": false,
  "message": "Certification key not found"
}
```

---

### 2. Activate Certification Key

**Endpoint:** `POST /api/users/:userId/certification`

**Purpose:** Activate a certification key for a specific user

**Authentication:** Required (JWT token)

**Request:**
```json
{
  "certificationKey": "XXXX-XXXX-XXXX-XXXX"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Certification key activated successfully",
  "certificationKey": "XXXX-XXXX-XXXX-XXXX",
  "activatedAt": "2025-12-14T10:30:00.000Z"
}
```

**Response (Key already in use - 409):**
```json
{
  "error": "Conflict",
  "message": "This certification key is already in use by another user"
}
```

**Response (Invalid key - 404):**
```json
{
  "error": "Not Found",
  "message": "Certification key not found"
}
```

**Response (User already has a key - 400):**
```json
{
  "error": "Bad Request",
  "message": "User already has an active certification key. Please revoke it first."
}
```

**Implementation Logic:**

1. Check if the certification key exists in the database
2. Check if the key is already assigned to another user
3. Check if the current user already has a certification key (optional - you might want to auto-revoke the old one)
4. Update the CertificationKeys collection:
   - Set `userId` to the current user's ID
   - Set `isActive` to true
   - Set `activatedAt` to current timestamp
5. Update the Users collection:
   - Set `certificationKey` to the provided key
   - Set `certificationActivatedAt` to current timestamp
6. Return success response

---

### 3. Get Certification Status

**Endpoint:** `GET /api/users/:userId/certification`

**Purpose:** Get the current certification key status for a user

**Authentication:** Required (JWT token)

**Response (Has active key - 200):**
```json
{
  "isActivated": true,
  "certificationKey": "XXXX-XXXX-XXXX-XXXX",
  "activatedAt": "2025-12-14T10:30:00.000Z"
}
```

**Response (No active key - 200):**
```json
{
  "isActivated": false,
  "certificationKey": null,
  "activatedAt": null
}
```

---

### 4. Revoke Certification Key

**Endpoint:** `DELETE /api/users/:userId/certification`

**Purpose:** Revoke the current user's certification key (making it available for reuse)

**Authentication:** Required (JWT token)

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Certification key revoked successfully"
}
```

**Response (No key to revoke - 400):**
```json
{
  "error": "Bad Request",
  "message": "User does not have an active certification key"
}
```

**Implementation Logic:**

1. Get the user's current certification key from the Users collection
2. Update the CertificationKeys collection:
   - Set `userId` to null
   - Set `isActive` to false (or keep true if you want it to be reusable)
3. Update the Users collection:
   - Set `certificationKey` to null
   - Set `certificationActivatedAt` to null
4. Return success response

---

## Security Considerations

1. **Key Format:** Use a strong format for certification keys (e.g., UUID v4 or custom format with hyphens)
2. **Rate Limiting:** Implement rate limiting on validation and activation endpoints to prevent brute-force attacks
3. **Authentication:** All user-specific endpoints require JWT authentication
4. **Authorization:** Users can only activate/revoke keys for their own account
5. **Audit Trail:** Consider logging all key activations and revocations for security auditing

## Example Key Generation (Optional)

If you need to generate keys, here's a sample Node.js function:

```javascript
const crypto = require('crypto');

function generateCertificationKey() {
  const segments = 4;
  const segmentLength = 4;
  const key = [];

  for (let i = 0; i < segments; i++) {
    const segment = crypto.randomBytes(segmentLength)
      .toString('hex')
      .toUpperCase()
      .substring(0, segmentLength);
    key.push(segment);
  }

  return key.join('-');
}

// Example output: "A3F2-9D4E-7B1C-5E8A"
```

## Testing

### Test Scenarios

1. **Successful Activation:**
   - Create a new certification key in the database
   - Activate it for a user
   - Verify the user can see the key in their settings

2. **Key Already in Use:**
   - Try to activate the same key with a different user
   - Should receive a 409 Conflict error

3. **Invalid Key:**
   - Try to activate a non-existent key
   - Should receive a 404 Not Found error

4. **Revocation:**
   - Revoke a user's key
   - Verify it can be activated by another user

5. **Multiple Activations (if supported):**
   - If a key supports multiple activations, test the limit

## Migration Notes

For existing users who have certification keys stored locally (in localStorage):

1. When they first log in after this update, prompt them to re-enter their certification key
2. The new system will validate and properly assign the key to their account
3. Old localStorage keys should be cleared once the new system is activated

## Database Indexes

Recommended indexes for performance:

```javascript
// On CertificationKeys collection
db.certificationKeys.createIndex({ key: 1 }, { unique: true });
db.certificationKeys.createIndex({ userId: 1 });
db.certificationKeys.createIndex({ isActive: 1 });

// On Users collection
db.users.createIndex({ certificationKey: 1 });
```
