import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from '../HomePage';
import { AuthUser } from '../../lib/auth-client';

describe('HomePage Component Unit Tests', () => {
  const mockAdmin: AuthUser = {
    id: 'admin-1',
    name: 'Admin Sarah',
    email: 'sarah@helpdesk.com',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockAgent: AuthUser = {
    id: 'agent-1',
    name: 'Agent James',
    email: 'james@helpdesk.com',
    role: 'AGENT',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('renders administrator workspace greeting and quick navigation cards for Admin role', () => {
    render(<HomePage user={mockAdmin} />);

    expect(screen.getByText('Administrator Workspace')).toBeInTheDocument();
    expect(screen.getByText('Welcome to the Helpdesk')).toBeInTheDocument();
    expect(screen.getByText(/Logged in as/i)).toBeInTheDocument();
    expect(screen.getByText('Admin Sarah')).toBeInTheDocument();
    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('Users Directory')).toBeInTheDocument();
  });

  it('renders agent workspace greeting and agent portal info tile for Agent role', () => {
    render(<HomePage user={mockAgent} />);

    expect(screen.getByText('Support Agent Workspace')).toBeInTheDocument();
    expect(screen.getByText('Agent James')).toBeInTheDocument();
    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('Agent Portal')).toBeInTheDocument();
    expect(screen.queryByText('Users Directory')).not.toBeInTheDocument();
  });

  it('navigates to /tickets when clicking the Tickets card', async () => {
    const user = userEvent.setup();
    const onNavigateMock = vi.fn();

    render(<HomePage user={mockAdmin} onNavigate={onNavigateMock} />);

    const ticketsCard = screen.getByText('Tickets').closest('div[class*="cursor-pointer"]');
    expect(ticketsCard).toBeInTheDocument();

    await user.click(ticketsCard!);
    expect(onNavigateMock).toHaveBeenCalledWith('/tickets');
  });

  it('navigates to /users when clicking the Users Directory card as Admin', async () => {
    const user = userEvent.setup();
    const onNavigateMock = vi.fn();

    render(<HomePage user={mockAdmin} onNavigate={onNavigateMock} />);

    const usersCard = screen.getByText('Users Directory').closest('div[class*="cursor-pointer"]');
    expect(usersCard).toBeInTheDocument();

    await user.click(usersCard!);
    expect(onNavigateMock).toHaveBeenCalledWith('/users');
  });
});
