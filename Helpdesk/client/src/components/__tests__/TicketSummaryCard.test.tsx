import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketSummaryCard } from '../TicketSummaryCard';
import { renderWithQuery } from '../../test/renderWithQuery';
import { ticketsApi, Ticket } from '../../lib/tickets-api';

vi.mock('../../lib/tickets-api', () => ({
  ticketsApi: {
    summarizeTicket: vi.fn(),
  },
}));

describe('TicketSummaryCard Component', () => {
  const mockTicketWithSummary: Ticket = {
    id: 42,
    subject: 'VPN Connection failing with TLS error',
    studentName: 'Lucas Vance',
    studentEmail: 'lucas@example.com',
    category: 'TECHNICAL_QUESTION',
    priority: 'HIGH',
    status: 'OPEN',
    summary: '• Initial Issue: Student cannot connect to campus VPN.\n• Conversation: Agent provided TLS certificates.\n• Current Status: Open.',
    aiDraftResponse: null,
    assignedAgentId: null,
    messages: [
      {
        id: 'msg-1',
        ticketId: 42,
        senderType: 'STUDENT',
        senderEmail: 'lucas@example.com',
        body: 'My VPN client gives TLS handshake timeout.',
        isInternalNote: false,
        createdAt: '2026-09-20T10:00:00.000Z',
      },
    ],
    createdAt: '2026-09-20T10:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z',
  };

  const mockTicketWithoutSummary: Ticket = {
    ...mockTicketWithSummary,
    id: 43,
    summary: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Summarize button and formatted summary when ticket has summary', () => {
    renderWithQuery(<TicketSummaryCard ticket={mockTicketWithSummary} />);

    expect(screen.getByRole('button', { name: /summarize ticket/i })).toBeInTheDocument();
    expect(screen.getByTestId('ticket-summary-context')).toBeInTheDocument();
    expect(screen.getByText(/AI Summary & Conversation History/i)).toBeInTheDocument();
    expect(screen.queryByText('Gemini AI')).not.toBeInTheDocument();
    expect(screen.getByTestId('ticket-summary-content')).toBeInTheDocument();
    expect(screen.getByText(/Student cannot connect to campus VPN/i)).toBeInTheDocument();
  });

  it('triggers summarize mutation on clicking "Summarize" when ticket.summary is null', async () => {
    const user = userEvent.setup();
    const updatedSummary = '• Initial Issue: VPN TLS timeout\n• Status: Open';
    vi.mocked(ticketsApi.summarizeTicket).mockResolvedValueOnce({
      summary: updatedSummary,
      ticket: { ...mockTicketWithoutSummary, summary: updatedSummary },
    });

    renderWithQuery(<TicketSummaryCard ticket={mockTicketWithoutSummary} />);

    const summarizeBtn = screen.getByRole('button', { name: /summarize ticket/i });
    await user.click(summarizeBtn);

    expect(ticketsApi.summarizeTicket).toHaveBeenCalledWith(43);
    await waitFor(() => {
      expect(screen.getByTestId('ticket-summary-context')).toBeInTheDocument();
    });
  });

  it('re-generates summary on clicking "Summarize" when summary already exists', async () => {
    const user = userEvent.setup();
    const refreshedSummary = '• Initial Issue: VPN TLS\n• Conversation: 2 messages\n• Status: Resolved';
    vi.mocked(ticketsApi.summarizeTicket).mockResolvedValueOnce({
      summary: refreshedSummary,
      ticket: { ...mockTicketWithSummary, summary: refreshedSummary },
    });

    renderWithQuery(<TicketSummaryCard ticket={mockTicketWithSummary} />);

    const summarizeBtn = screen.getByRole('button', { name: /summarize ticket/i });
    await user.click(summarizeBtn);

    expect(ticketsApi.summarizeTicket).toHaveBeenCalledWith(42);
  });

  it('displays loading state and disables button while summarization is in flight', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(ticketsApi.summarizeTicket).mockReturnValueOnce(pendingPromise as any);

    renderWithQuery(<TicketSummaryCard ticket={mockTicketWithoutSummary} />);

    const summarizeBtn = screen.getByRole('button', { name: /summarize ticket/i });
    await user.click(summarizeBtn);

    expect(screen.getByText(/summarizing\.\.\./i)).toBeInTheDocument();
    expect(screen.getByTestId('summary-loading-state')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /summarize ticket/i })).toBeDisabled();

    // Resolve promise
    resolvePromise!({
      summary: 'New summary',
      ticket: { ...mockTicketWithoutSummary, summary: 'New summary' },
    });

    await waitFor(() => {
      expect(screen.queryByTestId('summary-loading-state')).not.toBeInTheDocument();
    });
  });

  it('displays error banner and calls onError when summarizeTicket fails', async () => {
    const user = userEvent.setup();
    const onErrorMock = vi.fn();
    vi.mocked(ticketsApi.summarizeTicket).mockRejectedValueOnce(new Error('AI Quota Exceeded'));

    renderWithQuery(
      <TicketSummaryCard ticket={mockTicketWithoutSummary} onError={onErrorMock} />
    );

    const summarizeBtn = screen.getByRole('button', { name: /summarize ticket/i });
    await user.click(summarizeBtn);

    await waitFor(() => {
      expect(screen.getByText('AI Quota Exceeded')).toBeInTheDocument();
      expect(onErrorMock).toHaveBeenCalledWith('AI Quota Exceeded');
    });
  });

  it('merges custom className properly', () => {
    renderWithQuery(
      <TicketSummaryCard ticket={mockTicketWithSummary} className="custom-summary-card-class" />
    );

    expect(screen.getByTestId('ticket-summary-card')).toHaveClass('custom-summary-card-class');
  });
});
