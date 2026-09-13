import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersPage } from '../UsersPage';
import { renderWithQuery, screen, waitFor, userEvent } from '../../test/test-utils';
import { usersApi, ManagedUser } from '../../lib/users-api';
import { AuthUser } from '../../lib/auth-client';

// Mock usersApi service
vi.mock('../../lib/users-api', () => ({
  usersApi: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

describe('UsersPage Component', () => {
  const mockCurrentUser: AuthUser = {
    id: 'admin-1',
    name: 'Alice Admin',
    email: 'alice.admin@example.com',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  };

  const mockUsersList: ManagedUser[] = [
    {
      id: 'admin-1',
      name: 'Alice Admin',
      email: 'alice.admin@example.com',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-01-15T10:00:00.000Z',
    },
    {
      id: 'agent-2',
      name: 'Bob Agent',
      email: 'bob.agent@example.com',
      role: 'AGENT',
      isActive: true,
      createdAt: '2026-02-10T14:30:00.000Z',
      updatedAt: '2026-02-10T14:30:00.000Z',
    },
    {
      id: 'agent-3',
      name: 'Charlie Support',
      email: 'charlie@example.com',
      role: 'AGENT',
      isActive: true,
      createdAt: '2026-03-01T09:00:00.000Z',
      updatedAt: '2026-03-01T09:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Loading & Rendering', () => {
    it('renders the users header while fetching and ensures "Add User" button is present', () => {
      vi.mocked(usersApi.listUsers).mockImplementation(() => new Promise(() => {}));

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      expect(screen.getByRole('heading', { name: /^users$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();

      // Controls that should NOT be present
      expect(screen.queryByRole('button', { name: /^all$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^admins$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^agents$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/search by name or email/i)).not.toBeInTheDocument();
    });

    it('renders users list successfully with roles, emails, and "You" badge', async () => {
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      });

      expect(screen.getByText('Bob Agent')).toBeInTheDocument();
      expect(screen.getByText('Charlie Support')).toBeInTheDocument();
      expect(screen.getByText('alice.admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob.agent@example.com')).toBeInTheDocument();
      expect(screen.getByText('charlie@example.com')).toBeInTheDocument();

      // "You" badge should be displayed next to current user only
      const youBadges = screen.getAllByText('You');
      expect(youBadges).toHaveLength(1);

      // User count badge
      expect(screen.getByText('3 users')).toBeInTheDocument();

      // Role indicators
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
      expect(screen.getAllByText('AGENT')).toHaveLength(2);
    });

    it('renders empty state when no users are returned', async () => {
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce([]);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument();
      });

      expect(
        screen.getByText('There are no user records to display.')
      ).toBeInTheDocument();
    });

    it('renders error alert when API call fails', async () => {
      vi.mocked(usersApi.listUsers).mockRejectedValueOnce(new Error('Network connection error'));

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Network connection error')).toBeInTheDocument();
      });
    });
  });

  describe('Create User Modal & Workflows', () => {
    it('opens the create user modal when clicking "Add User"', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      });

      const addUserBtn = screen.getByRole('button', { name: /add user/i });
      await user.click(addUserBtn);

      expect(screen.getByRole('heading', { name: /add new user/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('hides the create user modal when clicking outside on the backdrop', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      });

      // 1. Open modal
      await user.click(screen.getByRole('button', { name: /add user/i }));
      expect(screen.getByRole('heading', { name: /add new user/i })).toBeInTheDocument();

      // 2. Click backdrop overlay outside dialog content
      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);

      // 3. Modal is hidden
      expect(screen.queryByRole('heading', { name: /add new user/i })).not.toBeInTheDocument();
    });

    it('does not hide the create user modal when clicking inside the dialog content', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      });

      // 1. Open modal
      await user.click(screen.getByRole('button', { name: /add user/i }));
      const heading = screen.getByRole('heading', { name: /add new user/i });
      expect(heading).toBeInTheDocument();

      // 2. Click inside modal content (e.g. heading or name input)
      await user.click(heading);
      await user.click(screen.getByLabelText(/full name/i));

      // 3. Modal remains open
      expect(screen.getByRole('heading', { name: /add new user/i })).toBeInTheDocument();
    });

    it('hides the create user modal when pressing the Escape (Esc) button', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      });

      // 1. Open modal
      await user.click(screen.getByRole('button', { name: /add user/i }));
      expect(screen.getByRole('heading', { name: /add new user/i })).toBeInTheDocument();

      // 2. Press Escape key
      await user.keyboard('{Escape}');

      // 3. Modal is hidden
      expect(screen.queryByRole('heading', { name: /add new user/i })).not.toBeInTheDocument();
    });

    it('validates required fields on form submission and displays error messages', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add user/i }));

      // Submit empty form
      const submitBtn = screen.getByRole('button', { name: /^create user$/i });
      await user.click(submitBtn);

      expect(screen.getByText('Name must be at least 3 characters long.')).toBeInTheDocument();
      expect(screen.getByText('A valid email address is required.')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 8 characters long.')).toBeInTheDocument();
      expect(usersApi.createUser).not.toHaveBeenCalled();
    });

    it('toggles password visibility when clicking the eye icon', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add user/i }));

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleBtn = screen.getByTitle('Show password');
      await user.click(toggleBtn);

      expect(passwordInput).toHaveAttribute('type', 'text');

      const hideToggleBtn = screen.getByTitle('Hide password');
      await user.click(hideToggleBtn);

      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('successfully creates a new agent user and closes the modal', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValue(mockUsersList);
      vi.mocked(usersApi.createUser).mockResolvedValueOnce({
        id: 'new-user-1',
        name: 'Diana Support',
        email: 'diana@example.com',
        role: 'AGENT',
        isActive: true,
        createdAt: '2026-09-07T12:00:00.000Z',
        updatedAt: '2026-09-07T12:00:00.000Z',
      });

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add user/i }));

      // Fill in user details
      await user.type(screen.getByLabelText(/full name/i), 'Diana Support');
      await user.type(screen.getByLabelText(/email address/i), 'diana@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Submit
      const submitBtn = screen.getByRole('button', { name: /^create user$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(usersApi.createUser).toHaveBeenCalledWith({
          name: 'Diana Support',
          email: 'diana@example.com',
          password: 'password123',
          role: 'AGENT',
          isActive: true,
        });
      });

      // Modal closes
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /add new user/i })).not.toBeInTheDocument();
      });
    });

    it('displays error message if user creation API fails (e.g. duplicate email)', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValue(mockUsersList);
      vi.mocked(usersApi.createUser).mockRejectedValueOnce(
        new Error('A user with this email address already exists.')
      );

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add user/i }));

      await user.type(screen.getByLabelText(/full name/i), 'Duplicate User');
      await user.type(screen.getByLabelText(/email address/i), 'alice.admin@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      const submitBtn = screen.getByRole('button', { name: /^create user$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText('A user with this email address already exists.')
        ).toBeInTheDocument();
      });

      // Modal stays open
      expect(screen.getByRole('heading', { name: /add new user/i })).toBeInTheDocument();
    });

    it('closes the modal and resets when clicking Cancel', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add user/i }));

      expect(screen.getByRole('heading', { name: /add new user/i })).toBeInTheDocument();

      const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
      await user.click(cancelBtn);

      expect(screen.queryByRole('heading', { name: /add new user/i })).not.toBeInTheDocument();
      expect(usersApi.createUser).not.toHaveBeenCalled();
    });
  });

  describe('Delete User Modal & Actions', () => {
    it('does not render delete button for current user but renders for other users', async () => {
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete user');
      // Should only have 2 delete buttons for Bob and Charlie (not Alice)
      expect(deleteButtons).toHaveLength(2);
    });

    it('does not render delete button for other admin accounts in the list', async () => {
      const listWithOtherAdmin: ManagedUser[] = [
        mockCurrentUser,
        {
          id: 'admin-2',
          name: 'Another Admin',
          email: 'admin2@example.com',
          role: 'ADMIN',
          isActive: true,
          createdAt: '2026-01-20T10:00:00.000Z',
          updatedAt: '2026-01-20T10:00:00.000Z',
        },
        {
          id: 'agent-2',
          name: 'Bob Agent',
          email: 'bob.agent@example.com',
          role: 'AGENT',
          isActive: true,
          createdAt: '2026-02-10T14:30:00.000Z',
          updatedAt: '2026-02-10T14:30:00.000Z',
        },
      ];
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(listWithOtherAdmin);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Another Admin')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete user');
      // Only 1 delete button for Bob Agent
      expect(deleteButtons).toHaveLength(1);
      expect(screen.queryByLabelText('Delete Alice Admin')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Delete Another Admin')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Delete Bob Agent')).toBeInTheDocument();
    });

    it('opens confirmation modal and cancels deletion', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Bob Agent')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete user');
      await user.click(deleteButtons[0]);

      expect(
        screen.getByRole('heading', { name: /delete user account/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/are you sure you want to delete/i)
      ).toBeInTheDocument();

      // Click Cancel
      const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
      await user.click(cancelBtn);

      expect(
        screen.queryByRole('heading', { name: /delete user account/i })
      ).not.toBeInTheDocument();
      expect(usersApi.deleteUser).not.toHaveBeenCalled();
    });

    it('hides delete confirmation modal when clicking outside on the backdrop', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Bob Agent')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete user');
      await user.click(deleteButtons[0]);

      expect(screen.getByRole('heading', { name: /delete user account/i })).toBeInTheDocument();

      // Click delete backdrop
      const backdrop = screen.getByTestId('delete-modal-backdrop');
      await user.click(backdrop);

      expect(screen.queryByRole('heading', { name: /delete user account/i })).not.toBeInTheDocument();
    });

    it('hides delete confirmation modal when pressing Escape key', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Bob Agent')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete user');
      await user.click(deleteButtons[0]);

      expect(screen.getByRole('heading', { name: /delete user account/i })).toBeInTheDocument();

      // Press Escape key
      await user.keyboard('{Escape}');

      expect(screen.queryByRole('heading', { name: /delete user account/i })).not.toBeInTheDocument();
    });

    it('confirms deletion and calls deleteUser mutation', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValue(mockUsersList);
      vi.mocked(usersApi.deleteUser).mockResolvedValueOnce({
        message: 'User deleted successfully',
        id: 'agent-2',
      });

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Bob Agent')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete user');
      await user.click(deleteButtons[0]);

      // Confirm Delete
      const confirmDeleteBtn = screen.getByRole('button', { name: /delete account/i });
      await user.click(confirmDeleteBtn);

      await waitFor(() => {
        expect(usersApi.deleteUser).toHaveBeenCalledWith('agent-2');
      });

      // Modal closes after deletion
      await waitFor(() => {
        expect(
          screen.queryByRole('heading', { name: /delete user account/i })
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Edit User Modal & Workflows', () => {
    it('opens edit modal pre-populated with user details when edit button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Bob Agent')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle('Edit user');
      // Click edit on Bob Agent (second user in list)
      await user.click(editButtons[1]);

      expect(screen.getByRole('heading', { name: /^edit user$/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toHaveValue('Bob Agent');
      expect(screen.getByLabelText(/email address/i)).toHaveValue('bob.agent@example.com');
      expect(screen.getByLabelText(/email address/i)).not.toBeDisabled();
      expect(screen.queryByLabelText(/role/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^save changes$/i })).toBeInTheDocument();
    });

    it('updates user successfully including email without password when leaving password field blank', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValue(mockUsersList);
      vi.mocked(usersApi.updateUser).mockResolvedValueOnce({
        id: 'agent-2',
        name: 'Bob Agent Updated',
        email: 'bob.agent.updated@example.com',
        role: 'AGENT',
        isActive: true,
        createdAt: '2026-02-10T14:30:00.000Z',
        updatedAt: '2026-09-09T12:00:00.000Z',
      });

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Bob Agent')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle('Edit user');
      await user.click(editButtons[1]);

      // Edit name & email
      const nameInput = screen.getByLabelText(/full name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Bob Agent Updated');

      const emailInput = screen.getByLabelText(/email address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'bob.agent.updated@example.com');

      const submitBtn = screen.getByRole('button', { name: /^save changes$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(usersApi.updateUser).toHaveBeenCalledWith('agent-2', {
          name: 'Bob Agent Updated',
          email: 'bob.agent.updated@example.com',
          role: 'AGENT',
          isActive: true,
        });
      });

      // Payload must not have password
      const updatePayload = vi.mocked(usersApi.updateUser).mock.calls[0];
      expect(updatePayload[1].password).toBeUndefined();

      // Modal closes
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /^edit user$/i })).not.toBeInTheDocument();
      });
    });

    it('updates user password when new password is provided in edit mode', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValue(mockUsersList);
      vi.mocked(usersApi.updateUser).mockResolvedValueOnce({
        id: 'agent-2',
        name: 'Bob Agent',
        email: 'bob.agent@example.com',
        role: 'AGENT',
        isActive: true,
        createdAt: '2026-02-10T14:30:00.000Z',
        updatedAt: '2026-09-09T12:00:00.000Z',
      });

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Bob Agent')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle('Edit user');
      await user.click(editButtons[1]);

      // Enter new password
      await user.type(screen.getByLabelText(/new password/i), 'newPassword123');

      const submitBtn = screen.getByRole('button', { name: /^save changes$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(usersApi.updateUser).toHaveBeenCalledWith('agent-2', {
          name: 'Bob Agent',
          email: 'bob.agent@example.com',
          role: 'AGENT',
          isActive: true,
          password: 'newPassword123',
        });
      });

      // Modal closes
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /^edit user$/i })).not.toBeInTheDocument();
      });
    });

    it('cancels edit and closes modal when Cancel is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsersList);

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Bob Agent')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByTitle('Edit user');
      await user.click(editButtons[1]);

      expect(screen.getByRole('heading', { name: /^edit user$/i })).toBeInTheDocument();

      const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
      await user.click(cancelBtn);

      expect(screen.queryByRole('heading', { name: /^edit user$/i })).not.toBeInTheDocument();
      expect(usersApi.updateUser).not.toHaveBeenCalled();
    });
  });
});
