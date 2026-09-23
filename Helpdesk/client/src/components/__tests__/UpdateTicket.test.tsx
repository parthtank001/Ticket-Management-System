import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithQuery, screen, waitFor, userEvent } from '../../test/test-utils';
import { UpdateTicket } from '../UpdateTicket';
import { ticketsApi } from '../../lib/tickets-api';
import type { Ticket, TicketAgent } from '../../lib/types';

vi.mock('../../lib/tickets-api', () => ({
  ticketsApi: {
    updateTicket: vi.fn(),
    listAgents: vi.fn(),
  },
}));

describe('UpdateTicket Component', () => {
  const mockOnError = vi.fn();

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
    body: 'SSH connection timeout on port 22',
    category: 'TECHNICAL_QUESTION',
    priority: 'HIGH',
    status: 'OPEN',
    summary: 'SSH connection timeout on port 22',
    aiDraftResponse: 'Please check your VPN status.',
    assignedAgentId: 'agent-1',
    assignedAgent: mockAgents[0],
    messages: [],
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:30:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ticketsApi.listAgents).mockResolvedValue(mockAgents);
  });

  describe('1. Initial Rendering & Properties Display', () => {
    it('renders status actions and dropdown properties with initial ticket values', async () => {
      renderWithQuery(<UpdateTicket ticket={mockTicket} onError={mockOnError} />);

      // Status quick actions
      expect(screen.getByText('Update Status:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^open$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^resolved$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^closed$/i })).toBeInTheDocument();

      // Properties header
      expect(screen.getByRole('heading', { name: 'Ticket Properties' })).toBeInTheDocument();

      // Category, Assignee, Priority selectors
      expect(screen.getByLabelText('Category selector')).toHaveValue('TECHNICAL_QUESTION');
      await waitFor(() => {
        expect(screen.getByLabelText('Assignee selector')).toHaveValue('agent-1');
      });
      expect(screen.getByLabelText('Priority selector')).toHaveValue('HIGH');
    });

    it('renders with custom idPrefix and variant styling', async () => {
      const { container } = renderWithQuery(
        <UpdateTicket
          ticket={mockTicket}
          idPrefix="modal"
          variant="slate"
          className="custom-class"
        />
      );

      expect(container.querySelector('#modal-category-select')).toBeInTheDocument();
      expect(container.querySelector('#modal-assignee-select')).toBeInTheDocument();
      expect(container.querySelector('#modal-priority-select')).toBeInTheDocument();
    });
  });

  describe('2. Status Quick Action Updates', () => {
    it('disables current status button and triggers update to RESOLVED', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        status: 'RESOLVED',
      });

      renderWithQuery(<UpdateTicket ticket={mockTicket} onError={mockOnError} />);

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
      expect(mockOnError).toHaveBeenCalledWith(null);
    });

    it('triggers status update to CLOSED', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        status: 'CLOSED',
      });

      renderWithQuery(<UpdateTicket ticket={mockTicket} onError={mockOnError} />);

      const closedBtn = screen.getByRole('button', { name: /^closed$/i });
      await user.click(closedBtn);

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          status: 'CLOSED',
        });
      });
    });

    it('triggers status update to OPEN when current status is RESOLVED', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        status: 'OPEN',
      });

      const resolvedTicket: Ticket = { ...mockTicket, status: 'RESOLVED' };
      renderWithQuery(<UpdateTicket ticket={resolvedTicket} onError={mockOnError} />);

      const openBtn = screen.getByRole('button', { name: /^open$/i });
      expect(openBtn).toBeEnabled();

      await user.click(openBtn);

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          status: 'OPEN',
        });
      });
    });
  });

  describe('3. Category & Assignee Modifications', () => {
    it('updates ticket category when selecting a different category', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockResolvedValue({
        ...mockTicket,
        category: 'REFUND_REQUEST',
      });

      renderWithQuery(<UpdateTicket ticket={mockTicket} onError={mockOnError} />);

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

      renderWithQuery(<UpdateTicket ticket={mockTicket} onError={mockOnError} />);

      const categorySelect = screen.getByLabelText('Category selector');
      await user.selectOptions(categorySelect, '');

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          category: null,
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

      renderWithQuery(<UpdateTicket ticket={mockTicket} onError={mockOnError} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Assignee selector')).toHaveValue('agent-1');
      });

      const agentSelect = screen.getByLabelText('Assignee selector');
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

      renderWithQuery(<UpdateTicket ticket={mockTicket} onError={mockOnError} />);

      await waitFor(() => {
        expect(screen.getByLabelText('Assignee selector')).toHaveValue('agent-1');
      });

      const agentSelect = screen.getByLabelText('Assignee selector');
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

      renderWithQuery(<UpdateTicket ticket={mockTicket} onError={mockOnError} />);

      const prioritySelect = screen.getByLabelText('Priority selector');
      await user.selectOptions(prioritySelect, 'URGENT');

      await waitFor(() => {
        expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, {
          priority: 'URGENT',
        });
      });
    });
  });

  describe('4. Error Handling & Feedback', () => {
    it('calls onError callback when status update mutation rejects', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockRejectedValueOnce(
        new Error('Network error on status update')
      );

      renderWithQuery(<UpdateTicket ticket={mockTicket} onError={mockOnError} />);

      const resolvedBtn = screen.getByRole('button', { name: /^resolved$/i });
      await user.click(resolvedBtn);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Network error on status update');
      });
    });

    it('renders internal error message when no onError prop is provided and mutation fails', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockRejectedValueOnce(
        new Error('Standalone update failure')
      );

      renderWithQuery(<UpdateTicket ticket={mockTicket} />);

      const resolvedBtn = screen.getByRole('button', { name: /^resolved$/i });
      await user.click(resolvedBtn);

      await waitFor(() => {
        expect(screen.getByText('Standalone update failure')).toBeInTheDocument();
      });
    });

    it('renders internal error message when showErrorBanner is explicitly true', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.updateTicket).mockRejectedValueOnce(
        new Error('Banner error with callback')
      );

      renderWithQuery(
        <UpdateTicket ticket={mockTicket} onError={mockOnError} showErrorBanner={true} />
      );

      const resolvedBtn = screen.getByRole('button', { name: /^resolved$/i });
      await user.click(resolvedBtn);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Banner error with callback');
        expect(screen.getByText('Banner error with callback')).toBeInTheDocument();
      });
    });
  });
});
