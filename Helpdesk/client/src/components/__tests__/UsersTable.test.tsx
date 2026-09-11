import { describe, it, expect, vi } from 'vitest';
import { UsersTable } from '../UsersTable';
import { renderWithQuery, screen, userEvent } from '../../test/test-utils';
import { AuthUser } from '../../lib/auth-client';
import { ManagedUser } from '../../lib/users-api';
import { Role } from '../../lib/types';

describe('UsersTable Component', () => {
  const mockCurrentUser: AuthUser = {
    id: 'admin-1',
    name: 'Alice Admin',
    email: 'alice.admin@example.com',
    role: Role.ADMIN,
    isActive: true,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  };

  const mockUsersList: ManagedUser[] = [
    {
      id: 'admin-1',
      name: 'Alice Admin',
      email: 'alice.admin@example.com',
      role: Role.ADMIN,
      isActive: true,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-01-15T10:00:00.000Z',
    },
    {
      id: 'agent-2',
      name: 'Bob Agent',
      email: 'bob.agent@example.com',
      role: Role.AGENT,
      isActive: true,
      createdAt: '2026-02-10T14:30:00.000Z',
      updatedAt: '2026-02-10T14:30:00.000Z',
    },
  ];

  it('renders loading skeletons when isLoading is true', () => {
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();
    renderWithQuery(
      <UsersTable
        users={[]}
        currentUser={mockCurrentUser}
        isLoading={true}
        onEditUser={mockOnEdit}
        onDeleteUser={mockOnDelete}
      />
    );

    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /date created/i })).toBeInTheDocument();
  });

  it('renders empty state when users list is empty and not loading', () => {
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();
    renderWithQuery(
      <UsersTable
        users={[]}
        currentUser={mockCurrentUser}
        isLoading={false}
        onEditUser={mockOnEdit}
        onDeleteUser={mockOnDelete}
      />
    );

    expect(screen.getByText('No users found')).toBeInTheDocument();
    expect(screen.getByText('There are no user records to display.')).toBeInTheDocument();
  });

  it('renders users list with details, role badges, and "You" badge', () => {
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();
    renderWithQuery(
      <UsersTable
        users={mockUsersList}
        currentUser={mockCurrentUser}
        isLoading={false}
        onEditUser={mockOnEdit}
        onDeleteUser={mockOnDelete}
      />
    );

    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('Bob Agent')).toBeInTheDocument();
    expect(screen.getByText('alice.admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob.agent@example.com')).toBeInTheDocument();

    // "You" badge on Alice
    expect(screen.getByText('You')).toBeInTheDocument();

    // Roles
    expect(screen.getByText(Role.ADMIN)).toBeInTheDocument();
    expect(screen.getByText(Role.AGENT)).toBeInTheDocument();
  });

  it('calls onEditUser when edit button is clicked for any user row', async () => {
    const user = userEvent.setup();
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();
    renderWithQuery(
      <UsersTable
        users={mockUsersList}
        currentUser={mockCurrentUser}
        isLoading={false}
        onEditUser={mockOnEdit}
        onDeleteUser={mockOnDelete}
      />
    );

    const editButtons = screen.getAllByTitle('Edit user');
    // Edit button should be present for both users
    expect(editButtons).toHaveLength(2);

    await user.click(editButtons[0]);
    expect(mockOnEdit).toHaveBeenCalledWith(mockUsersList[0]);

    await user.click(editButtons[1]);
    expect(mockOnEdit).toHaveBeenCalledWith(mockUsersList[1]);
  });

  it('calls onDeleteUser when delete button for other user is clicked', async () => {
    const user = userEvent.setup();
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();
    renderWithQuery(
      <UsersTable
        users={mockUsersList}
        currentUser={mockCurrentUser}
        isLoading={false}
        onEditUser={mockOnEdit}
        onDeleteUser={mockOnDelete}
      />
    );

    const deleteButtons = screen.getAllByTitle('Delete user');
    // Only 1 delete button (for Bob, not Alice)
    expect(deleteButtons).toHaveLength(1);

    await user.click(deleteButtons[0]);
    expect(mockOnDelete).toHaveBeenCalledWith({ id: 'agent-2', name: 'Bob Agent' });
  });

  it('does not display delete button for any admin accounts', () => {
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();
    const usersWithMultipleAdmins: ManagedUser[] = [
      mockCurrentUser,
      {
        id: 'admin-2',
        name: 'Second Admin',
        email: 'admin2@example.com',
        role: Role.ADMIN,
        isActive: true,
        createdAt: '2026-01-20T10:00:00.000Z',
        updatedAt: '2026-01-20T10:00:00.000Z',
      },
      {
        id: 'agent-1',
        name: 'Agent User',
        email: 'agent@example.com',
        role: Role.AGENT,
        isActive: true,
        createdAt: '2026-02-01T10:00:00.000Z',
        updatedAt: '2026-02-01T10:00:00.000Z',
      },
    ];

    renderWithQuery(
      <UsersTable
        users={usersWithMultipleAdmins}
        currentUser={mockCurrentUser}
        isLoading={false}
        onEditUser={mockOnEdit}
        onDeleteUser={mockOnDelete}
      />
    );

    // Only agent-1 should have a delete button; neither admin-1 nor admin-2 should have one
    const deleteButtons = screen.getAllByTitle('Delete user');
    expect(deleteButtons).toHaveLength(1);
    expect(screen.queryByLabelText('Delete Alice Admin')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete Second Admin')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Delete Agent User')).toBeInTheDocument();
  });
});
