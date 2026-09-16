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
    addTicketMessage: vi.fn(),
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

  const PRIORITY_ORDER: Record<string, number> = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ticketsApi.listTickets).mockImplementation(async (params) => {
      const sortBy = params?.sortBy || 'createdAt';
      const sortOrder = params?.sortOrder || 'desc';

      const copy = [...mockTickets];
      copy.sort((a, b) => {
        let comp = 0;
        if (sortBy === 'createdAt' || sortBy === 'created') {
          comp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === 'priority') {
          comp = (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0);
        } else if (sortBy === 'id' || sortBy === 'ticket') {
          comp = a.id - b.id;
        } else if (sortBy === 'studentName' || sortBy === 'sender') {
          comp = a.studentName.localeCompare(b.studentName);
        } else if (sortBy === 'subject') {
          comp = a.subject.localeCompare(b.subject);
        } else if (sortBy === 'status') {
          comp = a.status.localeCompare(b.status);
        }
        return sortOrder === 'asc' ? comp : -comp;
      });
      return {
        tickets: copy,
        total: copy.length,
        page: params?.page || 1,
        pageSize: params?.pageSize || 15,
        totalPages: 1,
      };
    });
    vi.mocked(ticketsApi.listAgents).mockResolvedValue(mockAgents);
  });

  describe('Initial Rendering & Table', () => {
    it('renders the tickets table and loaded rows with Ticket header', async () => {
      renderWithQuery(<TicketsPage user={mockUser} />);

      expect(screen.getByRole('heading', { name: 'Ticket' })).toBeInTheDocument();

      // Wait for tickets to load
      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      expect(screen.getByText('Login Failure on Student Portal')).toBeInTheDocument();
      expect(screen.getByText('Course Registration Inquiry')).toBeInTheDocument();
      expect(screen.getByText('General Campus Question')).toBeInTheDocument();
    });

    it('sorts tickets by newest first by default in table', async () => {
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

    it('triggers server-side sorting when clicking column headers in TanStack table', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const senderHeader = screen.getByRole('columnheader', { name: /sender/i });
      await user.click(senderHeader);

      await waitFor(() => {
        expect(ticketsApi.listTickets).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'studentName',
            sortOrder: 'asc',
          })
        );
      });
    });
  });

  describe('Filtering & Search Interactions', () => {
    it('triggers search query filtering when user types in search input', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search tickets/i);
      await user.type(searchInput, 'Stripe');

      await waitFor(() => {
        expect(ticketsApi.listTickets).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Stripe',
          })
        );
      });
    });

    it('clears search input when clicking clear button', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search tickets/i);
      await user.type(searchInput, 'Stripe');

      const clearSearchButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearSearchButton);

      expect(searchInput).toHaveValue('');
    });

    it('filters by status when selecting a status option', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const statusSelect = screen.getByRole('combobox', { name: /filter by status/i });
      await user.selectOptions(statusSelect, 'OPEN');

      await waitFor(() => {
        expect(ticketsApi.listTickets).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'OPEN',
          })
        );
      });
    });

    it('filters by category when selecting a category option', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const categorySelect = screen.getByRole('combobox', { name: /filter by category/i });
      await user.selectOptions(categorySelect, 'REFUND_REQUEST');

      await waitFor(() => {
        expect(ticketsApi.listTickets).toHaveBeenCalledWith(
          expect.objectContaining({
            category: 'REFUND_REQUEST',
          })
        );
      });
    });
  });

  describe('Modal & Navigation Interactions', () => {
    it('opens ticket detail modal when clicking on a ticket row when onNavigate is not provided', async () => {
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

    it('navigates to /tickets/:id when clicking on ticket subject when onNavigate is provided', async () => {
      const user = userEvent.setup();
      const handleNavigate = vi.fn();
      renderWithQuery(<TicketsPage user={mockUser} onNavigate={handleNavigate} />);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Payment Issue with Stripe' })).toBeInTheDocument();
      });

      const subjectLink = screen.getByRole('link', { name: 'Payment Issue with Stripe' });
      await user.click(subjectLink);

      expect(handleNavigate).toHaveBeenCalledWith('/tickets/1');
    });
  });

  describe('Pagination Interactions', () => {
    it('requests 15 records per page by default', async () => {
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(ticketsApi.listTickets).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
            pageSize: 15,
          })
        );
      });
    });

    it('renders pagination bar with summary', async () => {
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      expect(screen.getByTestId('pagination-container')).toBeInTheDocument();
      expect(screen.getByTestId('pagination-summary')).toHaveTextContent(/showing 1 to 4 of 4 tickets/i);
    });

    it('requests new page when clicking next page button in paginated mode', async () => {
      const user = userEvent.setup();

      // Mock 50 tickets total with 4 pages (15 per page)
      vi.mocked(ticketsApi.listTickets).mockResolvedValue({
        tickets: mockTickets,
        total: 50,
        page: 1,
        pageSize: 15,
        totalPages: 4,
      });

      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next page/i });
      expect(nextButton).toBeEnabled();

      await user.click(nextButton);

      await waitFor(() => {
        expect(ticketsApi.listTickets).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
            pageSize: 15,
          })
        );
      });
    });

    it('does not render a page size dropdown selector', async () => {
      renderWithQuery(<TicketsPage user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Payment Issue with Stripe')).toBeInTheDocument();
      });

      expect(screen.queryByRole('combobox', { name: /rows per page/i })).not.toBeInTheDocument();
    });
  });
});
