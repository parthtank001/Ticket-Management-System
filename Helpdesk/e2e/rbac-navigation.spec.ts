import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control (RBAC) & Navigation Suite', () => {
  test.describe('Admin Role Access', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in as Admin
      await page.goto('/');
      await page.locator('input#email').fill('admin@example.com');
      await page.locator('input#password').fill('password123');
      await page.getByRole('button', { name: /sign in to workspace/i }).click();
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });
    });

    test('Admin navigates to /users directory via Navbar button', async ({ page }) => {
      // 1. Locate and click the Navbar "Users" button
      const usersButton = page.getByRole('button', { name: 'Users' });
      await expect(usersButton).toBeVisible();
      await usersButton.click();

      // 2. Verify URL path updated to /users
      await expect(page).toHaveURL(/\/users$/);

      // 3. Verify Users Page heading is visible
      const usersHeading = page.getByRole('heading', { name: 'Users', exact: true });
      await expect(usersHeading).toBeVisible();
    });

    test('Admin navigates to /users directory via direct URL', async ({ page }) => {
      // 1. Navigate directly to /users
      await page.goto('/users');

      // 2. Verify URL and content rendered
      await expect(page).toHaveURL(/\/users$/);
      const usersHeading = page.getByRole('heading', { name: 'Users', exact: true });
      await expect(usersHeading).toBeVisible();
    });
  });

  test.describe('Agent Role Access & Restriction', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in as Agent
      await page.goto('/');
      await page.locator('input#email').fill('agent@example.com');
      await page.locator('input#password').fill('password123');
      await page.getByRole('button', { name: /sign in to workspace/i }).click();
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });
    });

    test('Agent access restriction: Attempting to access /users shows "Access Restricted" screen', async ({ page }) => {
      // 1. Confirm Users button is NOT rendered in the Navbar
      await expect(page.getByRole('button', { name: 'Users' })).not.toBeVisible();

      // 2. Attempt direct navigation to /users
      await page.goto('/users');

      // 3. Verify "Access Restricted" screen appears
      const restrictedHeading = page.getByRole('heading', { name: 'Access Restricted' });
      await expect(restrictedHeading).toBeVisible();

      const warningText = page.getByText('The Users Directory is restricted to Admin accounts only.');
      await expect(warningText).toBeVisible();

      const returnButton = page.getByRole('button', { name: 'Return to Workspace' });
      await expect(returnButton).toBeVisible();
    });

    test('Clicking "Return to Workspace" navigates Agent back to home dashboard', async ({ page }) => {
      // 1. Direct navigate to restricted /users view
      await page.goto('/users');
      await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();

      // 2. Click "Return to Workspace" button
      const returnButton = page.getByRole('button', { name: 'Return to Workspace' });
      await returnButton.click();

      // 3. Verify navigation back to root workspace '/'
      await expect(page).toHaveURL(/\/$/);

      // 4. Verify Welcome screen is restored
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible();
    });
  });
});
