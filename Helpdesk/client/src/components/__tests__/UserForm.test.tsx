import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserForm } from '../UserForm';
import { renderWithQuery, screen, waitFor, userEvent } from '../../test/test-utils';
import { usersApi } from '../../lib/users-api';
import { Role } from '../../lib/types';

// Mock usersApi service
vi.mock('../../lib/users-api', () => ({
  usersApi: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

describe('UserForm Component (Create User Form)', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Dialog Visibility & Rendering', () => {
    it('does not render anything when isOpen is false', () => {
      renderWithQuery(
        <UserForm isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /add new user/i })).not.toBeInTheDocument();
    });

    it('renders modal dialog with header, instructions, and inputs when isOpen is true', () => {
      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Dialog container & modal header
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /add new user/i })).toBeInTheDocument();
      expect(screen.getByText(/create a new user account with role permissions/i)).toBeInTheDocument();

      // Form inputs and labels
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/abc\.@example\.com/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByText(/min\. 8 characters/i)).toBeInTheDocument();

      // Role should not be present in form
      expect(screen.queryByLabelText(/role/i)).not.toBeInTheDocument();

      // Form action buttons
      expect(screen.getByRole('button', { name: /^create user$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
      expect(screen.getByTitle('Close')).toBeInTheDocument();
    });
  });

  describe('2. Form Validation Rules (Zod Schema)', () => {
    it('validates and displays error messages on empty form submission', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const submitBtn = screen.getByRole('button', { name: /^create user$/i });
      await user.click(submitBtn);

      expect(screen.getByText('Name must be at least 3 characters long.')).toBeInTheDocument();
      expect(screen.getByText('A valid email address is required.')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 8 characters long.')).toBeInTheDocument();
      expect(usersApi.createUser).not.toHaveBeenCalled();

      // Ensure invalid inputs receive aria-invalid="true"
      expect(screen.getByLabelText(/full name/i)).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('aria-invalid', 'true');
    });

    it('rejects names shorter than 3 characters', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      await user.type(screen.getByLabelText(/full name/i), 'Jo');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');

      const submitBtn = screen.getByRole('button', { name: /^create user$/i });
      await user.click(submitBtn);

      expect(screen.getByText('Name must be at least 3 characters long.')).toBeInTheDocument();
      expect(screen.queryByText('A valid email address is required.')).not.toBeInTheDocument();
      expect(screen.queryByText('Password must be at least 8 characters long.')).not.toBeInTheDocument();
      expect(usersApi.createUser).not.toHaveBeenCalled();
    });

    it('rejects invalid email formats', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'invalid-email-address');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');

      const submitBtn = screen.getByRole('button', { name: /^create user$/i });
      await user.click(submitBtn);

      expect(screen.getByText('A valid email address is required.')).toBeInTheDocument();
      expect(screen.queryByText('Name must be at least 3 characters long.')).not.toBeInTheDocument();
      expect(usersApi.createUser).not.toHaveBeenCalled();
    });

    it('rejects passwords shorter than 8 characters', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'pass123'); // 7 characters

      const submitBtn = screen.getByRole('button', { name: /^create user$/i });
      await user.click(submitBtn);

      expect(screen.getByText('Password must be at least 8 characters long.')).toBeInTheDocument();
      expect(usersApi.createUser).not.toHaveBeenCalled();
    });

    it('rejects passwords containing blank space or whitespace characters', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'pass word123');

      const submitBtn = screen.getByRole('button', { name: /^create user$/i });
      await user.click(submitBtn);

      expect(screen.getByText('Password must not contain spaces.')).toBeInTheDocument();
      expect(usersApi.createUser).not.toHaveBeenCalled();
    });
  });

  describe('3. Password Field Interactions', () => {
    it('toggles password visibility between masked and plain text when clicking eye button', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click "Show password"
      const showPasswordBtn = screen.getByTitle('Show password');
      await user.click(showPasswordBtn);

      expect(passwordInput).toHaveAttribute('type', 'text');

      // Click "Hide password"
      const hidePasswordBtn = screen.getByTitle('Hide password');
      await user.click(hidePasswordBtn);

      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('4. User Creation Submission Workflow', () => {
    it('submits valid data, trims whitespace, invokes callbacks, and closes modal', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.createUser).mockResolvedValueOnce({
        id: 'new-agent-123',
        name: 'Diana Prince',
        email: 'diana.prince@example.com',
        role: Role.AGENT,
        isActive: true,
        createdAt: '2026-09-09T10:00:00.000Z',
        updatedAt: '2026-09-09T10:00:00.000Z',
      });

      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      // Fill in form with extra whitespace to verify trimming
      await user.type(screen.getByLabelText(/full name/i), '  Diana Prince  ');
      await user.type(screen.getByLabelText(/email address/i), '  Diana.Prince@Example.com  ');
      await user.type(screen.getByLabelText(/^password$/i), 'securePassword123');

      const submitBtn = screen.getByRole('button', { name: /^create user$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(usersApi.createUser).toHaveBeenCalledWith({
          name: 'Diana Prince',
          email: 'diana.prince@example.com',
          password: 'securePassword123',
          role: Role.AGENT,
          isActive: true,
        });
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('displays error banner when user creation API fails (e.g. duplicate email)', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.createUser).mockRejectedValueOnce(
        new Error('A user with this email address already exists.')
      );

      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      await user.type(screen.getByLabelText(/full name/i), 'Existing User');
      await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');

      const submitBtn = screen.getByRole('button', { name: /^create user$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText('A user with this email address already exists.')
        ).toBeInTheDocument();
      });

      // Modal stays open so user can edit their inputs
      expect(screen.getByRole('heading', { name: /add new user/i })).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('displays fallback error message when API rejects without error message', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.createUser).mockRejectedValueOnce({});

      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      await user.type(screen.getByLabelText(/full name/i), 'Test User');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'password123');

      const submitBtn = screen.getByRole('button', { name: /^create user$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Failed to create user account.')).toBeInTheDocument();
      });
    });
  });

  describe('5. Modal Dismissal & Accessibility Workflows', () => {
    it('calls onClose and resets form when clicking the Cancel button', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
      await user.click(cancelBtn);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(usersApi.createUser).not.toHaveBeenCalled();
    });

    it('calls onClose when clicking the close (X) button in header', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const closeIconBtn = screen.getByTitle('Close');
      await user.click(closeIconBtn);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(usersApi.createUser).not.toHaveBeenCalled();
    });

    it('calls onClose when clicking outside on the backdrop overlay', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside the modal content box', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const modalHeading = screen.getByRole('heading', { name: /add new user/i });
      await user.click(modalHeading);

      const nameInput = screen.getByLabelText(/full name/i);
      await user.click(nameInput);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('calls onClose when pressing the Escape (Esc) key', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. Edit User Mode & Password Handling', () => {
    const existingUser = {
      id: 'agent-123',
      name: 'Bob Smith',
      email: 'bob.smith@example.com',
      role: Role.AGENT,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    it('renders edit modal with pre-populated user data, editable email, and "Save Changes" button', () => {
      renderWithQuery(
        <UserForm
          isOpen={true}
          userToEdit={existingUser}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByRole('heading', { name: /^edit user$/i })).toBeInTheDocument();
      expect(screen.getByText('Update user account details and permissions.')).toBeInTheDocument();

      // Name pre-populated
      expect(screen.getByLabelText(/full name/i)).toHaveValue('Bob Smith');

      // Email pre-populated and editable (enabled)
      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveValue('bob.smith@example.com');
      expect(emailInput).not.toBeDisabled();
      expect(screen.queryByText('Cannot be changed')).not.toBeInTheDocument();

      // Password empty with placeholder indicating optional
      expect(screen.getByLabelText(/new password/i)).toHaveValue('');
      expect(screen.getByText('Leave blank to keep current')).toBeInTheDocument();

      // Role dropdown should not be present
      expect(screen.queryByLabelText(/role/i)).not.toBeInTheDocument();

      // Submit button text
      expect(screen.getByRole('button', { name: /^save changes$/i })).toBeInTheDocument();
    });

    it('submits updated user data including modified email without password when password field is left empty', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.updateUser).mockResolvedValueOnce({
        ...existingUser,
        name: 'Bob Updated',
        email: 'bob.updated@example.com',
      });

      renderWithQuery(
        <UserForm
          isOpen={true}
          userToEdit={existingUser}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText(/full name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Bob Updated');

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'bob.updated@example.com');

      const submitBtn = screen.getByRole('button', { name: /^save changes$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(usersApi.updateUser).toHaveBeenCalledWith('agent-123', {
          name: 'Bob Updated',
          email: 'bob.updated@example.com',
          role: Role.AGENT,
          isActive: true,
        });
      });

      // Password should NOT be in the payload
      const callArgs = vi.mocked(usersApi.updateUser).mock.calls[0];
      expect(callArgs[1].password).toBeUndefined();

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('submits updated user data with new password when a valid password is provided', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.updateUser).mockResolvedValueOnce({
        ...existingUser,
        name: 'Bob Smith',
      });

      renderWithQuery(
        <UserForm
          isOpen={true}
          userToEdit={existingUser}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      await user.type(screen.getByLabelText(/new password/i), 'NewSecretPassword123');

      const submitBtn = screen.getByRole('button', { name: /^save changes$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(usersApi.updateUser).toHaveBeenCalledWith('agent-123', {
          name: 'Bob Smith',
          email: 'bob.smith@example.com',
          role: Role.AGENT,
          isActive: true,
          password: 'NewSecretPassword123',
        });
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('rejects invalid email formats in edit mode', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm
          isOpen={true}
          userToEdit={existingUser}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      const submitBtn = screen.getByRole('button', { name: /^save changes$/i });
      await user.click(submitBtn);

      expect(screen.getByText('A valid email address is required.')).toBeInTheDocument();
      expect(usersApi.updateUser).not.toHaveBeenCalled();
    });

    it('rejects passwords shorter than 8 characters in edit mode', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm
          isOpen={true}
          userToEdit={existingUser}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      await user.type(screen.getByLabelText(/new password/i), 'short7');

      const submitBtn = screen.getByRole('button', { name: /^save changes$/i });
      await user.click(submitBtn);

      expect(screen.getByText('Password must be at least 8 characters long.')).toBeInTheDocument();
      expect(usersApi.updateUser).not.toHaveBeenCalled();
    });

    it('rejects passwords containing spaces in edit mode', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <UserForm
          isOpen={true}
          userToEdit={existingUser}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      await user.type(screen.getByLabelText(/new password/i), 'pass word 123');

      const submitBtn = screen.getByRole('button', { name: /^save changes$/i });
      await user.click(submitBtn);

      expect(screen.getByText('Password must not contain spaces.')).toBeInTheDocument();
      expect(usersApi.updateUser).not.toHaveBeenCalled();
    });

    it('displays error banner when user update API fails', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.updateUser).mockRejectedValueOnce(
        new Error('Failed to update user in database.')
      );

      renderWithQuery(
        <UserForm
          isOpen={true}
          userToEdit={existingUser}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitBtn = screen.getByRole('button', { name: /^save changes$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Failed to update user in database.')).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });
});
