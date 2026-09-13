import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from '../Navbar';
import { AuthUser } from '../../lib/auth-client';

describe('Navbar Component', () => {
  const mockAdminUser: AuthUser = {
    id: 'admin-1',
    name: 'Alice Admin',
    email: 'alice@helpdesk.com',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockAgentUser: AuthUser = {
    id: 'agent-1',
    name: 'Bob Agent',
    email: 'bob@helpdesk.com',
    role: 'AGENT',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('renders "Tickets" button for both Admin and Agent users', () => {
    const { rerender } = render(
      <Navbar
        user={mockAdminUser}
        currentPath="/"
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /tickets/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /users/i })).toBeInTheDocument();

    rerender(
      <Navbar
        user={mockAgentUser}
        currentPath="/"
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /tickets/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /users/i })).not.toBeInTheDocument();
  });

  it('highlights "Tickets" button when currentPath is "/" or "/tickets"', () => {
    const { rerender } = render(
      <Navbar
        user={mockAdminUser}
        currentPath="/"
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    const ticketsBtnRoot = screen.getByRole('button', { name: /tickets/i });
    expect(ticketsBtnRoot.className).toContain('bg-indigo-50');

    rerender(
      <Navbar
        user={mockAdminUser}
        currentPath="/tickets"
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    const ticketsBtnPath = screen.getByRole('button', { name: /tickets/i });
    expect(ticketsBtnPath.className).toContain('bg-indigo-50');

    rerender(
      <Navbar
        user={mockAdminUser}
        currentPath="/users"
        onNavigate={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    const ticketsBtnInactive = screen.getByRole('button', { name: /tickets/i });
    expect(ticketsBtnInactive.className).not.toContain('bg-indigo-50');
    const usersBtnActive = screen.getByRole('button', { name: /users/i });
    expect(usersBtnActive.className).toContain('bg-indigo-50');
  });

  it('calls onNavigate with "/" when Tickets button or Brand logo is clicked', async () => {
    const user = userEvent.setup();
    const handleNavigate = vi.fn();

    render(
      <Navbar
        user={mockAdminUser}
        currentPath="/users"
        onNavigate={handleNavigate}
        onSignOut={vi.fn()}
      />
    );

    const ticketsBtn = screen.getByRole('button', { name: /tickets/i });
    await user.click(ticketsBtn);
    expect(handleNavigate).toHaveBeenCalledWith('/');

    const brandLogo = screen.getByText('Helpdesk AI');
    await user.click(brandLogo);
    expect(handleNavigate).toHaveBeenCalledWith('/');
  });

  it('calls onNavigate with "/users" when Users button is clicked', async () => {
    const user = userEvent.setup();
    const handleNavigate = vi.fn();

    render(
      <Navbar
        user={mockAdminUser}
        currentPath="/"
        onNavigate={handleNavigate}
        onSignOut={vi.fn()}
      />
    );

    const usersBtn = screen.getByRole('button', { name: /users/i });
    await user.click(usersBtn);
    expect(handleNavigate).toHaveBeenCalledWith('/users');
  });

  it('calls onSignOut when Sign Out button is clicked', async () => {
    const user = userEvent.setup();
    const handleSignOut = vi.fn().mockResolvedValue(undefined);

    render(
      <Navbar
        user={mockAdminUser}
        currentPath="/"
        onNavigate={vi.fn()}
        onSignOut={handleSignOut}
      />
    );

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutBtn);
    expect(handleSignOut).toHaveBeenCalledTimes(1);
  });
});
