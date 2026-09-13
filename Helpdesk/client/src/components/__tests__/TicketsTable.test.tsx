import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketsTable } from '../TicketsTable';
import type { Ticket } from '../../lib/types';

describe('TicketsTable Component', () => {
  const mockTickets: Ticket[] = [
    {
      id: 101,
      ticketNumber: 101,
      subject: 'VPN Connection Lost',
      studentName: 'John Doe',
      studentEmail: 'john@uni.edu',
      category: 'TECHNICAL_QUESTION',
      priority: 'HIGH',
      status: 'OPEN',
      summary: 'Student lost VPN connection',
      aiDraftResponse: null,
      assignedAgentId: 'agent-1',
      assignedAgent: {
        id: 'agent-1',
        name: 'Jane Support',
        email: 'jane@helpdesk.com',
        role: 'AGENT',
      },
      messages: [
        {
          id: 'msg-1',
          ticketId: 101,
          senderType: 'STUDENT',
          senderEmail: 'john@uni.edu',
          body: 'Cannot reach the internal network.',
          isInternalNote: false,
          createdAt: '2026-03-01T12:00:00.000Z',
        },
      ],
      createdAt: '2026-03-01T12:00:00.000Z',
      updatedAt: '2026-03-01T12:00:00.000Z',
    },
    {
      id: 102,
      ticketNumber: 102,
      subject: 'Scholarship Document Inquiry',
      studentName: 'Sarah Connor',
      studentEmail: 'sarah@uni.edu',
      category: 'REFUND_REQUEST',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      summary: null,
      aiDraftResponse: null,
      assignedAgentId: null,
      assignedAgent: null,
      messages: [],
      createdAt: '2026-03-02T15:30:00.000Z',
      updatedAt: '2026-03-02T15:30:00.000Z',
    },
  ];

  it('renders loading skeletons when isLoading is true', () => {
    const { container } = render(
      <TicketsTable tickets={[]} isLoading={true} onSelectTicket={vi.fn()} />
    );

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no tickets are provided', () => {
    render(<TicketsTable tickets={[]} isLoading={false} onSelectTicket={vi.fn()} />);

    expect(screen.getByText('No Tickets Found')).toBeInTheDocument();
    expect(
      screen.getByText(/no tickets match your search filters, or no support inquiries have been submitted yet/i)
    ).toBeInTheDocument();
  });

  it('renders ticket table headers and rows accurately', () => {
    render(
      <TicketsTable
        tickets={mockTickets}
        isLoading={false}
        onSelectTicket={vi.fn()}
      />
    );

    expect(screen.getByText('#101')).toBeInTheDocument();
    expect(screen.getByText('VPN Connection Lost')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@uni.edu')).toBeInTheDocument();
    expect(screen.getByText('Jane Support')).toBeInTheDocument();

    expect(screen.getByText('#102')).toBeInTheDocument();
    expect(screen.getByText('Scholarship Document Inquiry')).toBeInTheDocument();
    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.getByText('sarah@uni.edu')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('invokes onSelectTicket when a ticket row is clicked', async () => {
    const user = userEvent.setup();
    const handleSelectTicket = vi.fn();

    render(
      <TicketsTable
        tickets={mockTickets}
        isLoading={false}
        onSelectTicket={handleSelectTicket}
      />
    );

    const ticketRow = screen.getByText('VPN Connection Lost').closest('tr');
    expect(ticketRow).not.toBeNull();
    if (ticketRow) {
      await user.click(ticketRow);
    }

    expect(handleSelectTicket).toHaveBeenCalledTimes(1);
    expect(handleSelectTicket).toHaveBeenCalledWith(mockTickets[0]);
  });
});
