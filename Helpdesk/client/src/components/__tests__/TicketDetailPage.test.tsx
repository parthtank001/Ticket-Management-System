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
      expect(screen.getByText('High')).toBeInTheDocument();

      // Category and Assignee selectors
      expect(screen.getByDisplayValue('Technical Question')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Agent Smith (AGENT)')).toBeInTheDocument();
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

      expect(screen.getByText('Support Agent')).toBeInTheDocument();
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
  });

  describe('6. Reply & Internal Note Composer', () => {
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
          isInternalNote: false,
        });
      });

      expect(textarea).toHaveValue('');
    });

    it('submits an internal note when checkbox is checked', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.addTicketMessage).mockResolvedValue({
        id: 'msg-5',
        ticketId: 42,
        senderType: 'AGENT',
        senderEmail: 'smith@helpdesk.com',
        body: 'Escalated to NetOps team on Slack.',
        isInternalNote: true,
        createdAt: '2026-03-01T11:05:00.000Z',
      });

      renderWithQuery(
        <TicketDetailPage ticketId={42} user={mockUser} onNavigate={handleNavigate} />
      );

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
      });

      const internalCheckbox = screen.getByRole('checkbox');
      await user.click(internalCheckbox);

      expect(screen.getByPlaceholderText('Write a private note visible only to support staff...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save note/i })).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText('Write a private note visible only to support staff...');
      await user.type(textarea, 'Escalated to NetOps team on Slack.');

      const saveNoteBtn = screen.getByRole('button', { name: /save note/i });
      await user.click(saveNoteBtn);

      await waitFor(() => {
        expect(ticketsApi.addTicketMessage).toHaveBeenCalledWith(42, {
          body: 'Escalated to NetOps team on Slack.',
          isInternalNote: true,
        });
      });

      expect(textarea).toHaveValue('');
    });
  });
});
