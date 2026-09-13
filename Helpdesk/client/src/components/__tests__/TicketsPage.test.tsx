import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TicketsPage } from '../TicketsPage';
import { renderWithQuery, screen, waitFor, userEvent, within } from '../../test/test-utils';
import { ticketsApi } from '../../lib/tickets-api';
import { AuthUser } from '../../lib/auth-client';
import type { Ticket } from '../../lib/types';

// Mock ticketsApi service
vi.mock('../../lib/tickets-api', () => ({
  ticketsApi: {
    listTickets: vi.fn(),
    listAgents: vi.fn(),
    createTicket: vi.fn(),
    updateTicket: vi.fn(),
    addMessage: vi.fn(),
  },
}));

describe('TicketsPage Component', () => {
  const mockUser: AuthUser = {
    id: 'agent-1',
    name: 'Agent Smith',
    email: 'smith@helpdesk.com',
    role: 'AGENT',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockAgents = [
    { id: 'agent-1', name: 'Agent Smith', email: 'smith@helpdesk.com', role: 'AGENT' as const },
    { id: 'agent-2', name: 'Agent Jones', email: 'jones@helpdesk.com', role: 'AGENT' as const },
  ];

  const mockTickets: Ticket[] = [
    {
      id: 1,
      ticketNumber: 1,
      subject: 'Payment Issue with Stripe',
      studentName: 'Alice Johnson',
      studentEmail: 'alice@student.edu',
      category: 'REFUND_REQUEST',
      priority: 'HIGH',
      status: 'OPEN',
      summary: 'Stripe payment failed on checkout',
      aiDraftResponse: null,
      assignedAgentId: 'agent-1',
      assignedAgent: mockAgents[0],
      messages: [
        {
          id: 'msg-1',
          ticketId: 1,
          senderType: 'STUDENT',
          senderEmail: 'alice@student.edu',
          body: 'My tuition payment failed with error 402.',
          isInternalNote: false,
          createdAt: '2026-03-01T10:00:00.000Z',
        },
      ],
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
    {
      id: 2,
      ticketNumber: 2,
      subject: 'Login Failure on Student Portal',
      studentName: 'Bob Smith',
      studentEmail: 'bob@student.edu',
      category: 'TECHNICAL_QUESTION',
      priority: 'URGENT',
      status: 'OPEN',
      summary: 'Cannot login with 2FA',
      aiDraftResponse: 'Please reset your 2FA app.',
      assignedAgentId: null,
      assignedAgent: null,
      messages: [
        {
          id: 'msg-2',
          ticketId: 2,
          senderType: 'STUDENT',
          senderEmail: 'bob@student.edu',
          body: 'My authenticator code is rejected.',
          isInternalNote: false,
          createdAt: '2026-03-05T12:00:00.000Z',
        },
      ],
      createdAt: '2026-03-05T12:00:00.000Z',
      updatedAt: '2026-03-05T12:00:00.000Z',
    },
    {
      id: 3,
      ticketNumber: 3,
      subject: 'Course Registration Inquiry',
      studentName: 'Charlie Brown',
      studentEmail: 'charlie@student.edu',
      category: 'GENERAL_QUESTION',
      priority: 'LOW',
      status: 'RESOLVED',
      summary: 'Inquiry about dropping CS101',
      aiDraftResponse: null,
      assignedAgentId: 'agent-2',
      assignedAgent: mockAgents[1],
      messages: [
        {
          id: 'msg-3',
          ticketId: 3,
          senderType: 'STUDENT',
          senderEmail: 'charlie@student.edu',
          body: 'What is the deadline to drop CS101?',
          isInternalNote: false,
          createdAt: '2026-03-10T08:30:00.000Z',
        },
      ],
      createdAt: '2026-03-10T08:30:00.000Z',
      updatedAt: '2026-03-10T08:30:00.000Z',
    },
    {
      id: 4,
      ticketNumber: 4,
      subject: 'General Campus Question',
      studentName: 'Diana Prince',
      studentEmail: 'diana@student.edu',
      category: null,
      priority: 'MEDIUM',
      status: 'CLOSED',
      summary: 'Library open hours inquiry',
      aiDraftResponse: null,
      assignedAgentId: null,
      assignedAgent: null,
      messages: [
        {
          id: 'msg-4',
          ticketId: 4,
          senderType: 'STUDENT',
          senderEmail: 'diana@student.edu',
          body: 'Is the library open on weekends?',
          isInternalNote: false,
          createdAt: '2026-03-12T15:00:00.000Z',
        },
      ],
      createdAt: '2026-03-12T15:00:00.000Z',
      updatedAt: '2026-03-12T15:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ticketsApi.listTickets).mockResolvedValue(mockTickets);
    vi.mocked(ticketsApi.listAgents).mockResolvedValue(mockAgents);
  });

  describe('Initial Rendering & Sorting by Newest First', () => {
    it('renders the tickets dashboard with status count tabs', async () => {
      renderWithQuery(<TicketsPage user={mockUser} />);

      // Wait for tickets to load and tabs to reflect counts
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /all tickets \(4\)/i })).toBeInTheDocument();
      });

      // Verify status tabs and badge counts
      expect(screen.getByRole('button', { name: /open \(2\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /resolved \(1\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /closed \(1\)/i })).toBeInTheDocument();
    });

    it('sorts tickets by newest first by default', async () => {
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('General Campus Question')).toBeInTheDocument();
      });

      // Table rows should be ordered: Ticket 4 (March 12), Ticket 3 (March 10), Ticket 2 (March 5), Ticket 1 (March 1)
      const rows = screen.getAllByRole('row').slice(1); // Exclude header row
      expect(rows).toHaveLength(4);

      expect(within(rows[0]).getByText('General Campus Question')).toBeInTheDocument();
      expect(within(rows[1]).getByText('Course Registration Inquiry')).toBeInTheDocument();
      expect(within(rows[2]).getByText('Login Failure on Student Portal')).toBeInTheDocument();
      expect(within(rows[3]).getByText('Payment Issue with Stripe')).toBeInTheDocument();
    });

    it('allows changing sort order to oldest first', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const sortSelect = screen.getByDisplayValue('Newest First (Default)');
      await user.selectOptions(sortSelect, 'oldest');

      const rows = screen.getAllByRole('row').slice(1);
      expect(within(rows[0]).getByText('Payment Issue with Stripe')).toBeInTheDocument();
      expect(within(rows[1]).getByText('Login Failure on Student Portal')).toBeInTheDocument();
      expect(within(rows[2]).getByText('Course Registration Inquiry')).toBeInTheDocument();
      expect(within(rows[3]).getByText('General Campus Question')).toBeInTheDocument();
    });

    it('allows changing sort order to highest priority', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const sortSelect = screen.getByDisplayValue('Newest First (Default)');
      await user.selectOptions(sortSelect, 'priority_desc');

      const rows = screen.getAllByRole('row').slice(1);
      // URGENT (Ticket 2) -> HIGH (Ticket 1) -> MEDIUM (Ticket 4) -> LOW (Ticket 3)
      expect(within(rows[0]).getByText('Login Failure on Student Portal')).toBeInTheDocument();
      expect(within(rows[1]).getByText('Payment Issue with Stripe')).toBeInTheDocument();
      expect(within(rows[2]).getByText('General Campus Question')).toBeInTheDocument();
      expect(within(rows[3]).getByText('Course Registration Inquiry')).toBeInTheDocument();
    });
  });

  describe('Status Tabs Filtering', () => {
    it('filters tickets when clicking Open status tab', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('General Campus Question')).toBeInTheDocument();
      });

      const openTab = screen.getByRole('button', { name: /open/i });
      await user.click(openTab);

      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(2);
      expect(screen.getByText('Login Failure on Student Portal')).toBeInTheDocument();
      expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      expect(screen.queryByText('Course Registration Inquiry')).not.toBeInTheDocument();
      expect(screen.queryByText('General Campus Question')).not.toBeInTheDocument();
    });

    it('filters tickets when clicking Resolved status tab', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Course Registration Inquiry')).toBeInTheDocument();
      });

      const resolvedTab = screen.getByRole('button', { name: /resolved/i });
      await user.click(resolvedTab);

      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(1);
      expect(screen.getByText('Course Registration Inquiry')).toBeInTheDocument();
      expect(screen.queryByText('Payment Issue with Stripe')).not.toBeInTheDocument();
    });

    it('filters tickets when clicking Closed status tab', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('General Campus Question')).toBeInTheDocument();
      });

      const closedTab = screen.getByRole('button', { name: /closed/i });
      await user.click(closedTab);

      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(1);
      expect(screen.getByText('General Campus Question')).toBeInTheDocument();
      expect(screen.queryByText('Payment Issue with Stripe')).not.toBeInTheDocument();
    });
  });

  describe('Search and Filter Dropdowns', () => {
    it('filters tickets matching search input by student name or subject', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by subject, student, email, or #id/i);
      await user.type(searchInput, 'Alice');

      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(1);
      expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      expect(screen.queryByText('Login Failure on Student Portal')).not.toBeInTheDocument();
    });

    it('filters tickets matching search input by ticket ID', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by subject, student, email, or #id/i);
      await user.type(searchInput, '2');

      expect(screen.getByText('Login Failure on Student Portal')).toBeInTheDocument();
      expect(screen.queryByText('Payment Issue with Stripe')).not.toBeInTheDocument();
    });

    it('filters tickets by category dropdown', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const categorySelect = screen.getByDisplayValue('All Categories');
      await user.selectOptions(categorySelect, 'REFUND_REQUEST');

      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(1);
      expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      expect(screen.queryByText('Login Failure on Student Portal')).not.toBeInTheDocument();
    });

    it('filters tickets by priority dropdown', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const prioritySelect = screen.getByDisplayValue('All Priorities');
      await user.selectOptions(prioritySelect, 'URGENT');

      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(1);
      expect(screen.getByText('Login Failure on Student Portal')).toBeInTheDocument();
      expect(screen.queryByText('Payment Issue with Stripe')).not.toBeInTheDocument();
    });

    it('filters tickets by assignee dropdown (e.g. Assigned to Me)', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const assigneeSelect = screen.getByDisplayValue('All Assignees');
      await user.selectOptions(assigneeSelect, 'ME');

      const rows = screen.getAllByRole('row').slice(1);
      expect(rows).toHaveLength(1);
      expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      expect(screen.queryByText('Login Failure on Student Portal')).not.toBeInTheDocument();
    });

    it('shows empty state and allows resetting filters when no tickets match', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by subject, student, email, or #id/i);
      await user.type(searchInput, 'NonExistentTicketQuery999');

      expect(screen.getByText('No Tickets Found')).toBeInTheDocument();
      const clearBtn = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearBtn);

      expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('opens ticket detail modal when clicking on a ticket row', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const ticketRow = screen.getByText('Payment Issue with Stripe').closest('tr');
      expect(ticketRow).not.toBeNull();
      if (ticketRow) {
        await user.click(ticketRow);
      }

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Payment Issue with Stripe' })).toBeInTheDocument();
      });
      expect(screen.getByText('My tuition payment failed with error 402.')).toBeInTheDocument();
    });

    it('opens create ticket modal when clicking "New Ticket"', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /welcome to the helpdesk/i })).toBeInTheDocument();
      });

      const createBtn = screen.getByRole('button', { name: /new ticket/i });
      await user.click(createBtn);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create new ticket/i })).toBeInTheDocument();
      });
    });
  });
});
