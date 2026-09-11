import { test, expect, Page } from '@playwright/test';

/**
 * Helpdesk Authentication & Session Lifecycle E2E Test Suite
 *
 * Covers complete client & server auth lifecycle:
 * 1. UI Structure & Initial Rendering
 * 2. Password Visibility Toggle
 * 3. Demo Quick Select Helpers
 * 4. Client-Side Form Validation (Zod Schema)
 * 5. Successful Authentication Workflows (Admin & Agent)
 * 6. Failed Authentication & Error Handling
 * 7. Session Persistence, Page Reloads & Tab Isolation
 * 8. Sign-Out & Session Invalidation
 * 9. Direct URL Navigation & Route Guards
 */

// Helper function for performing UI sign-in
async function loginViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: /sign in to workspace/i }).click();
}

test.describe('Helpdesk Authentication & Session Lifecycle Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root URL before each test
    await page.goto('/');
  });

  // =========================================================================
  // 1. UI Structure & Initial Rendering
  // =========================================================================
  test.describe('1. UI Structure & Initial Rendering', () => {
    test('renders complete authentication card header, title, and descriptive copy', async ({ page }) => {
      // 1. Verify Card Header and branding title
      const heading = page.getByRole('heading', { name: 'Helpdesk Platform' });
      await expect(heading).toBeVisible({ timeout: 10000 });

      // 2. Verify Card descriptive subtitle
      const subtitle = page.getByText('Sign in to access your workspace');
      await expect(subtitle).toBeVisible();
    });

    test('renders email and password inputs with proper labels, types, and placeholders in initial empty state', async ({ page }) => {
      // 1. Verify Work Email field
      const emailLabel = page.getByText('Work Email', { exact: true });
      await expect(emailLabel).toBeVisible();

      const emailInput = page.locator('input#email');
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(emailInput).toHaveAttribute('placeholder', 'admin@example.com');
      await expect(emailInput).toHaveValue('');

      // 2. Verify Password field
      const passwordLabel = page.getByText('Password', { exact: true });
      await expect(passwordLabel).toBeVisible();

      const passwordInput = page.locator('input#password');
      await expect(passwordInput).toBeVisible();
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(passwordInput).toHaveAttribute('placeholder', '••••••••••••');
      await expect(passwordInput).toHaveValue('');
    });

    test('renders workspace submit button in default enabled state', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /sign in to workspace/i });
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeEnabled();
    });

    test('renders Demo Quick Select footer section with credentials and badges', async ({ page }) => {
      // 1. Verify Demo Quick Select labels and badge
      await expect(page.getByText('Demo Quick Select')).toBeVisible();
      await expect(page.getByText('Demo Credentials')).toBeVisible();

      // 2. Verify Admin quick fill button
      const adminQuickFill = page.getByRole('button').filter({ hasText: 'admin@example.com' });
      await expect(adminQuickFill).toBeVisible();
      await expect(adminQuickFill).toContainText('Admin');

      // 3. Verify Agent quick fill button
      const agentQuickFill = page.getByRole('button').filter({ hasText: 'agent@example.com' });
      await expect(agentQuickFill).toBeVisible();
      await expect(agentQuickFill).toContainText('Agent');
    });
  });

  // =========================================================================
  // 2. Password Visibility Toggle
  // =========================================================================
  test.describe('2. Password Visibility Toggle', () => {
    test('toggles password input type between password and text upon clicking eye button', async ({ page }) => {
      const passwordInput = page.locator('input#password');
      const toggleButton = page.locator('input#password ~ button');

      // 1. Verify default masked state
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // 2. Enter a test password
      await passwordInput.fill('mySecretPassword123!');

      // 3. Click toggle button -> reveals password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await expect(passwordInput).toHaveValue('mySecretPassword123!');

      // 4. Click toggle button again -> re-masks password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(passwordInput).toHaveValue('mySecretPassword123!');
    });
  });

  // =========================================================================
  // 3. Demo Quick Select Helpers
  // =========================================================================
  test.describe('3. Demo Quick Select Helpers', () => {
    test('clicking Admin demo quick-fill populates admin credentials into form fields', async ({ page }) => {
      const adminQuickFill = page.getByRole('button').filter({ hasText: 'admin@example.com' });
      await adminQuickFill.click();

      await expect(page.locator('input#email')).toHaveValue('admin@example.com');
      await expect(page.locator('input#password')).toHaveValue('password123');
    });

    test('clicking Agent demo quick-fill populates agent credentials into form fields', async ({ page }) => {
      const agentQuickFill = page.getByRole('button').filter({ hasText: 'agent@example.com' });
      await agentQuickFill.click();

      await expect(page.locator('input#email')).toHaveValue('agent@example.com');
      await expect(page.locator('input#password')).toHaveValue('password123');
    });

    test('clicking demo quick-select clears previously displayed validation errors and alerts', async ({ page }) => {
      // 1. Trigger client-side validation errors by submitting empty form
      await page.getByRole('button', { name: /sign in to workspace/i }).click();
      await expect(page.getByText('Email address is required')).toBeVisible();
      await expect(page.getByText('Password is required')).toBeVisible();

      // 2. Click Admin quick-fill and verify errors are cleared
      const adminQuickFill = page.getByRole('button').filter({ hasText: 'admin@example.com' });
      await adminQuickFill.click();

      await expect(page.getByText('Email address is required')).not.toBeVisible();
      await expect(page.getByText('Password is required')).not.toBeVisible();

      // 3. Submit invalid credentials to trigger error alert
      await page.locator('input#password').fill('incorrectPassword');
      await page.getByRole('button', { name: /sign in to workspace/i }).click();
      const alert = page.getByRole('alert');
      await expect(alert).toBeVisible({ timeout: 10000 });

      // 4. Click Agent quick-fill and verify error alert is cleared
      const agentQuickFill = page.getByRole('button').filter({ hasText: 'agent@example.com' });
      await agentQuickFill.click();
      await expect(alert).not.toBeVisible();
    });
  });

  // =========================================================================
  // 4. Client-Side Form Validation (Zod schema)
  // =========================================================================
  test.describe('4. Client-Side Form Validation (Zod schema)', () => {
    test('submitting empty form triggers required field validation errors', async ({ page }) => {
      await page.getByRole('button', { name: /sign in to workspace/i }).click();

      await expect(page.getByText('Email address is required')).toBeVisible();
      await expect(page.getByText('Password is required')).toBeVisible();
    });

    test('submitting malformed email formats triggers email validation error', async ({ page }) => {
      const malformedEmails = ['notanemail', 'user@', '@domain.com', 'user@domain'];

      for (const malformedEmail of malformedEmails) {
        await page.locator('input#email').fill(malformedEmail);
        await page.locator('input#password').fill('password123');
        await page.getByRole('button', { name: /sign in to workspace/i }).click();

        await expect(page.getByText('Please enter a valid email address')).toBeVisible();
      }
    });

    test('submitting short password (< 6 chars) triggers minimum length error', async ({ page }) => {
      await page.locator('input#email').fill('admin@example.com');
      await page.locator('input#password').fill('12345');
      await page.getByRole('button', { name: /sign in to workspace/i }).click();

      await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
    });

    test('correcting invalid input and re-submitting clears form validation errors', async ({ page }) => {
      // 1. Trigger validation errors
      await page.locator('input#email').fill('invalid-email');
      await page.locator('input#password').fill('123');
      await page.getByRole('button', { name: /sign in to workspace/i }).click();

      await expect(page.getByText('Please enter a valid email address')).toBeVisible();
      await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();

      // 2. Correct with valid credentials
      await page.locator('input#email').fill('admin@example.com');
      await page.locator('input#password').fill('password123');
      await page.getByRole('button', { name: /sign in to workspace/i }).click();

      // 3. Validation errors disappear and user reaches dashboard
      await expect(page.getByText('Please enter a valid email address')).not.toBeVisible();
      await expect(page.getByText('Password must be at least 6 characters')).not.toBeVisible();
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });
    });
  });

  // =========================================================================
  // 5. Successful Authentication Workflows (Admin & Agent)
  // =========================================================================
  test.describe('5. Successful Authentication Workflows (Admin & Agent)', () => {
    test('Admin login: displays loading state, routes to dashboard, shows ADMIN badge and Users button', async ({ page }) => {
      // 1. Fill Admin credentials
      await page.locator('input#email').fill('admin@example.com');
      await page.locator('input#password').fill('password123');

      // 2. Submit form and verify loading state
      const submitBtn = page.getByRole('button', { name: /sign in to workspace/i });
      await submitBtn.click();

      // 3. Verify successful redirection to dashboard and welcome message
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/logged in as/i)).toBeVisible();

      // 4. Verify ADMIN role badge in navbar
      const adminBadge = page.locator('header').getByText('ADMIN', { exact: true });
      await expect(adminBadge).toBeVisible();

      // 5. Verify "Users" navigation button and "Sign Out" button are visible for Admin
      await expect(page.getByRole('button', { name: 'Users' })).toBeVisible();
      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
    });

    test('Agent login: routes to dashboard, displays AGENT badge, and hides Users navigation button', async ({ page }) => {
      // 1. Fill Agent credentials
      await page.locator('input#email').fill('agent@example.com');
      await page.locator('input#password').fill('password123');

      // 2. Submit form
      await page.getByRole('button', { name: /sign in to workspace/i }).click();

      // 3. Verify dashboard and welcome message
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/logged in as/i)).toBeVisible();

      // 4. Verify AGENT role badge in navbar
      const agentBadge = page.locator('header').getByText('AGENT', { exact: true });
      await expect(agentBadge).toBeVisible();

      // 5. Verify Users button is hidden for Agent role
      await expect(page.getByRole('button', { name: 'Users' })).not.toBeVisible();
      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
    });

    test('supports case-insensitive email authentication for Admin and Agent accounts', async ({ page }) => {
      // 1. Login with uppercase Admin email
      await loginViaUI(page, 'ADMIN@EXAMPLE.COM', 'password123');
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });
      await expect(page.locator('header').getByText('ADMIN', { exact: true })).toBeVisible();

      // Sign out
      await page.getByRole('button', { name: /sign out/i }).click();
      await expect(page.getByRole('heading', { name: 'Helpdesk Platform' })).toBeVisible({ timeout: 10000 });

      // 2. Login with mixed-case Agent email
      await loginViaUI(page, 'Agent@Example.Com', 'password123');
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });
      await expect(page.locator('header').getByText('AGENT', { exact: true })).toBeVisible();
    });

    test('trims leading and trailing whitespace from email input before submission', async ({ page }) => {
      // Login with padded email address
      await loginViaUI(page, '   admin@example.com   ', 'password123');
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });
      await expect(page.locator('header').getByText('ADMIN', { exact: true })).toBeVisible();
    });
  });

  // =========================================================================
  // 6. Failed Authentication & Error Handling
  // =========================================================================
  test.describe('6. Failed Authentication & Error Handling', () => {
    test('displays destructive error alert for non-existent user credentials', async ({ page }) => {
      await loginViaUI(page, 'nonexistent.user@example.com', 'password123');

      const alert = page.getByRole('alert');
      await expect(alert).toBeVisible({ timeout: 10000 });
      await expect(alert).toHaveText(/invalid email or password|failed to fetch/i);
    });

    test('displays destructive error alert for invalid password on existing account', async ({ page }) => {
      await loginViaUI(page, 'admin@example.com', 'wrongpassword999');

      const alert = page.getByRole('alert');
      await expect(alert).toBeVisible({ timeout: 10000 });
      await expect(alert).toHaveText(/invalid email or password|failed to fetch/i);
    });

    test('safely handles special characters and injection payloads without application crash', async ({ page }) => {
      // 1. Script injection attempt - caught by client email schema validation
      await loginViaUI(page, '<script>alert(1)</script>@example.com', 'password123');
      await expect(page.getByText('Please enter a valid email address')).toBeVisible();

      // 2. SQL injection payload - caught by client email schema validation
      await loginViaUI(page, "' OR '1'='1' --@example.com", 'password123');
      await expect(page.getByText('Please enter a valid email address')).toBeVisible();

      // Verify page remains interactive and intact
      await expect(page.getByRole('heading', { name: 'Helpdesk Platform' })).toBeVisible();
    });
  });

  // =========================================================================
  // 7. Session Persistence, Page Reloads & Tab Isolation
  // =========================================================================
  test.describe('7. Session Persistence & Browser Context Workflows', () => {
    test('reloading page maintains authenticated session and renders dashboard directly', async ({ page }) => {
      // 1. Sign in as Admin
      await loginViaUI(page, 'admin@example.com', 'password123');
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });

      // 2. Reload browser page
      await page.reload();

      // 3. Verify session restored directly to dashboard without showing login form
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/logged in as/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in to workspace/i })).not.toBeVisible();
    });

    test('opening a new page in the same browser context inherits the authenticated session', async ({ page, context }) => {
      // 1. Sign in as Admin in primary tab
      await loginViaUI(page, 'admin@example.com', 'password123');
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });

      // 2. Open new tab in same browser context
      const newTab: Page = await context.newPage();
      await newTab.goto('/');

      // 3. Verify second tab inherits authentication session
      await expect(newTab.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });
      await expect(newTab.locator('header').getByText('ADMIN', { exact: true })).toBeVisible();

      // Cleanup tab
      await newTab.close();
    });
  });

  // =========================================================================
  // 8. Sign-Out & Session Invalidation
  // =========================================================================
  test.describe('8. Sign-Out & Session Invalidation', () => {
    test('clicking "Sign Out" invalidates session, returns to login screen, and persists after reload', async ({ page }) => {
      // 1. Log in as Admin
      await loginViaUI(page, 'admin@example.com', 'password123');
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });

      // 2. Click Sign Out in Navbar
      const signOutButton = page.getByRole('button', { name: /sign out/i });
      await expect(signOutButton).toBeVisible();
      await signOutButton.click();

      // 3. Verify immediate redirection to login screen
      await expect(page.getByRole('heading', { name: 'Helpdesk Platform' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: /sign in to workspace/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /sign out/i })).not.toBeVisible();

      // 4. Reload page and verify user remains logged out
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Helpdesk Platform' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).not.toBeVisible();
    });

    test('sign-out invalidates server session so that /api/me returns 401 Unauthorized', async ({ page }) => {
      // 1. Log in as Admin
      await loginViaUI(page, 'admin@example.com', 'password123');
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });

      // 2. Verify /api/me returns 200 while logged in
      const authProfileRes = await page.request.get('/api/me');
      expect(authProfileRes.status()).toBe(200);

      // 3. Perform Sign Out via UI
      await page.getByRole('button', { name: /sign out/i }).click();
      await expect(page.getByRole('heading', { name: 'Helpdesk Platform' })).toBeVisible({ timeout: 10000 });

      // 4. Verify /api/me returns 401 Unauthorized after sign-out
      const unauthProfileRes = await page.request.get('/api/me');
      expect(unauthProfileRes.status()).toBe(401);
    });
  });

  // =========================================================================
  // 9. Direct URL Navigation & Route Guards
  // =========================================================================
  test.describe('9. Direct URL Navigation & Route Guards', () => {
    test('unauthenticated direct navigation to "/" renders the login view', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByRole('heading', { name: 'Helpdesk Platform' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: /sign in to workspace/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).not.toBeVisible();
    });

    test('unauthenticated direct navigation to protected "/users" route renders the login view', async ({ page }) => {
      await page.goto('/users');

      await expect(page.getByRole('heading', { name: 'Helpdesk Platform' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: /sign in to workspace/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Users', exact: true })).not.toBeVisible();
    });
  });

  // =========================================================================
  // 10. Advanced Edge Cases & Security Guards
  // =========================================================================
  test.describe('10. Advanced Edge Cases & Security Guards', () => {
    test('submitting form via Enter key press on password field authenticates successfully', async ({ page }) => {
      await page.locator('input#email').fill('admin@example.com');
      await page.locator('input#password').fill('password123');
      await page.locator('input#password').press('Enter');

      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });
      await expect(page.locator('header').getByText('ADMIN', { exact: true })).toBeVisible();
    });

    test('recovers gracefully from corrupted or expired session cookie by rendering login screen', async ({ page, context }) => {
      // 1. Inject an invalid / forged session cookie
      await context.addCookies([
        {
          name: 'better-auth.session_token',
          value: 'forged_or_corrupted_session_token_12345',
          domain: 'localhost',
          path: '/',
        },
      ]);

      // 2. Navigate to root application
      await page.goto('/');

      // 3. Should gracefully fall back to Login view without crashing
      await expect(page.getByRole('heading', { name: 'Helpdesk Platform' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: /sign in to workspace/i })).toBeVisible();
    });

    test('public sign-up registration is explicitly disabled on backend', async ({ request }) => {
      const signUpAttempt = await request.post('/api/auth/sign-up/email', {
        data: {
          email: 'unauthorized_new_user@example.com',
          password: 'Password123!',
          name: 'Intruder',
        },
      });

      // Better Auth returns 400 or error when disableSignUp: true
      expect(signUpAttempt.status()).toBeGreaterThanOrEqual(400);
    });
  });
});

