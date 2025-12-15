# Backend Sample Implementation (Node.js + Express + MongoDB)

This document provides sample backend code to implement the certification key API endpoints.

## Prerequisites

```bash
npm install express mongoose jsonwebtoken bcrypt
```

## Database Models

### CertificationKey Model

```javascript
// models/CertificationKey.js
const mongoose = require('mongoose');

const certificationKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  userId: {
    type: String,
    default: null,
    index: true
  },
  activatedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null
  },
  maxActivations: {
    type: Number,
    default: 1
  },
  activationCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CertificationKey', certificationKeySchema);
```

### User Model Update

Add these fields to your existing User model:

```javascript
// models/User.js (add to existing schema)
const userSchema = new mongoose.Schema({
  // ... existing fields ...

  certificationKey: {
    type: String,
    default: null
  },
  certificationActivatedAt: {
    type: Date,
    default: null
  }
});
```

## Middleware

### Authentication Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};

module.exports = authMiddleware;
```

## API Routes

### Certification Routes

```javascript
// routes/certification.js
const express = require('express');
const router = express.Router();
const CertificationKey = require('../models/CertificationKey');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// 1. Validate Certification Key
router.post('/api/certification/validate', async (req, res) => {
  try {
    const { certificationKey } = req.body;

    if (!certificationKey) {
      return res.status(400).json({
        valid: false,
        available: false,
        message: 'Certification key is required'
      });
    }

    const key = await CertificationKey.findOne({
      key: certificationKey.toUpperCase().trim()
    });

    if (!key) {
      return res.status(404).json({
        valid: false,
        available: false,
        message: 'Certification key not found'
      });
    }

    // Check if key is already in use
    const available = !key.userId;

    // Check if key is expired
    if (key.expiresAt && new Date() > key.expiresAt) {
      return res.status(400).json({
        valid: false,
        available: false,
        message: 'Certification key has expired'
      });
    }

    res.json({
      valid: true,
      available,
      message: available
        ? 'Certification key is valid and available'
        : 'Certification key is already in use'
    });
  } catch (error) {
    console.error('Validate certification key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Activate Certification Key
router.post('/api/users/:userId/certification', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { certificationKey } = req.body;

    // Ensure user can only activate for themselves
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!certificationKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Certification key is required'
      });
    }

    // Find the user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Check if user already has a certification key
    if (user.certificationKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User already has an active certification key. Please revoke it first.'
      });
    }

    // Find the certification key
    const key = await CertificationKey.findOne({
      key: certificationKey.toUpperCase().trim()
    });

    if (!key) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Certification key not found'
      });
    }

    // Check if key is expired
    if (key.expiresAt && new Date() > key.expiresAt) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Certification key has expired'
      });
    }

    // Check if key is already in use
    if (key.userId) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'This certification key is already in use by another user'
      });
    }

    // Check max activations
    if (key.activationCount >= key.maxActivations) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Certification key has reached maximum activations'
      });
    }

    // Activate the key
    const now = new Date();
    key.userId = userId;
    key.activatedAt = now;
    key.activationCount += 1;
    await key.save();

    // Update user
    user.certificationKey = key.key;
    user.certificationActivatedAt = now;
    await user.save();

    res.json({
      success: true,
      message: 'Certification key activated successfully',
      certificationKey: key.key,
      activatedAt: now.toISOString()
    });
  } catch (error) {
    console.error('Activate certification key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Get Certification Status
router.get('/api/users/:userId/certification', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Ensure user can only check their own status
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json({
      isActivated: !!user.certificationKey,
      certificationKey: user.certificationKey || null,
      activatedAt: user.certificationActivatedAt ? user.certificationActivatedAt.toISOString() : null
    });
  } catch (error) {
    console.error('Get certification status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Revoke Certification Key
router.delete('/api/users/:userId/certification', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Ensure user can only revoke their own key
    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    if (!user.certificationKey) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User does not have an active certification key'
      });
    }

    // Find and update the certification key
    const key = await CertificationKey.findOne({ key: user.certificationKey });
    if (key) {
      key.userId = null;
      key.activatedAt = null;
      // Note: We don't decrement activationCount to track total uses
      await key.save();
    }

    // Update user
    user.certificationKey = null;
    user.certificationActivatedAt = null;
    await user.save();

    res.json({
      success: true,
      message: 'Certification key revoked successfully'
    });
  } catch (error) {
    console.error('Revoke certification key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

## Utility Functions

### Generate Certification Keys

```javascript
// utils/generateCertificationKey.js
const crypto = require('crypto');

/**
 * Generate a random certification key
 * Format: XXXX-XXXX-XXXX-XXXX
 */
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

module.exports = generateCertificationKey;
```

### Bulk Create Keys Script

```javascript
// scripts/createCertificationKeys.js
const mongoose = require('mongoose');
const CertificationKey = require('../models/CertificationKey');
const generateCertificationKey = require('../utils/generateCertificationKey');

async function createBulkKeys(count = 10, expiresInDays = null) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const keys = [];
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    for (let i = 0; i < count; i++) {
      const key = generateCertificationKey();
      keys.push({
        key,
        isActive: true,
        userId: null,
        expiresAt,
        maxActivations: 1
      });
    }

    const result = await CertificationKey.insertMany(keys);

    console.log(`Created ${result.length} certification keys:`);
    result.forEach(k => console.log(k.key));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error creating keys:', error);
    await mongoose.disconnect();
  }
}

// Usage: node scripts/createCertificationKeys.js
const count = process.argv[2] || 10;
const expiresInDays = process.argv[3] || null;
createBulkKeys(parseInt(count), expiresInDays ? parseInt(expiresInDays) : null);
```

## Main App Integration

```javascript
// app.js or server.js
const express = require('express');
const certificationRoutes = require('./routes/certification');

const app = express();

app.use(express.json());

// Add certification routes
app.use(certificationRoutes);

// ... other routes ...

module.exports = app;
```

## Environment Variables

```env
# .env
MONGODB_URI=mongodb://localhost:27017/vocab-master
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=3000
```

## Testing with cURL

### Validate a key
```bash
curl -X POST http://localhost:3000/api/certification/validate \
  -H "Content-Type: application/json" \
  -d '{"certificationKey":"XXXX-XXXX-XXXX-XXXX"}'
```

### Activate a key
```bash
curl -X POST http://localhost:3000/api/users/user123/certification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"certificationKey":"XXXX-XXXX-XXXX-XXXX"}'
```

### Get certification status
```bash
curl -X GET http://localhost:3000/api/users/user123/certification \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Revoke a key
```bash
curl -X DELETE http://localhost:3000/api/users/user123/certification \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Admin Endpoints (Optional)

You might want to add these admin-only endpoints:

```javascript
// List all keys
router.get('/api/admin/certification-keys', adminAuthMiddleware, async (req, res) => {
  const keys = await CertificationKey.find({});
  res.json(keys);
});

// Create a new key
router.post('/api/admin/certification-keys', adminAuthMiddleware, async (req, res) => {
  const key = generateCertificationKey();
  const newKey = await CertificationKey.create({ key });
  res.json(newKey);
});

// Delete a key
router.delete('/api/admin/certification-keys/:key', adminAuthMiddleware, async (req, res) => {
  await CertificationKey.deleteOne({ key: req.params.key });
  res.json({ success: true });
});
```

## Rate Limiting

Add rate limiting to prevent abuse:

```javascript
const rateLimit = require('express-rate-limit');

const certificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many certification attempts, please try again later'
});

router.post('/api/certification/validate', certificationLimiter, async (req, res) => {
  // ... handler code
});

router.post('/api/users/:userId/certification', certificationLimiter, async (req, res) => {
  // ... handler code
});
```

## Security Best Practices

1. **Always validate JWT tokens** before allowing any operations
2. **Use HTTPS** in production
3. **Rate limit** validation and activation endpoints
4. **Log all key activations** for audit trail
5. **Encrypt keys at rest** (optional, depends on sensitivity)
6. **Set appropriate CORS headers**
7. **Validate user permissions** (users can only manage their own keys)

## Deployment Checklist

- [ ] MongoDB connection string configured
- [ ] JWT secret set in environment variables
- [ ] Rate limiting enabled
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Error logging set up
- [ ] Backup strategy for certification keys database
- [ ] Admin tools for key management ready
