# ✅ Pre-Push Checklist - Both Frontend & Backend Ready

Use this checklist before pushing to production. Each section must be 100% complete.

---

## 📱 FRONTEND VERIFICATION

### Code Files ✅
- [x] **api.js** - Certification API methods added (lines 269-286)
- [x] **storage.js** - Certification management methods added (lines 556-640)
- [x] **app.js** - UI logic for certification keys (lines 444-515)
- [x] **flashcard.js** - Scroll reset functionality (lines 389-411, 554-560)

### Manual File Check
```bash
# Run this to verify all methods exist:
cd c:\Users\miroa\OneDrive\Documents\web\vocab_projects\vocab

# Check API methods
grep "activateCertificationKey" js/api.js
grep "validateCertificationKey" js/api.js
grep "getCertificationStatus" js/api.js
grep "revokeCertificationKey" js/api.js

# Check Storage methods
grep "activateCertificationKey" js/storage.js
grep "getCertificationStatus" js/storage.js
grep "revokeCertificationKey" js/storage.js

# Check App UI
grep "loadCertificationStatus" js/app.js

# Check Flashcard fix
grep "resetScrollPosition" js/flashcard.js
```

**Expected:** Each grep should return results. If any return nothing, code is missing.

### Frontend Configuration
- [ ] **API_BASE_URL** is set correctly in config
- [ ] **USE_MONGODB** is set to `true`
- [ ] No hardcoded test URLs in production code
- [ ] No console.log statements in production code

### Browser Test (5 minutes)
- [ ] Open app in browser - no console errors
- [ ] Navigate to Settings page - certification section visible
- [ ] Input field and button are present
- [ ] No JavaScript errors in console

---

## 🔧 BACKEND VERIFICATION

### Backend Setup
- [ ] **Backend directory exists** (e.g., `../vocab-backend/`)
- [ ] **package.json** created with dependencies
- [ ] **Dependencies installed:** express, mongoose, jsonwebtoken, bcrypt, cors, dotenv
- [ ] **.env file** created with:
  - [ ] `MONGODB_URI` set
  - [ ] `JWT_SECRET` set
  - [ ] `PORT` set
  - [ ] `NODE_ENV` set

### Backend Code Files
- [ ] **models/CertificationKey.js** - Model created
- [ ] **models/User.js** - Updated with certification fields
- [ ] **routes/certification.js** - All 4 endpoints implemented
- [ ] **middleware/auth.js** - JWT authentication middleware
- [ ] **server.js** - Main server file with routes

### Quick Backend Verification
```bash
cd ../vocab-backend

# Check if files exist
ls models/CertificationKey.js
ls routes/certification.js
ls middleware/auth.js
ls server.js

# Check dependencies
npm list express
npm list mongoose
npm list jsonwebtoken
```

### MongoDB Setup
- [ ] **MongoDB is running** (local or cloud)
- [ ] **Can connect to MongoDB** from backend
- [ ] **Database created** (e.g., `vocab-master`)

### Verify MongoDB Connection
```bash
# Test connection
mongosh $MONGODB_URI

# Should show connected prompt
# Try a query:
db.users.count()
```

### Database Indexes Created
```bash
# Run in mongosh:
use vocab-master

# Create indexes
db.certificationKeys.createIndex({ key: 1 }, { unique: true })
db.certificationKeys.createIndex({ userId: 1 })
db.certificationKeys.createIndex({ isActive: 1 })
db.users.createIndex({ certificationKey: 1 })

# Verify
db.certificationKeys.getIndexes()
# Should show at least 4 indexes
```

- [ ] **Index on certificationKeys.key** (unique)
- [ ] **Index on certificationKeys.userId**
- [ ] **Index on certificationKeys.isActive**
- [ ] **Index on users.certificationKey**

### Test Certification Keys Created
```bash
# Check if test keys exist
mongosh vocab-master --eval "db.certificationKeys.find().pretty()"
```

- [ ] **At least 5 test keys** exist in database
- [ ] **At least 1 key** has `userId: null` (available)
- [ ] **Keys follow format:** XXXX-XXXX-XXXX-XXXX

### Generate Test Keys (if needed)
```bash
# In mongosh:
use vocab-master

db.certificationKeys.insertMany([
  { key: "TEST-1234-ABCD-5678", isActive: true, userId: null, activatedAt: null, createdAt: new Date(), maxActivations: 1, activationCount: 0 },
  { key: "TEST-9999-XXXX-8888", isActive: true, userId: null, activatedAt: null, createdAt: new Date(), maxActivations: 1, activationCount: 0 },
  { key: "DEMO-AAAA-BBBB-CCCC", isActive: true, userId: null, activatedAt: null, createdAt: new Date(), maxActivations: 1, activationCount: 0 }
])
```

---

## 🧪 BACKEND API TESTING

### Start Backend Server
```bash
cd ../vocab-backend
npm start
# Or: nodemon server.js
```

- [ ] **Server starts without errors**
- [ ] **Port 3000 is listening** (or your configured port)
- [ ] **MongoDB connected** message appears

### Test Each Endpoint

#### Test 1: Health Check
```bash
curl http://localhost:3000/health
```
- [ ] Returns **200 OK**
- [ ] Returns JSON: `{"status":"ok",...}`

#### Test 2: Validate Available Key
```bash
curl -X POST http://localhost:3000/api/certification/validate \
  -H "Content-Type: application/json" \
  -d '{"certificationKey":"TEST-1234-ABCD-5678"}'
```
- [ ] Returns **200 OK**
- [ ] Returns `{"valid":true,"available":true,...}`

#### Test 3: Validate Invalid Key
```bash
curl -X POST http://localhost:3000/api/certification/validate \
  -H "Content-Type: application/json" \
  -d '{"certificationKey":"INVALID-XXXX-YYYY-ZZZZ"}'
```
- [ ] Returns **404 Not Found**
- [ ] Returns `{"valid":false,...}`

#### Test 4: Activate Without Auth
```bash
curl -X POST http://localhost:3000/api/users/test123/certification \
  -H "Content-Type: application/json" \
  -d '{"certificationKey":"TEST-1234-ABCD-5678"}'
```
- [ ] Returns **401 Unauthorized** or **403 Forbidden**

#### Test 5: Get Status Without Auth
```bash
curl -X GET http://localhost:3000/api/users/test123/certification
```
- [ ] Returns **401 Unauthorized** or **403 Forbidden**

#### Test 6: Revoke Without Auth
```bash
curl -X DELETE http://localhost:3000/api/users/test123/certification
```
- [ ] Returns **401 Unauthorized** or **403 Forbidden**

---

## 🔗 INTEGRATION TESTING

### Run Automated Verification Script
```bash
cd ../vocab
node verify-deployment.js http://localhost:3000 TEST-1234-ABCD-5678 TEST-9999-XXXX-8888
```

**Must show:**
- [ ] **Backend Health Check: ✓ PASSED**
- [ ] **All API endpoint tests: ✓ PASSED**
- [ ] **Frontend files check: ✓ PASSED**
- [ ] **Documentation check: ✓ PASSED**
- [ ] **Final Result:** `✓ ALL TESTS PASSED - READY FOR DEPLOYMENT`

### Manual End-to-End Test (Critical!)

#### Scenario 1: Fresh User Activation
1. **Open application** in browser
2. **Create new test user** (or login)
3. **Navigate to Settings**
4. **Enter certification key:** `TEST-1234-ABCD-5678`
5. **Click "Save Certification Key"**

**Verify:**
- [ ] Success message appears
- [ ] Key is now masked: `••••••••••••`
- [ ] Input field is disabled
- [ ] Button text changed to "Revoke Key"
- [ ] **Check MongoDB:** Key is assigned to user

```bash
# Verify in MongoDB:
mongosh vocab-master --eval 'db.certificationKeys.findOne({ key: "TEST-1234-ABCD-5678" })'
# Should show userId is set
```

#### Scenario 2: Duplicate Key Prevention
1. **Log out** from first user
2. **Create/login as different user**
3. **Navigate to Settings**
4. **Enter same key:** `TEST-1234-ABCD-5678`
5. **Click "Save Certification Key"**

**Verify:**
- [ ] **Error message:** "This certification key is already in use by another user"
- [ ] Key is NOT activated
- [ ] Input field still enabled
- [ ] Button still says "Save Certification Key"

#### Scenario 3: Key Revocation
1. **Log back in as first user**
2. **Navigate to Settings**
3. **Click "Revoke Key"**
4. **Confirm revocation dialog**

**Verify:**
- [ ] Success message appears
- [ ] Input field is now enabled
- [ ] Input field is empty
- [ ] Button says "Save Certification Key"
- [ ] **Check MongoDB:** Key userId is null

```bash
# Verify in MongoDB:
mongosh vocab-master --eval 'db.certificationKeys.findOne({ key: "TEST-1234-ABCD-5678" })'
# Should show userId: null
```

#### Scenario 4: Revoked Key Reuse
1. **Stay logged in as first user (or switch to second user)**
2. **Enter the revoked key:** `TEST-1234-ABCD-5678`
3. **Click "Save Certification Key"**

**Verify:**
- [ ] Success message appears (key can be activated again)
- [ ] Key is masked
- [ ] **Check MongoDB:** Key is now assigned to new user

#### Scenario 5: Flashcard Scroll Reset
1. **Navigate to Flashcard view**
2. **Flip card to back side**
3. **Scroll down** to read content
4. **Navigate to next card** (button or swipe)
5. **Flip new card to back**

**Verify:**
- [ ] **Scroll position is at TOP** (not where you left off)
- [ ] Content starts from beginning
- [ ] Test with previous card navigation too

---

## 📊 DATABASE VERIFICATION

### Check Database State
```bash
# Connect to MongoDB
mongosh vocab-master

# Count total certification keys
db.certificationKeys.count()
# Should be > 0

# Count available keys
db.certificationKeys.count({ userId: null })
# Should be > 0 (at least one available key)

# Count active keys
db.certificationKeys.count({ userId: { $ne: null } })
# May be 0 or more depending on tests

# List all keys
db.certificationKeys.find().pretty()

# Check user certifications
db.users.find({ certificationKey: { $ne: null } }).pretty()

# Verify indexes exist
db.certificationKeys.getIndexes()
db.users.getIndexes()
```

**Verify:**
- [ ] At least 3 certification keys exist
- [ ] At least 1 key is available (userId: null)
- [ ] Indexes are created correctly
- [ ] No duplicate keys exist

---

## 🔒 SECURITY VERIFICATION

### Security Checklist
- [ ] **JWT_SECRET** is not hardcoded (only in .env)
- [ ] **.env file** is in .gitignore
- [ ] **CORS** is configured (not wide open with `*`)
- [ ] **Authentication** is required on all user endpoints
- [ ] **Authorization** check (users can only manage own keys)
- [ ] **Input validation** on all endpoints
- [ ] **Rate limiting** configured (optional but recommended)
- [ ] **HTTPS** enabled (production only)

### Test Security
```bash
# Try to access another user's certification
curl -X GET http://localhost:3000/api/users/DIFFERENT_USER_ID/certification \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return 403 Forbidden
```

- [ ] Users cannot access other users' certification endpoints

---

## 📝 DOCUMENTATION VERIFICATION

### All Documentation Files Exist
- [ ] **README_CERTIFICATION.md** - Main overview
- [ ] **CERTIFICATION_API_SPEC.md** - API specification
- [ ] **CERTIFICATION_IMPLEMENTATION_SUMMARY.md** - Implementation details
- [ ] **BACKEND_SAMPLE_IMPLEMENTATION.md** - Backend code samples
- [ ] **DEPLOYMENT_CHECKLIST.md** - Comprehensive deployment guide
- [ ] **QUICK_DEPLOYMENT_GUIDE.md** - Quick setup guide
- [ ] **PRE_PUSH_CHECKLIST.md** - This file
- [ ] **verify-deployment.js** - Verification script

### Quick Check
```bash
ls -la *.md verify-deployment.js
```

**All 7 documentation files + 1 script should be present.**

---

## 🎯 FINAL VERIFICATION

### Critical Success Criteria

**Before pushing, ALL must be true:**

#### Frontend ✅
- [x] All 4 files modified correctly (api.js, storage.js, app.js, flashcard.js)
- [ ] No console errors in browser
- [ ] UI works correctly in settings page
- [ ] Flashcard scroll resets properly

#### Backend ✅
- [ ] All endpoints return expected responses
- [ ] Authentication is enforced
- [ ] MongoDB connection is stable
- [ ] No errors in server logs

#### Database ✅
- [ ] Indexes are created
- [ ] Test keys exist
- [ ] Can insert/update/delete documents

#### Integration ✅
- [ ] Automated tests pass (verify-deployment.js)
- [ ] All 5 manual scenarios pass
- [ ] Frontend can communicate with backend
- [ ] CORS is configured correctly

#### Security ✅
- [ ] No secrets in code
- [ ] Authentication required
- [ ] Authorization enforced
- [ ] Input validation working

#### Documentation ✅
- [ ] All 8 files present
- [ ] API endpoints documented
- [ ] Deployment steps clear

---

## 🚀 READY TO PUSH?

### If ALL items above are checked ✅:

```bash
# 1. Commit frontend changes
cd vocab
git add .
git commit -m "feat: Add certification key system with MongoDB storage

- Add certification API methods (api.js)
- Add certification management (storage.js)
- Implement certification UI with validation (app.js)
- Fix flashcard scroll reset (flashcard.js)
- Add comprehensive documentation"

# 2. Commit backend changes
cd ../vocab-backend
git add .
git commit -m "feat: Add certification key backend API

- Add CertificationKey model
- Implement 4 certification endpoints
- Add JWT authentication
- Add rate limiting
- Add database indexes"

# 3. Push frontend
cd ../vocab
git push origin main

# 4. Push backend
cd ../vocab-backend
git push origin main

# 5. Deploy (follow QUICK_DEPLOYMENT_GUIDE.md)
```

---

## ⚠️ NOT READY TO PUSH?

### If any items are unchecked:

1. **Identify what's missing** from the checklist above
2. **Follow the relevant documentation:**
   - Missing frontend code? Check files are saved
   - Backend not working? See **BACKEND_SAMPLE_IMPLEMENTATION.md**
   - Tests failing? See **DEPLOYMENT_CHECKLIST.md**
3. **Fix the issues**
4. **Re-run this checklist** from the top
5. **Don't push until 100% ready**

---

## 📞 Need Help?

### Common Issues

**Issue:** Automated tests fail
- **Solution:** Check backend is running: `curl http://localhost:3000/health`

**Issue:** Manual tests fail
- **Solution:** Check browser console for errors

**Issue:** MongoDB connection fails
- **Solution:** Check `.env` has correct `MONGODB_URI`

**Issue:** Keys not working
- **Solution:** Check keys exist: `db.certificationKeys.find()`

---

## ✅ FINAL SIGN-OFF

**I confirm that:**
- [ ] All frontend code is implemented and tested
- [ ] All backend code is implemented and tested
- [ ] All database setup is complete
- [ ] All automated tests pass
- [ ] All manual tests pass
- [ ] All security checks pass
- [ ] All documentation is complete
- [ ] I have reviewed the code for errors
- [ ] I have tested on a clean environment
- [ ] I am ready to push to production

**Signed:** _________________
**Date:** _________________

---

## 🎉 SUCCESS!

If you've checked everything above, you're ready to deploy!

**Run one final verification:**
```bash
node verify-deployment.js http://localhost:3000
```

**Expected output:**
```
✓ ALL TESTS PASSED - READY FOR DEPLOYMENT
```

**Then push and deploy!** 🚀

---

**Version:** 1.0.0
**Last Updated:** 2025-12-14
