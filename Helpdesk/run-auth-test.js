const baseUrl = 'http://localhost:5000';

async function runAuthTest() {
  console.log('==========================================');
  console.log('🧪 AUTHENTICATION FLOW TEST');
  console.log('==========================================\n');

  // Step 1: Healthcheck
  console.log('1️⃣ Checking /api/health...');
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const healthData = await healthRes.json();
  console.log('   Status:', healthRes.status);
  console.log('   Database Connection:', healthData.services?.database);
  console.log('   API Message:', healthData.message, '\n');

  // Step 2: Sign-Up
  const testUser = {
    email: `agent_${Date.now()}@example.com`,
    password: 'Password123!',
    name: 'Helpdesk Test Agent'
  };
  console.log('2️⃣ Signing up new user:', testUser.email);
  const signUpRes = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5173'
    },
    body: JSON.stringify(testUser)
  });

  const signUpCookie = signUpRes.headers.get('set-cookie');
  const signUpBody = await signUpRes.json();
  console.log('   Sign-Up Status:', signUpRes.status, signUpRes.statusText);
  console.log('   User ID:', signUpBody.user?.id);
  console.log('   User Email:', signUpBody.user?.email);
  console.log('   Session Token Cookie Present:', !!signUpCookie, '\n');

  if (signUpRes.status !== 200 && signUpRes.status !== 201) {
    throw new Error(`Sign up failed with status ${signUpRes.status}: ${JSON.stringify(signUpBody)}`);
  }

  // Step 3: Get Session (/api/auth/get-session)
  console.log('3️⃣ Checking session via /api/auth/get-session...');
  const sessionRes = await fetch(`${baseUrl}/api/auth/get-session`, {
    headers: {
      'Cookie': signUpCookie || '',
      'Origin': 'http://localhost:5173'
    }
  });
  const sessionBody = await sessionRes.json();
  console.log('   Get Session Status:', sessionRes.status);
  console.log('   Authenticated User:', sessionBody?.user?.email);
  console.log('   Session Expire Date:', sessionBody?.session?.expiresAt, '\n');

  // Step 4: Access Protected Route (/api/me) with Sign-Up Session
  console.log('4️⃣ Testing protected route /api/me with session cookie...');
  const meRes1 = await fetch(`${baseUrl}/api/me`, {
    headers: {
      'Cookie': signUpCookie || '',
      'Origin': 'http://localhost:5173'
    }
  });
  const meBody1 = await meRes1.json();
  console.log('   /api/me Status:', meRes1.status);
  console.log('   Retrieved Profile:', meBody1.user?.name, `(${meBody1.user?.email})`);
  console.log('   Profile Message:', meBody1.message, '\n');

  if (meRes1.status !== 200) {
    throw new Error(`Protected route /api/me failed with status ${meRes1.status}: ${JSON.stringify(meBody1)}`);
  }

  // Step 5: Sign-In with Existing User
  console.log('5️⃣ Testing user sign-in (/api/auth/sign-in/email)...');
  const signInRes = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:5173'
    },
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password
    })
  });

  const signInCookie = signInRes.headers.get('set-cookie');
  const signInBody = await signInRes.json();
  console.log('   Sign-In Status:', signInRes.status);
  console.log('   Signed In User ID:', signInBody.user?.id);
  console.log('   New Cookie Received:', !!signInCookie, '\n');

  if (signInRes.status !== 200) {
    throw new Error(`Sign in failed with status ${signInRes.status}: ${JSON.stringify(signInBody)}`);
  }

  // Step 6: Verify Protected Route (/api/me) with Sign-In Cookie
  console.log('6️⃣ Verifying /api/me after sign-in...');
  const meRes2 = await fetch(`${baseUrl}/api/me`, {
    headers: {
      'Cookie': signInCookie || '',
      'Origin': 'http://localhost:5173'
    }
  });
  const meBody2 = await meRes2.json();
  console.log('   /api/me Status:', meRes2.status);
  console.log('   User Role:', meBody2.user?.role || 'AGENT');
  console.log('   User Email:', meBody2.user?.email, '\n');

  if (meRes2.status !== 200) {
    throw new Error(`Protected route /api/me after sign-in failed with status ${meRes2.status}: ${JSON.stringify(meBody2)}`);
  }

  // Step 7: Test Unauthorized Access (Without Cookie)
  console.log('7️⃣ Testing /api/me without authentication cookie...');
  const unauthRes = await fetch(`${baseUrl}/api/me`);
  const unauthBody = await unauthRes.json();
  console.log('   Unauthorized Status:', unauthRes.status, `(Expected: 401)`);
  console.log('   Unauthorized Error Message:', unauthBody.message, '\n');

  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401 Unauthorized but got ${unauthRes.status}`);
  }

  console.log('==========================================');
  console.log('🎉 ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY!');
  console.log('==========================================');
}

runAuthTest().catch(err => {
  console.error('\n❌ AUTH TEST FAILED:', err.message);
  process.exit(1);
});
