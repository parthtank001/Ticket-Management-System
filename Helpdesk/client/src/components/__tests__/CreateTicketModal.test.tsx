import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithQuery, screen, waitFor, userEvent } from '../../test/test-utils';
import { CreateTicketModal } from '../CreateTicketModal';
import { ticketsApi } from '../../lib/tickets-api';

vi.mock('../../lib/tickets-api', () => ({
  ticketsApi: {
    createTicket: vi.fn(),
  },
}));

describe('CreateTicketModal Component', () => {
  const handleClose = vi.fn();
  const handleSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Dialog Visibility & Initial Rendering', () => {
    it('does not render dialog content when isOpen is false', () => {
      renderWithQuery(
        <CreateTicketModal isOpen={false} onClose={handleClose} onSuccess={handleSuccess} />
      );

      expect(screen.queryByRole('heading', { name: /create new ticket/i })).not.toBeInTheDocument();
    });

    it('renders modal header, instructions, and all form fields when isOpen is true', () => {
      renderWithQuery(
        <CreateTicketModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      );

      expect(screen.getByRole('heading', { name: /create new ticket/i })).toBeInTheDocument();
      expect(screen.getByText(/log an inbound student support inquiry/i)).toBeInTheDocument();

      expect(screen.getByPlaceholderText('e.g. Maya Lin')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('maya@student.edu')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. Cannot login to library portal')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Describe the student inquiry or issue...')).toBeInTheDocument();

      // Category and Priority selects
      expect(screen.getByDisplayValue('No Category (Uncategorized)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Medium')).toBeInTheDocument();

      // Action buttons
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^create ticket$/i })).toBeInTheDocument();
    });

    it('invokes onClose when clicking the header close button or Cancel button', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CreateTicketModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      );

      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      const closeHeaderBtn = screen.getByRole('button', { name: '' });
      await user.click(closeHeaderBtn);
      expect(handleClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('2. Form Validation Rules', () => {
    it('validates student name cannot be empty or whitespace', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CreateTicketModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      );

      // Fill in other required fields except name
      await user.type(screen.getByPlaceholderText('maya@student.edu'), 'maya@student.edu');
      await user.type(screen.getByPlaceholderText('e.g. Cannot login to library portal'), 'Login Bug');
      await user.type(screen.getByPlaceholderText('Describe the student inquiry or issue...'), 'Cannot login');

      const submitBtn = screen.getByRole('button', { name: /^create ticket$/i });
      await user.click(submitBtn);

      expect(screen.getByText('Student name is required.')).toBeInTheDocument();
      expect(ticketsApi.createTicket).not.toHaveBeenCalled();
    });

    it('validates student email format requires valid @ character', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CreateTicketModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      );

      await user.type(screen.getByPlaceholderText('e.g. Maya Lin'), 'Maya Lin');
      await user.type(screen.getByPlaceholderText('maya@student.edu'), 'invalid-email-address');
      await user.type(screen.getByPlaceholderText('e.g. Cannot login to library portal'), 'Login Bug');
      await user.type(screen.getByPlaceholderText('Describe the student inquiry or issue...'), 'Cannot login');

      const submitBtn = screen.getByRole('button', { name: /^create ticket$/i });
      await user.click(submitBtn);

      expect(screen.getByText('A valid student email address is required.')).toBeInTheDocument();
      expect(ticketsApi.createTicket).not.toHaveBeenCalled();
    });

    it('validates subject cannot be empty', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CreateTicketModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      );

      await user.type(screen.getByPlaceholderText('e.g. Maya Lin'), 'Maya Lin');
      await user.type(screen.getByPlaceholderText('maya@student.edu'), 'maya@student.edu');
      await user.type(screen.getByPlaceholderText('Describe the student inquiry or issue...'), 'Cannot login');

      const submitBtn = screen.getByRole('button', { name: /^create ticket$/i });
      await user.click(submitBtn);

      expect(screen.getByText('Subject is required.')).toBeInTheDocument();
      expect(ticketsApi.createTicket).not.toHaveBeenCalled();
    });

    it('validates message body cannot be empty', async () => {
      const user = userEvent.setup();
      renderWithQuery(
        <CreateTicketModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      );

      await user.type(screen.getByPlaceholderText('e.g. Maya Lin'), 'Maya Lin');
      await user.type(screen.getByPlaceholderText('maya@student.edu'), 'maya@student.edu');
      await user.type(screen.getByPlaceholderText('e.g. Cannot login to library portal'), 'Login Bug');

      const submitBtn = screen.getByRole('button', { name: /^create ticket$/i });
      await user.click(submitBtn);

      expect(screen.getByText('Message body cannot be empty.')).toBeInTheDocument();
      expect(ticketsApi.createTicket).not.toHaveBeenCalled();
    });
  });

  describe('3. Successful Ticket Creation Workflow', () => {
    it('creates a new ticket with all fields, trims inputs, and converts email to lowercase', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.createTicket).mockResolvedValue({
        id: 99,
        ticketNumber: 99,
        subject: 'WiFi issue in dorms',
        studentName: 'Alex Mercer',
        studentEmail: 'alex@student.edu',
        body: 'Signal drops constantly.',
        category: 'TECHNICAL_QUESTION',
        priority: 'HIGH',
        status: 'OPEN',
        summary: null,
        aiDraftResponse: null,
        assignedAgentId: null,
        assignedAgent: null,
        messages: [],
        createdAt: '2026-03-15T00:00:00.000Z',
        updatedAt: '2026-03-15T00:00:00.000Z',
      });

      renderWithQuery(
        <CreateTicketModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      );

      // Fill in form with extra whitespace & mixed case email
      await user.type(screen.getByPlaceholderText('e.g. Maya Lin'), '  Alex Mercer  ');
      await user.type(screen.getByPlaceholderText('maya@student.edu'), '  Alex@Student.Edu  ');
      await user.type(screen.getByPlaceholderText('e.g. Cannot login to library portal'), '  WiFi issue in dorms  ');
      await user.selectOptions(screen.getByDisplayValue('No Category (Uncategorized)'), 'TECHNICAL_QUESTION');
      await user.selectOptions(screen.getByDisplayValue('Medium'), 'HIGH');
      await user.type(screen.getByPlaceholderText('Describe the student inquiry or issue...'), '  Signal drops constantly.  ');

      const submitBtn = screen.getByRole('button', { name: /^create ticket$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(ticketsApi.createTicket).toHaveBeenCalledWith({
          studentName: 'Alex Mercer',
          studentEmail: 'alex@student.edu',
          subject: 'WiFi issue in dorms',
          category: 'TECHNICAL_QUESTION',
          priority: 'HIGH',
          message: 'Signal drops constantly.',
        });
      });

      expect(handleSuccess).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('creates a ticket with optional category omitted (sends category: null)', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.createTicket).mockResolvedValue({
        id: 100,
        ticketNumber: 100,
        subject: 'General query',
        studentName: 'Sam Green',
        studentEmail: 'sam@student.edu',
        body: 'Just a question.',
        category: null,
        priority: 'LOW',
        status: 'OPEN',
        summary: null,
        aiDraftResponse: null,
        assignedAgentId: null,
        assignedAgent: null,
        messages: [],
        createdAt: '2026-03-15T00:00:00.000Z',
        updatedAt: '2026-03-15T00:00:00.000Z',
      });

      renderWithQuery(
        <CreateTicketModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      );

      await user.type(screen.getByPlaceholderText('e.g. Maya Lin'), 'Sam Green');
      await user.type(screen.getByPlaceholderText('maya@student.edu'), 'sam@student.edu');
      await user.type(screen.getByPlaceholderText('e.g. Cannot login to library portal'), 'General query');
      await user.selectOptions(screen.getByDisplayValue('Medium'), 'LOW');
      await user.type(screen.getByPlaceholderText('Describe the student inquiry or issue...'), 'When is library open?');

      const submitBtn = screen.getByRole('button', { name: /^create ticket$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(ticketsApi.createTicket).toHaveBeenCalledWith({
          studentName: 'Sam Green',
          studentEmail: 'sam@student.edu',
          subject: 'General query',
          category: null,
          priority: 'LOW',
          message: 'When is library open?',
        });
      });

      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('4. Error Handling & API Rejection', () => {
    it('displays error banner when the createTicket API rejects with an error message', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.createTicket).mockRejectedValueOnce(
        new Error('Network failure while connecting to server')
      );

      renderWithQuery(
        <CreateTicketModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      );

      await user.type(screen.getByPlaceholderText('e.g. Maya Lin'), 'Maya Lin');
      await user.type(screen.getByPlaceholderText('maya@student.edu'), 'maya@student.edu');
      await user.type(screen.getByPlaceholderText('e.g. Cannot login to library portal'), 'Test Subject');
      await user.type(screen.getByPlaceholderText('Describe the student inquiry or issue...'), 'Test message body');

      const submitBtn = screen.getByRole('button', { name: /^create ticket$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Network failure while connecting to server')).toBeInTheDocument();
      });

      expect(handleSuccess).not.toHaveBeenCalled();
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('displays fallback error message when API rejects without specific error message', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.createTicket).mockRejectedValueOnce({});

      renderWithQuery(
        <CreateTicketModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />
      );

      await user.type(screen.getByPlaceholderText('e.g. Maya Lin'), 'Maya Lin');
      await user.type(screen.getByPlaceholderText('maya@student.edu'), 'maya@student.edu');
      await user.type(screen.getByPlaceholderText('e.g. Cannot login to library portal'), 'Test Subject');
      await user.type(screen.getByPlaceholderText('Describe the student inquiry or issue...'), 'Test message body');

      const submitBtn = screen.getByRole('button', { name: /^create ticket$/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Failed to create ticket.')).toBeInTheDocument();
      });
    });
  });
});
