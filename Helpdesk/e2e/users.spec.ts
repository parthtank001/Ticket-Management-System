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
