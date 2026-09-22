import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../LoginPage';
import { renderWithQuery } from '../../test/renderWithQuery';
import { authClient, AuthUser } from '../../lib/auth-client';

vi.mock('../../lib/auth-client', () => ({
  authClient: {
    signIn: vi.fn(),
    getSession: vi.fn(),
    signOut: vi.fn(),
  },
}));

describe('LoginPage Component Unit Tests', () => {
  const onLoginSuccess = vi.fn();

  const mockAdminUser: AuthUser = {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with header, fields, submit button, and demo shortcuts', () => {
    renderWithQuery(<LoginPage onLoginSuccess={onLoginSuccess} />);

    expect(screen.getByText('Helpdesk Platform')).toBeInTheDocument();
    expect(screen.getByText('Sign in to access your workspace')).toBeInTheDocument();
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in to workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /admin/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /agent/i })).toBeInTheDocument();
  });

  it('displays validation errors on empty form submission', async () => {
    const user = userEvent.setup();
    renderWithQuery(<LoginPage onLoginSuccess={onLoginSuccess} />);

    const submitBtn = screen.getByRole('button', { name: /sign in to workspace/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Email address is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
    expect(authClient.signIn).not.toHaveBeenCalled();
  });

  it('validates invalid email format and short password length', async () => {
    const user = userEvent.setup();
    renderWithQuery(<LoginPage onLoginSuccess={onLoginSuccess} />);

    const emailInput = screen.getByLabelText(/work email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, '123');

    const submitBtn = screen.getByRole('button', { name: /sign in to workspace/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('submits valid credentials and calls onLoginSuccess upon successful sign in', async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.signIn).mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
    });

    renderWithQuery(<LoginPage onLoginSuccess={onLoginSuccess} />);

    const emailInput = screen.getByLabelText(/work email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'admin@example.com');
    await user.type(passwordInput, 'password123');

    const submitBtn = screen.getByRole('button', { name: /sign in to workspace/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(authClient.signIn).toHaveBeenCalledWith('admin@example.com', 'password123');
      expect(onLoginSuccess).toHaveBeenCalledWith(mockAdminUser);
    });
  });

  it('displays error banner when authentication returns error', async () => {
    const user = userEvent.setup();
    vi.mocked(authClient.signIn).mockResolvedValueOnce({
      success: false,
      error: 'Invalid email or password.',
    });

    renderWithQuery(<LoginPage onLoginSuccess={onLoginSuccess} />);

    const emailInput = screen.getByLabelText(/work email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpassword');

    const submitBtn = screen.getByRole('button', { name: /sign in to workspace/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('populates fields when clicking Admin demo quick select button', async () => {
    const user = userEvent.setup();
    renderWithQuery(<LoginPage onLoginSuccess={onLoginSuccess} />);

    const adminQuickSelect = screen.getByRole('button', { name: /admin/i });
    await user.click(adminQuickSelect);

    const emailInput = screen.getByLabelText(/work email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toHaveValue('admin@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('populates fields when clicking Agent demo quick select button', async () => {
    const user = userEvent.setup();
    renderWithQuery(<LoginPage onLoginSuccess={onLoginSuccess} />);

    const agentQuickSelect = screen.getByRole('button', { name: /agent/i });
    await user.click(agentQuickSelect);

    const emailInput = screen.getByLabelText(/work email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    expect(emailInput).toHaveValue('agent@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('toggles password visibility when clicking eye button', async () => {
    const user = userEvent.setup();
    renderWithQuery(<LoginPage onLoginSuccess={onLoginSuccess} />);

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle button (sibling of password input)
    const toggleBtn = passwordInput.parentElement?.querySelector('button');
    expect(toggleBtn).toBeInTheDocument();

    await user.click(toggleBtn!);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(toggleBtn!);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
