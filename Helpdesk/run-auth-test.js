const axios = require('axios');

const baseUrl = 'http://localhost:5000';

async function runAuthTest() {
  console.log('==========================================');
  console.log('🧪 AUTHENTICATION & API FLOW TEST (AXIOS)');
  console.log('==========================================\n');

  // Step 1: Healthcheck
  console.log('1️⃣ Checking /api/health...');
  const healthRes = await axios.get(`${baseUrl}/api/health`);
  console.log('   Status:', healthRes.status);
  console.log('   Database Connection:', healthRes.data?.services?.database);
  console.log('   API Message:', healthRes.data?.message, '\n');

  // Step 2: Sign-In with Admin Credentials
  const adminCredentials = {
    email: 'admin@example.com',
    password: 'password123'
  };
  console.log('2️⃣ Signing in with Admin credentials:', adminCredentials.email);
  const signInRes = await axios.post(`${baseUrl}/api/auth/sign-in/email`, adminCredentials, {
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5173'
    }
  });

  const rawSignInCookie = signInRes.headers['set-cookie'];
  const sessionCookie = Array.isArray(rawSignInCookie) ? rawSignInCookie.join('; ') : rawSignInCookie;
  console.log('   Sign-In Status:', signInRes.status);
  console.log('   User Name:', signInRes.data?.user?.name);
  console.log('   User Email:', signInRes.data?.user?.email);
  console.log('   Session Cookie Present:', !!sessionCookie, '\n');

  if (signInRes.status !== 200) {
    throw new Error(`Sign in failed with status ${signInRes.status}: ${JSON.stringify(signInRes.data)}`);
  }

  // Step 3: Get Session (/api/auth/get-session)
  console.log('3️⃣ Checking session via /api/auth/get-session...');
  const sessionRes = await axios.get(`${baseUrl}/api/auth/get-session`, {
    headers: {
      'Cookie': sessionCookie || '',
      'Origin': 'http://localhost:5173'
    }
  });
  console.log('   Get Session Status:', sessionRes.status);
  console.log('   Authenticated User:', sessionRes.data?.user?.email);
  console.log('   Session Expire Date:', sessionRes.data?.session?.expiresAt, '\n');

  // Step 4: Access Protected Profile Route (/api/me)
  console.log('4️⃣ Testing protected profile /api/me with session cookie...');
  const meRes = await axios.get(`${baseUrl}/api/me`, {
    headers: {
      'Cookie': sessionCookie || '',
      'Origin': 'http://localhost:5173'
    }
  });
  console.log('   /api/me Status:', meRes.status);
  console.log('   User Role:', meRes.data?.user?.role);
  console.log('   Profile Message:', meRes.data?.message, '\n');

  if (meRes.status !== 200) {
    throw new Error(`Protected route /api/me failed with status ${meRes.status}: ${JSON.stringify(meRes.data)}`);
  }

  // Step 5: Test Admin Protected Directory (/api/users)
  console.log('5️⃣ Testing Admin Users Directory (/api/users)...');
  const usersRes = await axios.get(`${baseUrl}/api/users`, {
    headers: {
      'Cookie': sessionCookie || '',
      'Origin': 'http://localhost:5173'
    }
  });
  console.log('   /api/users Status:', usersRes.status);
  console.log('   Total Users Found:', usersRes.data?.length, '\n');

  // Step 6: Test Unauthorized Access (Without Cookie)
  console.log('6️⃣ Testing /api/me without authentication cookie...');
  try {
    await axios.get(`${baseUrl}/api/me`);
    throw new Error('Expected 401 Unauthorized but request succeeded');
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.log('   Unauthorized Status: 401 (Expected: 401)');
      console.log('   Unauthorized Error Message:', err.response.data?.message || err.response.data?.error, '\n');
    } else {
      throw err;
    }
  }

  console.log('==========================================');
  console.log('🎉 ALL AXIOS API & AUTH TESTS PASSED SUCCESSFULLY!');
  console.log('==========================================');
}

runAuthTest().catch(err => {
  console.error('\n❌ AUTH TEST FAILED:', err.message);
  process.exit(1);
});
