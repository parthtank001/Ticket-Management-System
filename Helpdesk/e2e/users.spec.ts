import { test, expect, Page } from '@playwright/test';

/**
 * User Management E2E Test Suite (Happy Paths Only)
 *
 * Covers complete CRUD lifecycle operations for user management:
 * 1. Create (C): Admin creates new user accounts with valid name, email, and password.
 * 2. Read (R): Admin views user directory, table headers, role badges, user count, and seeded accounts.
 * 3. Update (U): Admin updates existing user details (name, email, and/or password) and verifies login with updated credentials.
 * 4. Delete (D): Admin soft-deletes an agent account through the confirmation modal dialog.
 * 5. Full Lifecycle (C -> R -> U -> D): Integrated happy path test covering the complete user lifecycle from creation to deletion.
 */

// Helper to log in via UI
async function loginViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');
  await page.locator('input#email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: /sign in to workspace/i }).click();
  await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });
}

// Helper to sign out via UI
async function signOutViaUI(page: Page): Promise<void> {
  const signOutBtn = page.getByRole('button', { name: /sign out/i });
  await signOutBtn.click();
  await expect(page.getByRole('heading', { name: /helpdesk platform/i })).toBeVisible({ timeout: 10000 });
}

// Helper to navigate to Users directory
async function navigateToUsersDirectory(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Users' }).click();
  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
}

test.describe('User Management E2E CRUD Suite (Happy Paths)', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Admin and open the user management directory
    await loginViaUI(page, 'admin@example.com', 'password123');
    await navigateToUsersDirectory(page);
  });

  // =========================================================================
  // 1. CREATE (C) - Happy Path User Creation Workflows
  // =========================================================================
  test.describe('1. Create (C) - User Creation', () => {
    test('Admin successfully creates a new agent user and verifies their presence in directory table', async ({ page }) => {
      const timestamp = Date.now();
      const newUserName = `John Doe ${timestamp}`;
      const newUserEmail = `john.${timestamp}@example.com`;

      // 1. Click "Add User" button to open modal
      await page.getByRole('button', { name: /add user/i }).click();
      await expect(page.getByRole('heading', { name: 'Add New User' })).toBeVisible();

      // 2. Fill in valid user credentials
      await page.locator('input#create-name').fill(newUserName);
      await page.locator('input#create-email').fill(newUserEmail);
      await page.locator('input#create-password').fill('securePassword123');

      // 3. Submit form
      await page.getByRole('button', { name: /^create user$/i }).click();

      // 4. Modal should dismiss
      await expect(page.getByRole('heading', { name: 'Add New User' })).not.toBeVisible();

      // 5. Verify the newly created user appears in the directory table with AGENT badge
      const userRow = page.locator('tr').filter({ hasText: newUserEmail });
      await expect(userRow).toBeVisible({ timeout: 10000 });
      await expect(userRow.getByText(newUserName, { exact: true })).toBeVisible();
      await expect(userRow.getByText('AGENT', { exact: true })).toBeVisible();
    });
  });

  // =========================================================================
  // 2. READ (R) - Happy Path User Directory Listing Workflows
  // =========================================================================
  test.describe('2. Read (R) - User Directory Listing', () => {
    test('Admin views directory table with proper column headers, user count, and seeded accounts', async ({ page }) => {
      // 1. Verify exact 4 table headers
      await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Date Created' })).toBeVisible();

      // 2. Verify user count text is displayed (e.g. "2 users" or "3 users")
      await expect(page.getByText(/\d+\s+users?/).first()).toBeVisible();

      // 3. Verify seeded Admin user details and ADMIN badge
      const adminRow = page.locator('tr').filter({ hasText: 'admin@example.com' });
      await expect(adminRow).toBeVisible({ timeout: 10000 });
      await expect(adminRow.getByText('ADMIN', { exact: true })).toBeVisible();
      await expect(adminRow.getByText('You', { exact: true })).toBeVisible();

      // 4. Verify seeded Agent user details and AGENT badge
      const agentRow = page.locator('tr').filter({ hasText: 'agent@example.com' });
      await expect(agentRow).toBeVisible({ timeout: 10000 });
      await expect(agentRow.getByText('AGENT', { exact: true })).toBeVisible();
    });
  });

  // =========================================================================
  // 3. UPDATE (U) - Happy Path User Editing & Password Update Workflows
  // =========================================================================
  test.describe('3. Update (U) - User Editing', () => {
    test('Admin successfully edits an existing user name and email without altering password', async ({ page }) => {
      const timestamp = Date.now();
      const initialName = `Sam Taylor ${timestamp}`;
      const initialEmail = `sam.${timestamp}@example.com`;
      const updatedName = `Samantha Taylor ${timestamp}`;
      const updatedEmail = `samantha.${timestamp}@example.com`;

      // 1. Create a user to edit
      await page.getByRole('button', { name: /add user/i }).click();
      await page.locator('input#create-name').fill(initialName);
      await page.locator('input#create-email').fill(initialEmail);
      await page.locator('input#create-password').fill('password123');
      await page.getByRole('button', { name: /^create user$/i }).click();
      await expect(page.getByText(initialEmail)).toBeVisible({ timeout: 10000 });

      // 2. Click the edit button (pencil icon) for this user
      const userRow = page.locator('tr').filter({ hasText: initialEmail });
      const editBtn = userRow.getByRole('button', { name: `Edit ${initialName}` });
      await editBtn.click({ force: true });

      // 3. Verify Edit User modal opens with pre-populated values
      await expect(page.getByRole('heading', { name: 'Edit User' })).toBeVisible();
      await expect(page.locator('input#create-name')).toHaveValue(initialName);
      await expect(page.locator('input#create-email')).toHaveValue(initialEmail);
      await expect(page.locator('input#create-password')).toHaveValue('');

      // 4. Update Name and Email, leaving Password blank
      await page.locator('input#create-name').fill(updatedName);
      await page.locator('input#create-email').fill(updatedEmail);

      // 5. Submit changes
      await page.getByRole('button', { name: /^save changes$/i }).click();

      // 6. Modal should dismiss and table displays updated info
      await expect(page.getByRole('heading', { name: 'Edit User' })).not.toBeVisible();
      await expect(page.getByText(updatedName)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(updatedEmail)).toBeVisible();
      await expect(page.getByText(initialEmail)).not.toBeVisible();
    });

    test('Admin updates an agent password and verifies the agent can log in with new password', async ({ page }) => {
      const timestamp = Date.now();
      const agentName = `Morgan Reed ${timestamp}`;
      const agentEmail = `morgan.${timestamp}@example.com`;
      const initialPassword = 'initialPassword123';
      const newPassword = 'newSecretPassword123';

      // 1. Create the agent with initial password
      await page.getByRole('button', { name: /add user/i }).click();
      await page.locator('input#create-name').fill(agentName);
      await page.locator('input#create-email').fill(agentEmail);
      await page.locator('input#create-password').fill(initialPassword);
      await page.getByRole('button', { name: /^create user$/i }).click();
      await expect(page.getByText(agentEmail)).toBeVisible({ timeout: 10000 });

      // 2. Open edit modal for this agent
      const userRow = page.locator('tr').filter({ hasText: agentEmail });
      const editBtn = userRow.getByRole('button', { name: `Edit ${agentName}` });
      await editBtn.click({ force: true });

      // 3. Enter new password and save
      await expect(page.getByRole('heading', { name: 'Edit User' })).toBeVisible();
      await page.locator('input#create-password').fill(newPassword);
      await page.getByRole('button', { name: /^save changes$/i }).click();
      await expect(page.getByRole('heading', { name: 'Edit User' })).not.toBeVisible();

      // 4. Sign out as Admin
      await signOutViaUI(page);

      // 5. Sign in as the edited agent with the new password
      await page.locator('input#email').fill(agentEmail);
      await page.locator('input#password').fill(newPassword);
      await page.getByRole('button', { name: /sign in to workspace/i }).click();

      // 6. Verify successful login to workspace
      const welcomeHeading = page.getByRole('heading', { name: /welcome to the helpdesk/i });
      await expect(welcomeHeading).toBeVisible({ timeout: 15000 });
      await expect(welcomeHeading).toContainText(agentName);
      await expect(page.getByText('AGENT', { exact: true })).toBeVisible();
    });
  });

  // =========================================================================
  // 4. DELETE (D) - Happy Path User Deletion Workflows
  // =========================================================================
  test.describe('4. Delete (D) - User Deletion', () => {
    test('Admin successfully deletes an agent through the confirmation modal', async ({ page }) => {
      const timestamp = Date.now();
      const agentName = `Jordan Case ${timestamp}`;
      const agentEmail = `jordan.${timestamp}@example.com`;

      // 1. Create an agent to delete
      await page.getByRole('button', { name: /add user/i }).click();
      await page.locator('input#create-name').fill(agentName);
      await page.locator('input#create-email').fill(agentEmail);
      await page.locator('input#create-password').fill('password123');
      await page.getByRole('button', { name: /^create user$/i }).click();
      await expect(page.getByText(agentEmail)).toBeVisible({ timeout: 10000 });

      // 2. Click delete button (trash icon) for the created agent
      const userRow = page.locator('tr').filter({ hasText: agentEmail });
      const deleteBtn = userRow.getByRole('button', { name: `Delete ${agentName}` });
      await deleteBtn.click({ force: true });

      // 3. Verify confirmation modal appears with agent name
      const modal = page.getByTestId('delete-modal-backdrop');
      await expect(modal).toBeVisible();
      await expect(modal.getByRole('heading', { name: 'Delete User Account' })).toBeVisible();
      await expect(modal.getByText(agentName)).toBeVisible();

      // 4. Confirm deletion by clicking "Delete Account"
      await modal.getByRole('button', { name: /delete account/i }).click();

      // 5. Modal closes and deleted agent is removed from table
      await expect(modal).not.toBeVisible();
      await expect(page.getByText(agentEmail)).not.toBeVisible();
      await expect(page.getByText(agentName)).not.toBeVisible();
    });
  });

  // =========================================================================
  // 5. Full End-to-End CRUD Lifecycle Flow
  // =========================================================================
  test.describe('5. Full CRUD Lifecycle', () => {
    test('Complete CRUD cycle: Create -> Read -> Update -> Login verification -> Delete', async ({ page }) => {
      const timestamp = Date.now();
      const initialName = `Alex Mercer ${timestamp}`;
      const initialEmail = `alex.${timestamp}@example.com`;
      const initialPassword = 'initialSecret123';

      const updatedName = `Alexis Mercer ${timestamp}`;
      const updatedEmail = `alexis.${timestamp}@example.com`;
      const updatedPassword = 'updatedSecret123';

      // --- 1. CREATE ---
      await page.getByRole('button', { name: /add user/i }).click();
      await page.locator('input#create-name').fill(initialName);
      await page.locator('input#create-email').fill(initialEmail);
      await page.locator('input#create-password').fill(initialPassword);
      await page.getByRole('button', { name: /^create user$/i }).click();

      // --- 2. READ ---
      const initialRow = page.locator('tr').filter({ hasText: initialEmail });
      await expect(initialRow).toBeVisible({ timeout: 10000 });
      await expect(initialRow.getByText(initialName, { exact: true })).toBeVisible();
      await expect(initialRow.getByText('AGENT', { exact: true })).toBeVisible();

      // --- 3. UPDATE ---
      const editBtn = initialRow.getByRole('button', { name: `Edit ${initialName}` });
      await editBtn.click({ force: true });
      await expect(page.getByRole('heading', { name: 'Edit User' })).toBeVisible();

      await page.locator('input#create-name').fill(updatedName);
      await page.locator('input#create-email').fill(updatedEmail);
      await page.locator('input#create-password').fill(updatedPassword);
      await page.getByRole('button', { name: /^save changes$/i }).click();
      await expect(page.getByRole('heading', { name: 'Edit User' })).not.toBeVisible();

      // Verify updated user in table
      const updatedRow = page.locator('tr').filter({ hasText: updatedEmail });
      await expect(updatedRow).toBeVisible({ timeout: 10000 });
      await expect(updatedRow.getByText(updatedName, { exact: true })).toBeVisible();

      // --- 4. VERIFY LOGIN WITH UPDATED CREDENTIALS ---
      await signOutViaUI(page);
      await page.locator('input#email').fill(updatedEmail);
      await page.locator('input#password').fill(updatedPassword);
      await page.getByRole('button', { name: /sign in to workspace/i }).click();
      await expect(page.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeVisible({ timeout: 15000 });

      // --- 5. DELETE ---
      // Sign out and log back in as Admin to perform deletion
      await signOutViaUI(page);
      await loginViaUI(page, 'admin@example.com', 'password123');
      await navigateToUsersDirectory(page);

      const rowToDelete = page.locator('tr').filter({ hasText: updatedEmail });
      await expect(rowToDelete).toBeVisible({ timeout: 10000 });
      const deleteBtn = rowToDelete.getByRole('button', { name: `Delete ${updatedName}` });
      await deleteBtn.click({ force: true });

      const deleteModal = page.getByTestId('delete-modal-backdrop');
      await expect(deleteModal).toBeVisible();
      await deleteModal.getByRole('button', { name: /delete account/i }).click();

      // Verify removal from directory
      await expect(deleteModal).not.toBeVisible();
      await expect(page.getByText(updatedEmail)).not.toBeVisible();
    });
  });
});
