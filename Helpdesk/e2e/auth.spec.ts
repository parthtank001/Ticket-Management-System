import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page and allow admin sign in', async ({ page }) => {
    await page.goto('/');

    // Check login page elements
    await expect(page.getByText('Helpdesk Portal')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Fill in credentials
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('password123');

    // Click submit
    await page.getByRole('button', { name: /sign in/i }).click();

    // Verify redirected to dashboard / welcome message
    await expect(page.getByText(/Welcome to the Helpdesk/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/admin@example.com/i)).toBeVisible();
  });

  test('should show validation error on incorrect credentials', async ({ page }) => {
    await page.goto('/');

    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');

    await page.getByRole('button', { name: /sign in/i }).click();

    // Should display error message
    await expect(page.locator('role=alert')).toBeVisible({ timeout: 10000 });
  });
});
