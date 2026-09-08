import { test, expect } from '@playwright/test';

test.describe('Admin User Directory E2E Suite', () => {
  test.describe('1. Admin User Table Workflows', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in as Admin
      await page.goto('/');
      await page.locator('input#email').fill('admin@example.com');
      await page.locator('input#password').fill('password123');
      await page.getByRole('button', { name: /sign in to workspace/i }).click();
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });

      // Navigate to /users directory
      await page.getByRole('button', { name: 'Users' }).click();
      await expect(page).toHaveURL(/\/users$/);
      await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
    });

    test('renders user directory table with Name, Email, Role, Date Created columns and default seeded accounts', async ({ page }) => {
      // 1. Verify exact 4 table headers
      await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Date Created' })).toBeVisible();

      // 2. Verify Status and Actions headers are NOT present
      await expect(page.getByRole('columnheader', { name: 'Status' })).not.toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Actions' })).not.toBeVisible();

      // 3. Verify seeded accounts are rendered
      await expect(page.getByText('admin@example.com').first()).toBeVisible();
      await expect(page.getByText('agent@example.com').first()).toBeVisible();
      await expect(page.getByText('System Admin').first()).toBeVisible();
      await expect(page.getByText('Helpdesk Agent').first()).toBeVisible();
      await expect(page.getByText('You', { exact: true }).first()).toBeVisible();
    });

    test('allows admin to open Create User modal, validate inputs, and successfully create a new user', async ({ page }) => {
      const uniqueTimestamp = Date.now();
      const newUserName = `Agent Test ${uniqueTimestamp}`;
      const newUserEmail = `agent.${uniqueTimestamp}@example.com`;

      // 1. Click Add User button to open modal
      await page.getByRole('button', { name: /add user/i }).click();
      await expect(page.getByRole('heading', { name: 'Add New User' })).toBeVisible();

      // 2. Verify validation errors on empty submission
      await page.getByRole('button', { name: /^create user$/i }).click();
      await expect(page.getByText('Name must be at least 3 characters long.')).toBeVisible();
      await expect(page.getByText('A valid email address is required.')).toBeVisible();
      await expect(page.getByText('Password must be at least 8 characters long.')).toBeVisible();

      // 3. Fill in valid user form
      await page.locator('input#create-name').fill(newUserName);
      await page.locator('input#create-email').fill(newUserEmail);
      await page.locator('input#create-password').fill('password123');

      // 4. Submit form
      await page.getByRole('button', { name: /^create user$/i }).click();

      // 5. Modal should close and new user appears in directory table
      await expect(page.getByRole('heading', { name: 'Add New User' })).not.toBeVisible();
      await expect(page.getByText(newUserName)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(newUserEmail)).toBeVisible();
    });

    test('displays error alert when trying to create a user with duplicate email', async ({ page }) => {
      // 1. Open modal
      await page.getByRole('button', { name: /add user/i }).click();
      await expect(page.getByRole('heading', { name: 'Add New User' })).toBeVisible();

      // 2. Fill in existing admin email
      await page.locator('input#create-name').fill('Duplicate Admin');
      await page.locator('input#create-email').fill('admin@example.com');
      await page.locator('input#create-password').fill('password123');

      // 3. Submit
      await page.getByRole('button', { name: /^create user$/i }).click();

      // 4. Verify duplicate error message inside modal
      await expect(page.getByText('A user with this email address already exists.')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Add New User' })).toBeVisible();

      // 5. Cancel closes modal
      await page.getByRole('button', { name: /^cancel$/i }).click();
      await expect(page.getByRole('heading', { name: 'Add New User' })).not.toBeVisible();
    });
  });

  test.describe('2. RBAC Access Restriction', () => {
    test('non-admin Agent is forbidden from viewing user list', async ({ page }) => {
      // Sign in as Agent
      await page.goto('/');
      await page.locator('input#email').fill('agent@example.com');
      await page.locator('input#password').fill('password123');
      await page.getByRole('button', { name: /sign in to workspace/i }).click();
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });

      // Users button should not exist in Navbar
      await expect(page.getByRole('button', { name: 'Users' })).not.toBeVisible();

      // Attempt direct navigation to /users
      await page.goto('/users');
      await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
      await expect(page.getByText('The Users Directory is restricted to Admin accounts only.')).toBeVisible();
    });
  });
});

