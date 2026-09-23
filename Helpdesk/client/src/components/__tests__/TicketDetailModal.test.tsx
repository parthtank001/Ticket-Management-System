import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithQuery, screen, waitFor, userEvent } from '../../test/test-utils';
import { TicketDetailModal } from '../TicketDetailModal';
import { ticketsApi } from '../../lib/tickets-api';
import type { Ticket, TicketAgent } from '../../lib/types';

vi.mock('../../lib/tickets-api', () => ({
  ticketsApi: {
    updateTicket: vi.fn(),
    addTicketMessage: vi.fn(),
    listAgents: vi.fn(),
    summarizeTicket: vi.fn(),
  },
}));

describe('TicketDetailModal Component', () => {
  const handleClose = vi.fn();

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
    body: '',
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
    vi.mocked(ticketsApi.listAgents).mockResolvedValue(mockAgents);
  });

  describe('1. Dialog Visibility & Details Rendering', () => {
    it('does not render modal when isOpen is false', () => {
      renderWithQuery(
        <TicketDetailModal ticket={mockTicket} isOpen={false} onClose={handleClose} />
      );

      expect(screen.queryByText(/ticket #42/i)).not.toBeInTheDocument();
    });

    it('does not render modal when ticket is null', () => {
      renderWithQuery(
        <TicketDetailModal ticket={null} isOpen={true} onClose={handleClose} />
      );

      expect(screen.queryByText(/ticket #/i)).not.toBeInTheDocument();
    });

    it('renders ticket header, metadata, badges, and agent options when open', async () => {
      renderWithQuery(
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

      expect(screen.getByText('Ticket #42')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Cannot access laboratory server' })).toBeInTheDocument();
      expect(screen.getByText('Maya Lin')).toBeInTheDocument();
      expect(screen.getAllByText('maya@student.edu')[0]).toBeInTheDocument();

      // Badges
      expect(screen.getAllByText('Open').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(1);

      // Category and Assignee selectors
      expect(screen.getByDisplayValue('Technical Question')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByDisplayValue('Agent Smith (AGENT)')).toBeInTheDocument();
      });
    });

    it('invokes onClose when clicking the close buttons', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

      const headerCloseBtn = screen.getByTitle('Close modal');
      await user.click(headerCloseBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      const footerCloseBtn = screen.getByRole('button', { name: /^close$/i });
      await user.click(footerCloseBtn);
      expect(handleClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('2. Status Quick Action Updates', () => {
    it('disables current status button and allows updating to Resolved', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        status: 'RESOLVED',
      });

      renderWithQuery(
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

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
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

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
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

      const resolvedBtn = screen.getByRole('button', { name: /^resolved$/i });
      await user.click(resolvedBtn);

      await waitFor(() => {
        expect(screen.getByText('Failed to change status due to server timeout')).toBeInTheDocument();
      });
    });
  });

  describe('3. Category & Assignee Modifications', () => {
    it('updates ticket category when a different option is selected', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        category: 'REFUND_REQUEST',
      });

      renderWithQuery(
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

      const categorySelect = screen.getByDisplayValue('Technical Question');
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
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

      const categorySelect = screen.getByDisplayValue('Technical Question');
      await user.selectOptions(categorySelect, '');

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          category: null,
        });
      });
    });

    it('updates assigned agent when selecting another agent', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        assignedAgentId: 'agent-2',
        assignedAgent: mockAgents[1],
      });

      renderWithQuery(
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Agent Smith (AGENT)')).toBeInTheDocument();
      });

      const agentSelect = screen.getByDisplayValue('Agent Smith (AGENT)');
      await user.selectOptions(agentSelect, 'agent-2');

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          assignedAgentId: 'agent-2',
        });
      });
    });

    it('sets assigned agent to null when selecting Unassigned', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        assignedAgentId: null,
        assignedAgent: null,
      });

      renderWithQuery(
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Agent Smith (AGENT)')).toBeInTheDocument();
      });

      const agentSelect = screen.getByDisplayValue('Agent Smith (AGENT)');
      await user.selectOptions(agentSelect, '');

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          assignedAgentId: null,
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
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

      const prioritySelect = screen.getByLabelText('Priority selector');
      await user.selectOptions(prioritySelect, 'URGENT');

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          priority: 'URGENT',
        });
      });
    });
  });

  describe('4. Conversation Thread Display', () => {
    it('renders all messages with proper role badges (Student, Internal Note, Support Agent)', () => {
      renderWithQuery(
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

      expect(screen.getByText('Conversation Thread (3)')).toBeInTheDocument();

      // Verify Student message
      expect(screen.getByText('Student')).toBeInTheDocument();
      expect(screen.getByText('I get Connection Refused on ssh.cs.univ.edu')).toBeInTheDocument();

      // Verify Internal Note
      expect(screen.getByText('Internal Note')).toBeInTheDocument();
      expect(screen.getByText('Internal check: Firewall rule might be blocking subnet.')).toBeInTheDocument();

      // Verify Agent reply
      expect(screen.getAllByText('Support Agent').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Hi Maya, please reconnect to the campus VPN.')).toBeInTheDocument();
    });

    it('renders empty message notification when ticket has no messages', () => {
      const emptyTicket: Ticket = {
        ...mockTicket,
        messages: [],
      };

      renderWithQuery(
        <TicketDetailModal ticket={emptyTicket} isOpen={true} onClose={handleClose} />
      );

      expect(screen.getByText('Conversation Thread (0)')).toBeInTheDocument();
      expect(screen.getByText('No messages in thread yet.')).toBeInTheDocument();
    });
  });

  describe('5. Reply Composer', () => {
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
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

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



    it('displays error banner if addTicketMessage mutation rejects', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.addTicketMessage).mockRejectedValueOnce(
        new Error('Failed to send message: Server error 500')
      );

      renderWithQuery(
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, 'Attempted reply');

      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      await user.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText('Failed to send message: Server error 500')).toBeInTheDocument();
      });
    });
  });

  describe('6. AI Summary & Conversation History Card Integration', () => {
    it('renders the AI summary card and re-generates summary on button click', async () => {
      const user = userEvent.setup();
      const newSummary = '• Initial Issue: SSH port 22 blocked\n• Actions: Firewall unblocked\n• Status: Open';
      vi.mocked(ticketsApi.summarizeTicket).mockResolvedValueOnce({
        summary: newSummary,
        ticket: { ...mockTicket, summary: newSummary },
      });

      renderWithQuery(
        <TicketDetailModal ticket={mockTicket} isOpen={true} onClose={handleClose} />
      );

      expect(screen.getByRole('button', { name: /summarize ticket/i })).toBeInTheDocument();
      expect(screen.getByText(/AI Summary & Conversation History/i)).toBeInTheDocument();
      expect(screen.getByText('SSH connection timeout on port 22')).toBeInTheDocument();

      const summarizeBtn = screen.getByRole('button', { name: /summarize ticket/i });
      await user.click(summarizeBtn);

      expect(ticketsApi.summarizeTicket).toHaveBeenCalledWith(42);
    });
  });
});
