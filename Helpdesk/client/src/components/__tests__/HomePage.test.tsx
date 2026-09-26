import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from '../HomePage';
import { AuthUser } from '../../lib/auth-client';
import { renderWithQuery } from '../../test/renderWithQuery';
import { dashboardApi } from '../../lib/dashboard-api';
import type { DashboardStats, Ticket } from '../../lib/types';

vi.mock('../../lib/dashboard-api', () => ({
  dashboardApi: {
    getStats: vi.fn(),
  },
}));

describe('HomePage / Dashboard Component Unit Tests', () => {
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

  const mockRecentTicket: Ticket = {
    id: 101,
    subject: 'Cannot login to my portal',
    studentName: 'Alice Green',
    studentEmail: 'alice@example.com',
    body: 'My password reset email never arrived.',
    category: 'TECHNICAL_QUESTION',
    priority: 'HIGH',
    status: 'OPEN',
    summary: 'Password reset failure',
    aiDraftResponse: 'Hello Alice, please check your spam folder.',
    assignedAgentId: null,
    createdAt: '2026-09-20T10:00:00.000Z',
    updatedAt: '2026-09-20T10:05:00.000Z',
  };

  const mockStats: DashboardStats = {
    totalTickets: 42,
    openTickets: 10,
    resolvedTickets: 28,
    closedTickets: 4,
    aiResolvedTickets: 18,
    aiResolvedPercentage: 42.9,
    aiResolvedPercentageOfResolved: 56.3,
    humanResolvedTickets: 14,
    avgResolutionTimeMs: 180000,
    avgResolutionTimeFormatted: '3 mins',
    aiAvgResolutionTimeMs: 12000,
    aiAvgResolutionTimeFormatted: '12s',
    humanAvgResolutionTimeMs: 3600000,
    humanAvgResolutionTimeFormatted: '1.0 hrs',
    categoryBreakdown: {
      GENERAL_QUESTION: 20,
      TECHNICAL_QUESTION: 15,
      REFUND_REQUEST: 7,
      UNCATEGORIZED: 0,
    },
    priorityBreakdown: {
      LOW: 10,
      MEDIUM: 20,
      HIGH: 8,
      URGENT: 4,
    },
    statusBreakdown: {
      NEW: 2,
      PROCESSING: 1,
      OPEN: 7,
      RESOLVED: 28,
      CLOSED: 4,
    },
    ticketsPerDay: [
      { date: '2026-09-01', formattedDate: 'Sep 1', count: 2 },
      { date: '2026-09-02', formattedDate: 'Sep 2', count: 5 },
      { date: '2026-09-26', formattedDate: 'Sep 26', count: 8 },
    ],
    recentTickets: [mockRecentTicket],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 5 key metrics and 30-day volume trend bar chart', async () => {
    vi.mocked(dashboardApi.getStats).mockResolvedValueOnce(mockStats);

    renderWithQuery(<HomePage user={mockAdmin} />);

    // 1. Total Tickets
    expect(await screen.findByText('Total Tickets')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();

    // 2. Open Tickets
    expect(screen.getByText('Open Tickets')).toBeInTheDocument();
    expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);

    // 3. Resolved by AI
    expect(screen.getByText('Resolved by AI')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();

    // 4. % of Tickets Resolved by AI
    expect(screen.getByText('% Resolved by AI')).toBeInTheDocument();
    expect(screen.getByText('42.9%')).toBeInTheDocument();

    // 5. Average Resolution Time
    expect(screen.getByText('Avg Resolution Time')).toBeInTheDocument();
    expect(screen.getAllByText('3 mins').length).toBeGreaterThanOrEqual(1);

    // 6. 30-Day Bar Chart Section
    expect(screen.getByText(/Tickets Created Per Day/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily inbound volume distribution/i)).toBeInTheDocument();
  });

  it('navigates to /tickets when clicking the Total Tickets card', async () => {
    const user = userEvent.setup();
    const onNavigateMock = vi.fn();
    vi.mocked(dashboardApi.getStats).mockResolvedValueOnce(mockStats);

    renderWithQuery(<HomePage user={mockAdmin} onNavigate={onNavigateMock} />);

    const totalTicketsCard = (await screen.findByText('Total Tickets')).closest('div[class*="cursor-pointer"]');
    expect(totalTicketsCard).toBeInTheDocument();

    await user.click(totalTicketsCard!);
    expect(onNavigateMock).toHaveBeenCalledWith('/tickets');
  });

  it('navigates to /tickets when clicking the Open Tickets card', async () => {
    const user = userEvent.setup();
    const onNavigateMock = vi.fn();
    vi.mocked(dashboardApi.getStats).mockResolvedValueOnce(mockStats);

    renderWithQuery(<HomePage user={mockAdmin} onNavigate={onNavigateMock} />);

    const openTicketsCard = (await screen.findByText('Open Tickets')).closest('div[class*="cursor-pointer"]');
    expect(openTicketsCard).toBeInTheDocument();

    await user.click(openTicketsCard!);
    expect(onNavigateMock).toHaveBeenCalledWith('/tickets');
  });

  it('renders administrator workspace greeting for Admin role', async () => {
    vi.mocked(dashboardApi.getStats).mockResolvedValueOnce(mockStats);

    renderWithQuery(<HomePage user={mockAdmin} />);

    expect(await screen.findByText('Administrator Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Support Operations & AI Analytics')).toBeInTheDocument();
    expect(screen.getByText(/Logged in as/i)).toBeInTheDocument();
    expect(screen.getByText('Admin Sarah')).toBeInTheDocument();
  });

  it('renders agent workspace greeting for Agent role', async () => {
    vi.mocked(dashboardApi.getStats).mockResolvedValueOnce(mockStats);

    renderWithQuery(<HomePage user={mockAgent} />);

    expect(await screen.findByText('Support Agent Workspace')).toBeInTheDocument();
    expect(screen.getByText('Agent James')).toBeInTheDocument();
  });

  it('displays error banner and allows retry when dashboard API fails', async () => {
    const user = userEvent.setup();
    vi.mocked(dashboardApi.getStats).mockRejectedValueOnce(new Error('Network connection timeout'));

    renderWithQuery(<HomePage user={mockAdmin} />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Network connection timeout/i)).toBeInTheDocument();

    const retryButton = screen.getByText(/Click here to retry/i);
    expect(retryButton).toBeInTheDocument();

    vi.mocked(dashboardApi.getStats).mockResolvedValueOnce(mockStats);
    await user.click(retryButton);

    await waitFor(() => {
      expect(dashboardApi.getStats).toHaveBeenCalledTimes(2);
    });
  });
});
