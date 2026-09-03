import express from 'express';
import { apiLimiter, authLimiter, isProductionEnvironment } from '../server/middleware/rate-limiter';
import http from 'http';

async function makeRequest(port: number, path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode || 0, body: data });
      });
    });
    req.on('error', reject);
  });
}

async function runTest() {
  console.log('--- Testing Rate Limiting Behavior ---');

  // Test 1: Development / Non-production mode
  console.log('\n[Test 1] Testing NON-PRODUCTION mode (NODE_ENV=development)...');
  process.env.NODE_ENV = 'development';
  process.env.RATE_LIMIT_MAX = '3';
  process.env.RATE_LIMIT_WINDOW_MS = '60000';

  const appDev = express();
  appDev.use('/api/', apiLimiter);
  appDev.get('/api/test', (req, res) => res.json({ success: true }));

  const serverDev = appDev.listen(5098);
  await new Promise((r) => setTimeout(r, 100));

  let devPassed = true;
  for (let i = 1; i <= 6; i++) {
    const res = await makeRequest(5098, '/api/test');
    if (res.status !== 200) {
      console.error(`❌ Request ${i} failed with status ${res.status}`);
      devPassed = false;
    }
  }
  serverDev.close();

  if (devPassed) {
    console.log('✅ Dev mode passed: All 6 requests succeeded without rate limit enforcement (skipped in dev).');
  } else {
    throw new Error('Dev mode test failed: requests were blocked.');
  }

  // Test 2: Production mode
  console.log('\n[Test 2] Testing PRODUCTION mode (NODE_ENV=production)...');
  process.env.NODE_ENV = 'production';
  process.env.RATE_LIMIT_MAX = '3';
  process.env.RATE_LIMIT_WINDOW_MS = '60000';

  const appProd = express();
  appProd.use('/api/', apiLimiter);
  appProd.get('/api/test', (req, res) => res.json({ success: true }));
  appProd.get('/api/health', (req, res) => res.json({ status: 'online' }));

  const serverProd = appProd.listen(5099);
  await new Promise((r) => setTimeout(r, 100));

  let prodPassed = true;
  for (let i = 1; i <= 3; i++) {
    const res = await makeRequest(5099, '/api/test');
    if (res.status !== 200) {
      console.error(`❌ Request ${i} expected 200 but got ${res.status}`);
      prodPassed = false;
    }
  }

  // 4th request should be rate limited (429)
  const resRateLimited = await makeRequest(5099, '/api/test');
  if (resRateLimited.status === 429) {
    console.log('✅ Production mode passed: 4th request was rate limited with status 429 (limit: 3 exceeded).');
  } else {
    console.error(`❌ Production mode expected 429 for 4th request but got ${resRateLimited.status}`);
    prodPassed = false;
  }

  // Test 3: Sensitive / Auth rate limiter
  console.log('\n[Test 3] Testing Auth Rate Limiter in Production (NODE_ENV=production)...');
  process.env.NODE_ENV = 'production';
  process.env.AUTH_RATE_LIMIT_MAX = '2';

  const appAuth = express();
  appAuth.all('/api/auth/sign-in', authLimiter, (req, res) => res.json({ session: 'ok' }));

  const serverAuth = appAuth.listen(5097);
  await new Promise((r) => setTimeout(r, 100));

  let authPassed = true;
  for (let i = 1; i <= 2; i++) {
    const res = await makeRequest(5097, '/api/auth/sign-in');
    if (res.status !== 200) {
      console.error(`❌ Auth request ${i} expected 200 but got ${res.status}`);
      authPassed = false;
    }
  }

  // 3rd auth request should be rate limited
  const resAuthBlocked = await makeRequest(5097, '/api/auth/sign-in');
  if (resAuthBlocked.status === 429) {
    console.log('✅ Auth limiter passed: 3rd request was rate limited with status 429 (AUTH_RATE_LIMIT_MAX: 2).');
  } else {
    console.error(`❌ Auth limiter expected 429 but got ${resAuthBlocked.status}`);
    authPassed = false;
  }
  serverAuth.close();

  if (!authPassed) {
    throw new Error('Auth rate limiter verification failed.');
  }

  console.log('\n🎉 ALL RATE LIMITING TESTS PASSED SUCCESSFULLY!\n');
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
