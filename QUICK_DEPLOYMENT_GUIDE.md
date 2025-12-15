# Quick Deployment Guide

This is a streamlined guide to deploy both frontend and backend certification key system.

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ MongoDB instance running
- ✅ Git repository set up
- ✅ Both frontend and backend code ready

## Step 1: Verify Frontend (2 minutes)

### Check Files Exist
```bash
# Navigate to project directory
cd c:\Users\miroa\OneDrive\Documents\web\vocab_projects\vocab

# Verify frontend files were updated
ls js/api.js          # Should exist
ls js/storage.js      # Should exist
ls js/app.js          # Should exist
ls js/flashcard.js    # Should exist
```

### Quick Code Check
```bash
# Check if certification methods were added
grep -n "activateCertificationKey" js/api.js
grep -n "getCertificationStatus" js/storage.js
grep -n "resetScrollPosition" js/flashcard.js
```

All three should return line numbers. If not, code is missing.

---

## Step 2: Set Up Backend (10 minutes)

### Create Backend Project Structure
```bash
# Navigate to backend directory (or create one)
mkdir -p ../vocab-backend
cd ../vocab-backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express mongoose jsonwebtoken bcrypt cors dotenv
```

### Create Required Files

1. **Create `.env` file:**
```bash
cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/vocab-master
JWT_SECRET=your-super-secret-change-this-in-production
PORT=3000
NODE_ENV=development
EOF
```

2. **Copy backend code from documentation:**
   - Copy models from `BACKEND_SAMPLE_IMPLEMENTATION.md`
   - Copy routes from `BACKEND_SAMPLE_IMPLEMENTATION.md`
   - Copy middleware from `BACKEND_SAMPLE_IMPLEMENTATION.md`

3. **Or use the quick setup script below:**

```bash
# Create directory structure
mkdir -p models routes middleware scripts utils

# This is a minimal server.js - expand with code from BACKEND_SAMPLE_IMPLEMENTATION.md
cat > server.js << 'EOF'
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ Connected to MongoDB'))
  .catch(err => console.error('✗ MongoDB connection error:', err));

// Import routes (you'll need to create these)
const certificationRoutes = require('./routes/certification');
app.use(certificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
EOF
```

---

## Step 3: Create Database Indexes (2 minutes)

Connect to MongoDB and run:

```javascript
// Connect to your MongoDB
mongosh

// Switch to your database
use vocab-master

// Create indexes
db.certificationKeys.createIndex({ key: 1 }, { unique: true })
db.certificationKeys.createIndex({ userId: 1 })
db.certificationKeys.createIndex({ isActive: 1 })
db.users.createIndex({ certificationKey: 1 })

// Verify indexes
db.certificationKeys.getIndexes()
db.users.getIndexes()
```

---

## Step 4: Generate Test Keys (2 minutes)

### Option A: Manually Insert Test Keys
```javascript
// In mongosh
use vocab-master

db.certificationKeys.insertMany([
  {
    key: "TEST-1234-ABCD-5678",
    isActive: true,
    userId: null,
    activatedAt: null,
    createdAt: new Date(),
    maxActivations: 1,
    activationCount: 0
  },
  {
    key: "TEST-9999-XXXX-8888",
    isActive: true,
    userId: null,
    activatedAt: null,
    createdAt: new Date(),
    maxActivations: 1,
    activationCount: 0
  }
])

// Verify
db.certificationKeys.find()
```

### Option B: Use Generation Script
```bash
# Create the script from BACKEND_SAMPLE_IMPLEMENTATION.md
node scripts/createCertificationKeys.js 10
```

---

## Step 5: Test Backend (5 minutes)

### Start Backend Server
```bash
cd ../vocab-backend
npm start
# Or use nodemon for development
npx nodemon server.js
```

### Test Endpoints with cURL

**Test 1: Health Check**
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok",...}`

**Test 2: Validate Key**
```bash
curl -X POST http://localhost:3000/api/certification/validate \
  -H "Content-Type: application/json" \
  -d '{"certificationKey":"TEST-1234-ABCD-5678"}'
```
Expected: `{"valid":true,"available":true,...}`

**Test 3: Invalid Key**
```bash
curl -X POST http://localhost:3000/api/certification/validate \
  -H "Content-Type: application/json" \
  -d '{"certificationKey":"INVALID-KEY-XXXX"}'
```
Expected: 404 status

---

## Step 6: Run Verification Script (3 minutes)

```bash
# Navigate to frontend directory
cd ../vocab

# Run verification script
node verify-deployment.js http://localhost:3000 TEST-1234-ABCD-5678 TEST-9999-XXXX-8888
```

This will test:
- ✓ Backend health
- ✓ Validation endpoint
- ✓ Authentication requirements
- ✓ Frontend files
- ✓ Documentation

Look for: `✓ ALL TESTS PASSED - READY FOR DEPLOYMENT`

---

## Step 7: Manual Frontend Test (5 minutes)

### Update Frontend Config
Make sure your frontend is pointing to the correct backend URL:

```javascript
// In config.js or wherever API_BASE_URL is defined
const AppConfig = {
  API_BASE_URL: 'http://localhost:3000',
  USE_MONGODB: true
};
```

### Open Application
1. Open `index.html` in a browser (or start your dev server)
2. Create a test user account (or log in)
3. Navigate to Settings
4. Find "App Certification Key" section

### Test Activation
1. Enter: `TEST-1234-ABCD-5678`
2. Click "Save Certification Key"
3. ✓ Should see success message
4. ✓ Key should now be masked: `••••••••••••`
5. ✓ Button should change to "Revoke Key"

### Test Duplicate Prevention
1. Log out
2. Create/login as different user
3. Navigate to Settings
4. Enter same key: `TEST-1234-ABCD-5678`
5. Click "Save Certification Key"
6. ✓ Should see error: "This certification key is already in use by another user"

### Test Revocation
1. Log back in as first user
2. Navigate to Settings
3. Click "Revoke Key"
4. Confirm the dialog
5. ✓ Should see success message
6. ✓ Input field should be enabled and empty
7. ✓ Button should say "Save Certification Key"

### Test Flashcard Scroll
1. Go to Flashcard view
2. Flip card to back
3. Scroll down
4. Navigate to next card (button or swipe)
5. Flip new card to back
6. ✓ Scroll should be at top, not where you left it

---

## Step 8: Production Deployment

### Backend Production

1. **Set Environment Variables:**
```bash
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/vocab-master"
export JWT_SECRET="generate-a-secure-random-string-here"
export NODE_ENV="production"
export PORT="3000"
```

2. **Use PM2 for Process Management:**
```bash
npm install -g pm2
pm2 start server.js --name vocab-backend
pm2 save
pm2 startup
```

3. **Set Up HTTPS** (use nginx or similar):
```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Frontend Production

1. **Update API URL:**
```javascript
const AppConfig = {
  API_BASE_URL: 'https://api.yourdomain.com',  // Production backend
  USE_MONGODB: true
};
```

2. **Deploy Files:**
```bash
# Build if needed
npm run build

# Deploy to web server
scp -r dist/* user@server:/var/www/vocab-app/
# Or use your deployment method (FTP, Git, etc.)
```

3. **Verify Production:**
```bash
# Test production backend
curl https://api.yourdomain.com/health

# Test production validation
curl -X POST https://api.yourdomain.com/api/certification/validate \
  -H "Content-Type: application/json" \
  -d '{"certificationKey":"TEST-1234-ABCD-5678"}'
```

---

## Step 9: Post-Deployment Checklist

- [ ] Backend server is running
- [ ] MongoDB is connected
- [ ] At least 10 test certification keys created
- [ ] Frontend can reach backend API
- [ ] Test user can activate a key
- [ ] Duplicate key activation is blocked
- [ ] Key revocation works
- [ ] Flashcard scroll resets properly
- [ ] HTTPS is enabled (production only)
- [ ] Error logging is configured
- [ ] Backups are configured

---

## Troubleshooting

### Backend Not Starting
```bash
# Check MongoDB connection
mongosh $MONGODB_URI

# Check port availability
netstat -an | grep 3000

# Check logs
tail -f /var/log/vocab-backend.log
```

### Frontend Can't Reach Backend
```bash
# Check CORS configuration
# In backend, ensure CORS allows your frontend domain

# Check browser console for errors
# Open DevTools > Console

# Test API directly
curl http://localhost:3000/health
```

### Certification Key Not Activating
```bash
# Check MongoDB for the key
mongosh
use vocab-master
db.certificationKeys.find({ key: "YOUR-KEY-HERE" })

# Check backend logs
pm2 logs vocab-backend

# Check network tab in browser DevTools
# Look for failed API calls
```

### Database Connection Issues
```bash
# Test MongoDB connection
mongosh $MONGODB_URI

# Check MongoDB is running
sudo systemctl status mongod

# Check firewall rules
sudo ufw status
```

---

## Rollback Procedure

If something goes wrong:

```bash
# 1. Stop backend
pm2 stop vocab-backend

# 2. Revert frontend files
cd vocab
git revert HEAD
git push

# 3. Revert backend files
cd ../vocab-backend
git revert HEAD
git push

# 4. Restart with old version
pm2 restart vocab-backend
```

---

## Support Commands

```bash
# View backend logs
pm2 logs vocab-backend

# Restart backend
pm2 restart vocab-backend

# Check MongoDB keys
mongosh vocab-master --eval "db.certificationKeys.find().pretty()"

# Check user certifications
mongosh vocab-master --eval "db.users.find({ certificationKey: { \$ne: null } }).pretty()"

# Generate more keys
node scripts/createCertificationKeys.js 20
```

---

## Success Indicators

You're ready for production when:

✅ Verification script shows: "ALL TESTS PASSED"
✅ Manual frontend tests all pass
✅ Backend responds to all API endpoints
✅ MongoDB indexes are created
✅ At least 10 certification keys exist
✅ HTTPS is configured (production)
✅ Error logging is working
✅ No errors in browser console
✅ No errors in backend logs

---

## Quick Commands Summary

```bash
# Start backend (development)
cd vocab-backend && npm start

# Start backend (production)
cd vocab-backend && pm2 start server.js --name vocab-backend

# Run verification
cd vocab && node verify-deployment.js http://localhost:3000

# Create certification keys
cd vocab-backend && node scripts/createCertificationKeys.js 10

# Check MongoDB
mongosh vocab-master --eval "db.certificationKeys.find().count()"

# View logs
pm2 logs vocab-backend --lines 100
```

---

**Estimated Total Time:** 30-40 minutes for first-time setup
**Estimated Time for Updates:** 5-10 minutes

Good luck with your deployment! 🚀
