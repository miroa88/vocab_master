#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Tests both frontend and backend certification key system
 *
 * Usage:
 *   node verify-deployment.js [backend-url] [test-key-1] [test-key-2]
 *
 * Example:
 *   node verify-deployment.js http://localhost:3000 TEST-1234-5678-ABCD TEST-9999-8888-XXXX
 */

const baseURL = process.argv[2] || 'http://localhost:3000';
const testKey1 = process.argv[3] || 'TEST-1234-5678-ABCD';
const testKey2 = process.argv[4] || 'TEST-9999-8888-XXXX';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

// Helper functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name) {
  results.total++;
  log(`\n[${results.total}] Testing: ${name}`, colors.cyan);
}

function logPass(message) {
  results.passed++;
  log(`  ✓ ${message}`, colors.green);
}

function logFail(message, error = null) {
  results.failed++;
  log(`  ✗ ${message}`, colors.red);
  if (error) {
    log(`    Error: ${error.message || error}`, colors.red);
    results.errors.push({ test: results.total, message, error: error.message || error });
  }
}

function logWarning(message) {
  log(`  ⚠ ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`  ℹ ${message}`, colors.blue);
}

// HTTP request helper
async function request(method, endpoint, data = null, headers = {}) {
  const url = baseURL + endpoint;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');

    let responseData;
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return {
      status: response.status,
      ok: response.ok,
      data: responseData
    };
  } catch (error) {
    throw new Error(`Network error: ${error.message}`);
  }
}

// Test functions
async function testBackendHealth() {
  logTest('Backend Health Check');

  try {
    const response = await request('GET', '/api/users');

    if (response.status === 200 || response.status === 401) {
      logPass('Backend is responding');
      return true;
    } else {
      logFail(`Unexpected status code: ${response.status}`);
      return false;
    }
  } catch (error) {
    logFail('Backend is not accessible', error);
    return false;
  }
}

async function testValidateAvailableKey() {
  logTest('Validate Available Certification Key');

  try {
    const response = await request('POST', '/api/certification/validate', {
      certificationKey: testKey1
    });

    if (response.status === 200) {
      logPass('Validation endpoint is working');

      if (response.data.valid) {
        logPass('Key validation returned valid=true');
      } else {
        logWarning('Key returned valid=false - may not exist in database');
      }

      if (response.data.hasOwnProperty('available')) {
        logPass('Response includes "available" field');
        logInfo(`Key availability: ${response.data.available}`);
      } else {
        logWarning('Response missing "available" field');
      }

      return true;
    } else if (response.status === 404) {
      logWarning('Key not found (404) - you may need to create test keys in database');
      logInfo(`Run: node scripts/createCertificationKeys.js`);
      return false;
    } else {
      logFail(`Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logFail('Validation endpoint failed', error);
    return false;
  }
}

async function testValidateInvalidKey() {
  logTest('Validate Invalid Certification Key');

  try {
    const response = await request('POST', '/api/certification/validate', {
      certificationKey: 'INVALID-XXXX-XXXX-XXXX'
    });

    if (response.status === 404) {
      logPass('Invalid key correctly returned 404');

      if (response.data.valid === false) {
        logPass('Response correctly shows valid=false');
      }

      return true;
    } else if (response.status === 200) {
      logWarning('Invalid key returned 200 - check database for unexpected keys');
      return false;
    } else {
      logFail(`Unexpected status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logFail('Invalid key validation failed', error);
    return false;
  }
}

async function testEmptyCertificationKey() {
  logTest('Validate Empty Certification Key');

  try {
    const response = await request('POST', '/api/certification/validate', {
      certificationKey: ''
    });

    if (response.status === 400 || response.status === 404) {
      logPass('Empty key correctly rejected');
      return true;
    } else {
      logFail(`Empty key should return 400 or 404, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logFail('Empty key validation failed', error);
    return false;
  }
}

async function testActivateWithoutAuth() {
  logTest('Activate Key Without Authentication');

  try {
    const response = await request('POST', '/api/users/test-user-123/certification', {
      certificationKey: testKey1
    });

    if (response.status === 401 || response.status === 403) {
      logPass('Endpoint correctly requires authentication');
      return true;
    } else {
      logFail(`Endpoint should require auth, got status ${response.status}`);
      return false;
    }
  } catch (error) {
    logFail('Auth check failed', error);
    return false;
  }
}

async function testGetStatusWithoutAuth() {
  logTest('Get Certification Status Without Authentication');

  try {
    const response = await request('GET', '/api/users/test-user-123/certification');

    if (response.status === 401 || response.status === 403) {
      logPass('Endpoint correctly requires authentication');
      return true;
    } else {
      logFail(`Endpoint should require auth, got status ${response.status}`);
      return false;
    }
  } catch (error) {
    logFail('Auth check failed', error);
    return false;
  }
}

async function testRevokeWithoutAuth() {
  logTest('Revoke Key Without Authentication');

  try {
    const response = await request('DELETE', '/api/users/test-user-123/certification');

    if (response.status === 401 || response.status === 403) {
      logPass('Endpoint correctly requires authentication');
      return true;
    } else {
      logFail(`Endpoint should require auth, got status ${response.status}`);
      return false;
    }
  } catch (error) {
    logFail('Auth check failed', error);
    return false;
  }
}

async function testRateLimiting() {
  logTest('Rate Limiting on Validation Endpoint');

  try {
    logInfo('Sending 6 rapid requests...');

    let rateLimited = false;
    for (let i = 1; i <= 6; i++) {
      const response = await request('POST', '/api/certification/validate', {
        certificationKey: `TEST-${i}-${i}-${i}`
      });

      if (response.status === 429) {
        logPass(`Rate limited after ${i} requests`);
        rateLimited = true;
        break;
      }

      // Small delay to avoid immediate failures
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!rateLimited) {
      logWarning('Rate limiting not detected - may not be configured');
      logInfo('Consider adding rate limiting for security');
    }

    return true;
  } catch (error) {
    logFail('Rate limiting test failed', error);
    return false;
  }
}

async function checkFrontendFiles() {
  logTest('Frontend Files Check');

  const fs = require('fs');
  const path = require('path');

  const files = [
    './js/api.js',
    './js/storage.js',
    './js/app.js',
    './js/flashcard.js'
  ];

  let allExist = true;

  for (const file of files) {
    if (fs.existsSync(file)) {
      logPass(`Found: ${file}`);

      // Check for certification key methods
      const content = fs.readFileSync(file, 'utf-8');

      if (file.includes('api.js')) {
        if (content.includes('activateCertificationKey')) {
          logPass('  Contains activateCertificationKey method');
        } else {
          logFail('  Missing activateCertificationKey method');
          allExist = false;
        }
      }

      if (file.includes('storage.js')) {
        if (content.includes('getCertificationStatus')) {
          logPass('  Contains getCertificationStatus method');
        } else {
          logFail('  Missing getCertificationStatus method');
          allExist = false;
        }
      }

      if (file.includes('flashcard.js')) {
        if (content.includes('resetScrollPosition')) {
          logPass('  Contains resetScrollPosition method');
        } else {
          logFail('  Missing resetScrollPosition method');
          allExist = false;
        }
      }
    } else {
      logFail(`Missing: ${file}`);
      allExist = false;
    }
  }

  return allExist;
}

async function checkDocumentation() {
  logTest('Documentation Files Check');

  const fs = require('fs');

  const docs = [
    'CERTIFICATION_API_SPEC.md',
    'CERTIFICATION_IMPLEMENTATION_SUMMARY.md',
    'BACKEND_SAMPLE_IMPLEMENTATION.md',
    'DEPLOYMENT_CHECKLIST.md'
  ];

  let allExist = true;

  for (const doc of docs) {
    if (fs.existsSync(doc)) {
      logPass(`Found: ${doc}`);
    } else {
      logFail(`Missing: ${doc}`);
      allExist = false;
    }
  }

  return allExist;
}

// Main test runner
async function runTests() {
  log('\n' + '='.repeat(60), colors.bright);
  log('CERTIFICATION KEY SYSTEM - DEPLOYMENT VERIFICATION', colors.bright);
  log('='.repeat(60), colors.bright);

  log(`\nBackend URL: ${baseURL}`, colors.cyan);
  log(`Test Key 1: ${testKey1}`, colors.cyan);
  log(`Test Key 2: ${testKey2}`, colors.cyan);

  log('\n' + '-'.repeat(60), colors.bright);
  log('BACKEND TESTS', colors.bright);
  log('-'.repeat(60), colors.bright);

  const backendHealthy = await testBackendHealth();

  if (backendHealthy) {
    await testValidateAvailableKey();
    await testValidateInvalidKey();
    await testEmptyCertificationKey();
    await testActivateWithoutAuth();
    await testGetStatusWithoutAuth();
    await testRevokeWithoutAuth();
    await testRateLimiting();
  } else {
    log('\n⚠ Backend is not accessible. Skipping backend tests.', colors.yellow);
    log('Please ensure the backend server is running.', colors.yellow);
  }

  log('\n' + '-'.repeat(60), colors.bright);
  log('FRONTEND TESTS', colors.bright);
  log('-'.repeat(60), colors.bright);

  await checkFrontendFiles();

  log('\n' + '-'.repeat(60), colors.bright);
  log('DOCUMENTATION TESTS', colors.bright);
  log('-'.repeat(60), colors.bright);

  await checkDocumentation();

  // Print summary
  log('\n' + '='.repeat(60), colors.bright);
  log('TEST SUMMARY', colors.bright);
  log('='.repeat(60), colors.bright);

  log(`\nTotal Tests: ${results.total}`, colors.bright);
  log(`Passed: ${results.passed}`, colors.green);
  log(`Failed: ${results.failed}`, colors.red);

  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`Success Rate: ${successRate}%`, successRate >= 80 ? colors.green : colors.red);

  if (results.errors.length > 0) {
    log('\n' + '-'.repeat(60), colors.red);
    log('ERRORS SUMMARY', colors.red);
    log('-'.repeat(60), colors.red);

    results.errors.forEach((err, index) => {
      log(`\n${index + 1}. Test #${err.test}: ${err.message}`, colors.red);
      log(`   ${err.error}`, colors.red);
    });
  }

  log('\n' + '='.repeat(60), colors.bright);

  if (results.failed === 0) {
    log('✓ ALL TESTS PASSED - READY FOR DEPLOYMENT', colors.green);
    log('='.repeat(60), colors.bright);
    process.exit(0);
  } else {
    log('✗ SOME TESTS FAILED - FIX ISSUES BEFORE DEPLOYMENT', colors.red);
    log('='.repeat(60), colors.bright);
    process.exit(1);
  }
}

// Check if we're in Node.js environment
if (typeof fetch === 'undefined') {
  log('\nError: This script requires Node.js 18+ with built-in fetch support.', colors.red);
  log('Or install node-fetch: npm install node-fetch@2', colors.yellow);
  process.exit(1);
}

// Run tests
runTests().catch(error => {
  log(`\nFatal error: ${error.message}`, colors.red);
  process.exit(1);
});
