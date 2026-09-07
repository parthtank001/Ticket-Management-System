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
    it('renders the users header while fetching and ensures removed controls are absent', () => {
      vi.mocked(usersApi.listUsers).mockImplementation(() => new Promise(() => {}));

      renderWithQuery(<UsersPage user={mockCurrentUser} />);

      expect(screen.getByRole('heading', { name: /^users$/i })).toBeInTheDocument();

      // Controls that should NOT be present
      expect(screen.queryByRole('button', { name: /^all$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^admins$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^agents$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add user/i })).not.toBeInTheDocument();
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
});
