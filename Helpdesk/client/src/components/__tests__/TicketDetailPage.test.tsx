import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithQuery, screen, waitFor, userEvent } from '../../test/test-utils';
import { TicketDetailPage } from '../TicketDetailPage';
import { ticketsApi } from '../../lib/tickets-api';
import type { Ticket, TicketAgent } from '../../lib/types';
import { AuthUser } from '../../lib/auth-client';

vi.mock('../../lib/tickets-api', () => ({
  ticketsApi: {
    getTicket: vi.fn(),
    updateTicket: vi.fn(),
    addTicketMessage: vi.fn(),
    listAgents: vi.fn(),
  },
}));

describe('TicketDetailPage Component', () => {
  const handleNavigate = vi.fn();

  const mockUser: AuthUser = {
    id: 'agent-1',
    name: 'Agent Smith',
    email: 'smith@helpdesk.com',
    role: 'AGENT',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockAgents: TicketAgent[] = [
    { id: 'agent-1', name: 'Agent Smith', email: 'smith@helpdesk.com', role: 'AGENT' },
    { id: 'agent-2', name: 'Agent Jones', email: 'jones@helpdesk.com', role: 'AGENT' },
  ];

  const mockTicket: Ticket = {
    id: 42,
    ticketNumber: 42,
    subject: 'Cannot access laboratory server',
    studentName: 'Maya Lin',
    studentEmail: 'maya@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'HIGH',
    status: 'OPEN',
    summary: 'SSH connection timeout on port 22',
    aiDraftResponse: 'Please check your VPN status.',
    assignedAgentId: 'agent-1',
    assignedAgent: mockAgents[0],
    messages: [
      {
        id: 'msg-1',
        ticketId: 42,
        senderType: 'STUDENT',
        senderEmail: 'maya@student.edu',
        body: 'I get Connection Refused on ssh.cs.univ.edu',
        isInternalNote: false,
        createdAt: '2026-03-01T10:00:00.000Z',
      },
      {
        id: 'msg-2',
        ticketId: 42,
        senderType: 'AGENT',
        senderEmail: 'smith@helpdesk.com',
        body: 'Internal check: Firewall rule might be blocking subnet.',
        isInternalNote: true,
        createdAt: '2026-03-01T10:15:00.000Z',
      },
      {
        id: 'msg-3',
        ticketId: 42,
        senderType: 'AGENT',
        senderEmail: 'smith@helpdesk.com',
        body: 'Hi Maya, please reconnect to the campus VPN.',
        isInternalNote: false,
        createdAt: '2026-03-01T10:30:00.000Z',
      },
    ],
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:30:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ticketsApi.getTicket).mockResolvedValue(mockTicket);
    vi.mocked(ticketsApi.listAgents).mockResolvedValue(mockAgents);
  });

  describe('1. Initial Rendering & Details Display', () => {
    it('renders ticket details, subject heading, sender info, and badges', async () => {
      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Cannot access laboratory server' })).toBeInTheDocument();
      });

      expect(screen.getByText('Ticket #42')).toBeInTheDocument();
      expect(screen.getByText('Maya Lin')).toBeInTheDocument();
      expect(screen.getAllByText('maya@student.edu')[0]).toBeInTheDocument();

      // Badges
      expect(screen.getAllByText('Open').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(1);

      // Category and Assignee selectors
      expect(screen.getByDisplayValue('Technical Question')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Agent Smith (AGENT)')).toBeInTheDocument();
    });

    it('renders ticket details when ticket is passed directly as a prop', async () => {
      renderWithQuery(
        <TicketDetailPage ticket={mockTicket} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Cannot access laboratory server' })).toBeInTheDocument();
      });

      expect(screen.getByText('Ticket #42')).toBeInTheDocument();
      expect(screen.getByText('Maya Lin')).toBeInTheDocument();
    });

    it('renders the conversation thread with appropriate message roles', async () => {
      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByText('Conversation Thread (3)')).toBeInTheDocument();
      });

      expect(screen.getByText('Student')).toBeInTheDocument();
      expect(screen.getByText('I get Connection Refused on ssh.cs.univ.edu')).toBeInTheDocument();

      expect(screen.getByText('Internal Note')).toBeInTheDocument();
      expect(screen.getByText('Internal check: Firewall rule might be blocking subnet.')).toBeInTheDocument();

      expect(screen.getAllByText('Support Agent').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Hi Maya, please reconnect to the campus VPN.')).toBeInTheDocument();
    });
  });

  describe('2. Navigation Interactions', () => {
    it('invokes onNavigate with "/tickets" when clicking "Back to Tickets"', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to tickets/i })).toBeInTheDocument();
      });

      const backBtn = screen.getByRole('button', { name: /back to tickets/i });
      await user.click(backBtn);

      expect(handleNavigate).toHaveBeenCalledWith('/tickets');
    });
  });

  describe('3. Error & Loading States', () => {
    it('renders not found screen with return button when getTicket rejects', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.getTicket).mockRejectedValueOnce(new Error('Ticket not found'));

      renderWithQuery(
        <TicketDetailPage ticketId={999} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Ticket Not Found' })).toBeInTheDocument();
      });

      expect(
        screen.getByText(/the requested ticket #999 could not be found/i)
      ).toBeInTheDocument();

      const backBtn = screen.getByRole('button', { name: /back to tickets/i });
      await user.click(backBtn);
      expect(handleNavigate).toHaveBeenCalledWith('/tickets');
    });
  });

  describe('4. Status Quick Action Updates', () => {
    it('disables current status button and allows updating to Resolved', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        status: 'RESOLVED',
      });

      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^open$/i })).toBeInTheDocument();
      });

      const openBtn = screen.getByRole('button', { name: /^open$/i });
      const resolvedBtn = screen.getByRole('button', { name: /^resolved$/i });
      const closedBtn = screen.getByRole('button', { name: /^closed$/i });

      expect(openBtn).toBeDisabled();
      expect(resolvedBtn).toBeEnabled();
      expect(closedBtn).toBeEnabled();

      await user.click(resolvedBtn);

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          status: 'RESOLVED',
        });
      });
    });

    it('allows updating ticket status to Closed', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        status: 'CLOSED',
      });

      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^closed$/i })).toBeInTheDocument();
      });

      const closedBtn = screen.getByRole('button', { name: /^closed$/i });
      await user.click(closedBtn);

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          status: 'CLOSED',
        });
      });
    });

    it('displays error message banner when status update fails', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockRejectedValueOnce(
        new Error('Failed to change status due to server timeout')
      );

      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^resolved$/i })).toBeInTheDocument();
      });

      const resolvedBtn = screen.getByRole('button', { name: /^resolved$/i });
      await user.click(resolvedBtn);

      await waitFor(() => {
        expect(screen.getByText('Failed to change status due to server timeout')).toBeInTheDocument();
      });
    });
  });

  describe('5. Category & Assignee Modifications', () => {
    it('updates ticket category when selecting a different category', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        category: 'REFUND_REQUEST',
      });

      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Category selector')).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText('Category selector');
      await user.selectOptions(categorySelect, 'REFUND_REQUEST');

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          category: 'REFUND_REQUEST',
        });
      });
    });

    it('sets category to null when selecting Uncategorized', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        category: null,
      });

      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Category selector')).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText('Category selector');
      await user.selectOptions(categorySelect, '');

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          category: null,
        });
      });
    });

    it('displays error message banner when category update fails', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockRejectedValueOnce(
        new Error('Failed to update category')
      );

      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Category selector')).toBeInTheDocument();
      });

      const categorySelect = screen.getByLabelText('Category selector');
      await user.selectOptions(categorySelect, 'REFUND_REQUEST');

      await waitFor(() => {
        expect(screen.getByText('Failed to update category')).toBeInTheDocument();
      });
    });

    it('updates assigned agent when selecting a different agent', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        assignedAgentId: 'agent-2',
        assignedAgent: mockAgents[1],
      });

      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Assignee selector')).toBeInTheDocument();
      });

      const agentSelect = screen.getByLabelText('Assignee selector');
      await user.selectOptions(agentSelect, 'agent-2');

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          assignedAgentId: 'agent-2',
        });
      });
    });

    it('updates ticket priority when selecting a different priority', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        priority: 'URGENT',
      });

      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Priority selector')).toBeInTheDocument();
      });

      const prioritySelect = screen.getByLabelText('Priority selector');
      await user.selectOptions(prioritySelect, 'URGENT');

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          priority: 'URGENT',
        });
      });
    });
  });

  describe('6. Reply Composer', () => {
    it('submits a public reply to student and resets textarea upon success', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.addTicketMessage).mockResolvedValue({
        id: 'msg-4',
        ticketId: 42,
        senderType: 'AGENT',
        senderEmail: 'smith@helpdesk.com',
        body: 'Your port 22 access has been whitelist approved.',
        isInternalNote: false,
        createdAt: '2026-03-01T11:00:00.000Z',
      });

      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Write a reply to the student...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, 'Your port 22 access has been whitelist approved.');

      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      await user.click(sendBtn);

      await waitFor(() => {
        expect(ticketsApi.addTicketMessage).toHaveBeenCalledWith(42, {
          body: 'Your port 22 access has been whitelist approved.',
          senderType: 'AGENT',
          isInternalNote: false,
        });
      });

      expect(textarea).toHaveValue('');
    });



    it('clears reply body when clicking Clear button', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Write a reply to the student...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, 'Draft reply that will be cleared');
      expect(textarea).toHaveValue('Draft reply that will be cleared');

      const clearBtn = screen.getByRole('button', { name: /clear/i });
      await user.click(clearBtn);

      expect(textarea).toHaveValue('');
    });

    it('displays error banner when addTicketMessage mutation rejects', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.addTicketMessage).mockRejectedValueOnce(
        new Error('Network error: Failed to post message reply')
      );

      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Write a reply to the student...')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, 'Will fail to deliver');

      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      await user.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText('Network error: Failed to post message reply')).toBeInTheDocument();
      });
    });
  });
});
