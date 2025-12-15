# Deployment Checklist - Certification Key System

This checklist ensures both frontend and backend are properly implemented and tested before deployment.

## Frontend Checklist ✅

### Code Implementation
- [x] API Client methods added ([api.js:269-286](js/api.js#L269-L286))
  - [x] `validateCertificationKey()`
  - [x] `activateCertificationKey()`
  - [x] `getCertificationStatus()`
  - [x] `revokeCertificationKey()`

- [x] Storage Service methods added ([storage.js:556-640](js/storage.js#L556-L640))
  - [x] `activateCertificationKey()` with error handling
  - [x] `getCertificationStatus()` with MongoDB/localStorage fallback
  - [x] `revokeCertificationKey()` with proper cleanup

- [x] App UI logic updated ([app.js:444-515](js/app.js#L444-L515))
  - [x] `loadCertificationStatus()` function
  - [x] Dual-mode save/revoke button
  - [x] Key masking for security
  - [x] User-friendly error messages

- [x] Flashcard scroll fix implemented ([flashcard.js:389-411, 554-560](js/flashcard.js))
  - [x] `resetScrollPosition()` method
  - [x] Called in `nextCard()` and `previousCard()`

### Manual Testing Required

Before deployment, manually test these scenarios:

#### Scenario 1: Fresh User Activation
- [ ] Open settings page
- [ ] Verify input field is enabled and empty
- [ ] Button shows "Save Certification Key"
- [ ] Enter a valid certification key
- [ ] Click save button
- [ ] Verify success message appears
- [ ] Verify key is now masked (••••••••••••)
- [ ] Verify input field is disabled
- [ ] Button now shows "Revoke Key"

#### Scenario 2: Key Already in Use
- [ ] Log in as a different user
- [ ] Try to activate the same key from Scenario 1
- [ ] Verify error message: "This certification key is already in use by another user"
- [ ] Key should NOT be activated
- [ ] UI should remain in input mode

#### Scenario 3: Invalid Key
- [ ] Enter a non-existent certification key
- [ ] Click save button
- [ ] Verify error message: "Certification key not found" or "Invalid certification key"
- [ ] Key should NOT be activated

#### Scenario 4: Key Revocation
- [ ] Log in as user from Scenario 1 (who has an active key)
- [ ] Verify key is masked and button shows "Revoke Key"
- [ ] Click "Revoke Key"
- [ ] Confirm the revocation dialog
- [ ] Verify success message
- [ ] Verify input field is now enabled and empty
- [ ] Button shows "Save Certification Key"

#### Scenario 5: Revoked Key Reuse
- [ ] After revoking a key in Scenario 4
- [ ] Log in as a different user
- [ ] Enter the same certification key
- [ ] Click save button
- [ ] Verify key can be activated (no longer "in use" error)
- [ ] Verify success message

#### Scenario 6: Flashcard Scroll Reset
- [ ] Open flashcard view
- [ ] Flip card to back side
- [ ] Scroll down to read content
- [ ] Navigate to next card (using button or swipe)
- [ ] Flip the new card to back side
- [ ] Verify scroll position is at the top
- [ ] Repeat with previous card navigation

#### Scenario 7: localStorage Fallback (Non-MongoDB Mode)
- [ ] Disable MongoDB mode in config
- [ ] Try to activate a certification key
- [ ] Verify error: "Certification keys require MongoDB mode"
- [ ] OR verify localStorage fallback works (depending on implementation preference)

---

## Backend Checklist 🔧

### Database Setup
- [ ] MongoDB instance is running
- [ ] Database connection string configured
- [ ] Environment variables set (`.env` file)
  - [ ] `MONGODB_URI`
  - [ ] `JWT_SECRET`
  - [ ] `PORT`

### Collections Created
- [ ] `certificationKeys` collection exists
- [ ] `users` collection updated with new fields:
  - [ ] `certificationKey` field
  - [ ] `certificationActivatedAt` field

### Indexes Created
Run these MongoDB commands:
```javascript
db.certificationKeys.createIndex({ key: 1 }, { unique: true });
db.certificationKeys.createIndex({ userId: 1 });
db.certificationKeys.createIndex({ isActive: 1 });
db.users.createIndex({ certificationKey: 1 });
```

- [ ] Index on `certificationKeys.key` (unique)
- [ ] Index on `certificationKeys.userId`
- [ ] Index on `certificationKeys.isActive`
- [ ] Index on `users.certificationKey`

### Models Implemented
- [ ] CertificationKey model created with schema:
  - [ ] `key` (String, required, unique)
  - [ ] `isActive` (Boolean)
  - [ ] `userId` (String, nullable)
  - [ ] `activatedAt` (Date, nullable)
  - [ ] `createdAt` (Date)
  - [ ] `expiresAt` (Date, nullable)
  - [ ] `maxActivations` (Number)
  - [ ] `activationCount` (Number)

- [ ] User model updated with fields:
  - [ ] `certificationKey` (String, nullable)
  - [ ] `certificationActivatedAt` (Date, nullable)

### API Endpoints Implemented
- [ ] `POST /api/certification/validate`
  - [ ] Returns 200 with `{ valid, available, message }`
  - [ ] Returns 404 if key not found
  - [ ] Checks if key is expired
  - [ ] No authentication required

- [ ] `POST /api/users/:userId/certification`
  - [ ] Requires JWT authentication
  - [ ] Validates user can only activate for themselves
  - [ ] Returns 409 if key already in use
  - [ ] Returns 404 if key not found
  - [ ] Returns 400 if user already has a key
  - [ ] Updates both CertificationKey and User collections
  - [ ] Returns activation timestamp

- [ ] `GET /api/users/:userId/certification`
  - [ ] Requires JWT authentication
  - [ ] Validates user can only check own status
  - [ ] Returns `{ isActivated, certificationKey, activatedAt }`

- [ ] `DELETE /api/users/:userId/certification`
  - [ ] Requires JWT authentication
  - [ ] Validates user can only revoke own key
  - [ ] Returns 400 if user has no key
  - [ ] Clears `userId` from CertificationKey
  - [ ] Clears key from User document

### Security Features
- [ ] JWT authentication middleware implemented
- [ ] User authorization checks (users can only manage own keys)
- [ ] Rate limiting on validation endpoint (max 5 per 15 minutes)
- [ ] Rate limiting on activation endpoint (max 5 per 15 minutes)
- [ ] Input validation and sanitization
- [ ] CORS configured properly
- [ ] HTTPS enabled (production only)

### Utilities Created
- [ ] Key generation function implemented
- [ ] Bulk key creation script ready
- [ ] Admin tools for key management (optional)

### Sample Certification Keys Created
- [ ] At least 5-10 test keys generated in database
- [ ] Document the test keys for QA testing
- [ ] At least one key assigned to a test user
- [ ] At least one key left unassigned

---

## Integration Testing 🧪

### API Testing with cURL

Test each endpoint before frontend integration:

#### 1. Validate Key (Available)
```bash
curl -X POST http://localhost:3000/api/certification/validate \
  -H "Content-Type: application/json" \
  -d '{"certificationKey":"TEST-KEY1-HERE-XXXX"}'
```
Expected: `{ "valid": true, "available": true }`

#### 2. Validate Key (In Use)
```bash
curl -X POST http://localhost:3000/api/certification/validate \
  -H "Content-Type: application/json" \
  -d '{"certificationKey":"ALREADY-USED-KEY-XXXX"}'
```
Expected: `{ "valid": true, "available": false }`

#### 3. Validate Key (Invalid)
```bash
curl -X POST http://localhost:3000/api/certification/validate \
  -H "Content-Type: application/json" \
  -d '{"certificationKey":"INVALID-XXXX-XXXX-XXXX"}'
```
Expected: 404 with `{ "valid": false }`

#### 4. Activate Key
```bash
curl -X POST http://localhost:3000/api/users/USER_ID_HERE/certification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"certificationKey":"TEST-KEY1-HERE-XXXX"}'
```
Expected: 200 with activation details

#### 5. Activate Already Used Key
```bash
curl -X POST http://localhost:3000/api/users/DIFFERENT_USER_ID/certification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer DIFFERENT_JWT_TOKEN" \
  -d '{"certificationKey":"TEST-KEY1-HERE-XXXX"}'
```
Expected: 409 Conflict

#### 6. Get Status (Has Key)
```bash
curl -X GET http://localhost:3000/api/users/USER_ID_HERE/certification \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
Expected: `{ "isActivated": true, "certificationKey": "...", "activatedAt": "..." }`

#### 7. Get Status (No Key)
```bash
curl -X GET http://localhost:3000/api/users/NEW_USER_ID/certification \
  -H "Authorization: Bearer NEW_USER_JWT_TOKEN"
```
Expected: `{ "isActivated": false, "certificationKey": null, "activatedAt": null }`

#### 8. Revoke Key
```bash
curl -X DELETE http://localhost:3000/api/users/USER_ID_HERE/certification \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
Expected: 200 with success message

---

## End-to-End Testing 🌐

Test complete user journey with both frontend and backend:

### Test Journey 1: Happy Path
- [ ] Start backend server
- [ ] Open frontend application
- [ ] Create new user account
- [ ] Navigate to settings
- [ ] Enter valid certification key
- [ ] Click "Save Certification Key"
- [ ] Verify success message in UI
- [ ] Refresh page
- [ ] Verify key is still shown as masked
- [ ] Check MongoDB to verify key assignment

### Test Journey 2: Conflict Path
- [ ] Create second user account
- [ ] Navigate to settings
- [ ] Enter the same key from Journey 1
- [ ] Click "Save Certification Key"
- [ ] Verify error message in UI
- [ ] Check MongoDB - key should still be assigned to first user

### Test Journey 3: Revoke and Reuse
- [ ] Log in as first user
- [ ] Navigate to settings
- [ ] Click "Revoke Key"
- [ ] Confirm revocation
- [ ] Log in as second user
- [ ] Navigate to settings
- [ ] Enter the same key
- [ ] Click "Save Certification Key"
- [ ] Verify success - key now belongs to second user
- [ ] Check MongoDB to verify reassignment

---

## Performance Testing ⚡

- [ ] Test API response times (should be < 200ms)
- [ ] Test rate limiting (try 6+ requests in 15 minutes)
- [ ] Test with 100+ concurrent users (load testing)
- [ ] Monitor MongoDB query performance
- [ ] Check server logs for errors

---

## Pre-Deployment Verification 📋

### Final Checks
- [ ] All frontend code committed to git
- [ ] All backend code committed to git
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Database schema documented
- [ ] MongoDB indexes created
- [ ] Test certification keys generated
- [ ] Rate limiting configured
- [ ] CORS configured for production domains
- [ ] HTTPS certificates installed (production)
- [ ] Error logging configured
- [ ] Monitoring/alerts configured

### Documentation Complete
- [ ] API specification document reviewed
- [ ] Implementation summary reviewed
- [ ] Backend sample code reviewed
- [ ] README updated with certification key setup
- [ ] User guide updated (how to use certification keys)

### Code Review
- [ ] Frontend code reviewed
- [ ] Backend code reviewed
- [ ] Security review completed
- [ ] No hardcoded secrets or keys in code
- [ ] No console.logs in production code

---

## Deployment Steps 🚀

### 1. Deploy Backend First
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with production values

# Run database migrations (if any)
npm run migrate

# Create certification keys
node scripts/createCertificationKeys.js 20

# Start server
npm start
# Or use PM2: pm2 start server.js --name vocab-backend
```

### 2. Verify Backend
- [ ] Health check endpoint returns 200
- [ ] Test one API endpoint with cURL
- [ ] Check server logs for errors
- [ ] Verify MongoDB connection

### 3. Deploy Frontend
```bash
# Pull latest code
git pull origin main

# Install dependencies (if needed)
npm install

# Build production bundle (if applicable)
npm run build

# Deploy to web server
# (Copy files to hosting server or use deployment script)
```

### 4. Verify Frontend
- [ ] Open application in browser
- [ ] Check browser console for errors
- [ ] Test certification key activation
- [ ] Test flashcard scroll reset

### 5. Smoke Tests (Production)
- [ ] Create test user account
- [ ] Activate certification key
- [ ] Verify key appears in MongoDB
- [ ] Revoke key
- [ ] Verify key removed from MongoDB
- [ ] Test with second user

---

## Rollback Plan 🔄

If issues are found after deployment:

### Frontend Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Redeploy previous version
npm run deploy
```

### Backend Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Restart server with old code
pm2 restart vocab-backend
```

### Database Rollback
```javascript
// Remove certification key fields from users
db.users.updateMany({}, {
  $unset: {
    certificationKey: "",
    certificationActivatedAt: ""
  }
});

// Delete certification keys collection (if needed)
db.certificationKeys.drop();
```

---

## Post-Deployment Monitoring 📊

### First 24 Hours
- [ ] Monitor error logs every 2 hours
- [ ] Check API response times
- [ ] Monitor database performance
- [ ] Watch for failed certification key activations
- [ ] Collect user feedback

### First Week
- [ ] Review error logs daily
- [ ] Check certification key usage stats
- [ ] Monitor server resources (CPU, memory, disk)
- [ ] Analyze user behavior
- [ ] Address any reported issues

---

## Success Criteria ✅

Deployment is successful when:

- [ ] All frontend tests pass
- [ ] All backend tests pass
- [ ] All integration tests pass
- [ ] No critical errors in logs
- [ ] At least 10 successful key activations
- [ ] Zero duplicate key assignments
- [ ] API response times < 200ms
- [ ] No user-reported critical issues
- [ ] Monitoring/alerts working correctly

---

## Contact & Support

**Frontend Issues:** Check browser console, verify API calls
**Backend Issues:** Check server logs at `/var/log/vocab-backend.log`
**Database Issues:** Check MongoDB logs, verify connections
**Emergency:** Rollback using above procedures

---

**Last Updated:** 2025-12-14
**Version:** 1.0.0
