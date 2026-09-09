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

describe('UserForm Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render anything when isOpen is false', () => {
    renderWithQuery(
      <UserForm isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    expect(screen.queryByRole('heading', { name: /add new user/i })).not.toBeInTheDocument();
  });

  it('renders modal header and form inputs when isOpen is true', () => {
    renderWithQuery(
      <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    expect(screen.getByRole('heading', { name: /add new user/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^create user$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('validates required fields on submit with empty inputs', async () => {
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
  });

  it('toggles password visibility between text and password types', async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByTitle('Show password');
    await user.click(toggleBtn);

    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideToggleBtn = screen.getByTitle('Hide password');
    await user.click(hideToggleBtn);

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('submits form successfully and calls onSuccess and onClose', async () => {
    const user = userEvent.setup();
    vi.mocked(usersApi.createUser).mockResolvedValueOnce({
      id: 'new-user-1',
      name: 'Diana Support',
      email: 'diana@example.com',
      role: Role.AGENT,
      isActive: true,
      createdAt: '2026-09-07T12:00:00.000Z',
      updatedAt: '2026-09-07T12:00:00.000Z',
    });

    renderWithQuery(
      <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    await user.type(screen.getByLabelText(/full name/i), 'Diana Support');
    await user.type(screen.getByLabelText(/email address/i), 'diana@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    const submitBtn = screen.getByRole('button', { name: /^create user$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(usersApi.createUser).toHaveBeenCalledWith({
        name: 'Diana Support',
        email: 'diana@example.com',
        password: 'password123',
        role: Role.AGENT,
        isActive: true,
      });
    });

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('displays error banner when user creation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(usersApi.createUser).mockRejectedValueOnce(
      new Error('A user with this email address already exists.')
    );

    renderWithQuery(
      <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    await user.type(screen.getByLabelText(/full name/i), 'Duplicate User');
    await user.type(screen.getByLabelText(/email address/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    const submitBtn = screen.getByRole('button', { name: /^create user$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('A user with this email address already exists.')
      ).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking Cancel button', async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
    await user.click(cancelBtn);

    expect(mockOnClose).toHaveBeenCalled();
    expect(usersApi.createUser).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking Close icon button', async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <UserForm isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    const closeIconBtn = screen.getByTitle('Close');
    await user.click(closeIconBtn);

    expect(mockOnClose).toHaveBeenCalled();
    expect(usersApi.createUser).not.toHaveBeenCalled();
  });
});
