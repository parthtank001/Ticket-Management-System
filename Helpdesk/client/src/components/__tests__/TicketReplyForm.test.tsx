import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithQuery } from '../../test/renderWithQuery';
import { TicketReplyForm } from '../TicketReplyForm';
import { ticketsApi } from '../../lib/tickets-api';

vi.mock('../../lib/tickets-api', () => ({
  ticketsApi: {
    addTicketMessage: vi.fn(),
    polishReply: vi.fn(),
  },
}));

describe('TicketReplyForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Rendering & Layout Options', () => {
    it('renders default reply form with header, textarea, and submit button (disabled by default when empty)', () => {
      renderWithQuery(<TicketReplyForm ticketId={42} />);

      expect(screen.getByText('Submit a Reply')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Write a reply to the student...')).toBeInTheDocument();
      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      expect(sendBtn).toBeInTheDocument();
      expect(sendBtn).toBeDisabled();
      expect(screen.queryByRole('button', { name: /support agent/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /customer \/ student/i })).not.toBeInTheDocument();
    });

    it('renders and functions when passing ticket object directly as a prop', async () => {
      const user = userEvent.setup();
      const mockTicket = {
        id: 77,
        subject: 'Test Subject',
        studentName: 'Student Name',
        studentEmail: 'student@test.com',
        body: 'Initial inquiry body',
        category: null,
        priority: 'MEDIUM' as const,
        status: 'OPEN' as const,
        summary: null,
        aiDraftResponse: null,
        assignedAgentId: null,
        messages: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      vi.mocked(ticketsApi.addTicketMessage).mockResolvedValueOnce({
        id: 'msg-1',
        ticketId: 77,
        senderType: 'AGENT',
        senderEmail: 'agent@helpdesk.com',
        body: 'Reply message',
        isInternalNote: false,
        createdAt: '2026-01-01',
      });

      renderWithQuery(<TicketReplyForm ticket={mockTicket} />);

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, 'Reply message');
      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      await user.click(sendBtn);

      await waitFor(() => {
        expect(ticketsApi.addTicketMessage).toHaveBeenCalledWith(77, {
          body: 'Reply message',
          senderType: 'AGENT',
          isInternalNote: false,
          sendEmail: true,
        });
      });
    });

    it('hides header when showHeader is set to false', () => {
      renderWithQuery(<TicketReplyForm ticketId={42} showHeader={false} />);

      expect(screen.queryByText('Submit a Reply')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('Write a reply to the student...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument();
    });

    it('wraps content in card container when showCardWrapper is true', () => {
      const { container } = renderWithQuery(
        <TicketReplyForm ticketId={42} showCardWrapper={true} />
      );

      const cardWrapper = container.querySelector('.bg-white.border.border-slate-200\\/80.rounded-xl.p-3\\.5');
      expect(cardWrapper).toBeInTheDocument();
    });

    it('applies custom className to wrapper container', () => {
      const { container } = renderWithQuery(
        <TicketReplyForm ticketId={42} className="custom-reply-class" />
      );

      const wrapper = container.querySelector('.custom-reply-class');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('2. Validation & Error Handling', () => {
    it('disables the Send Reply button when the draft reply is empty', () => {
      renderWithQuery(<TicketReplyForm ticketId={42} />);

      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      expect(sendBtn).toBeDisabled();
      expect(ticketsApi.addTicketMessage).not.toHaveBeenCalled();
    });

    it('disables the Send Reply button when the draft reply is only whitespace', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketReplyForm ticketId={42} />);

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, '     ');

      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      expect(sendBtn).toBeDisabled();
      expect(ticketsApi.addTicketMessage).not.toHaveBeenCalled();
    });

    it('enables the Send Reply button when user types a valid reply into the textarea', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketReplyForm ticketId={42} />);

      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      expect(sendBtn).toBeDisabled();

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, 'Here is the solution to your inquiry.');
      expect(sendBtn).toBeEnabled();
    });

    it('clears the textarea and disables the Send button when clicking the Clear button', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketReplyForm ticketId={42} />);

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, 'Temporary text');

      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      expect(sendBtn).toBeEnabled();

      const clearBtn = screen.getByRole('button', { name: /clear/i });
      await user.click(clearBtn);

      expect(textarea).toHaveValue('');
      expect(sendBtn).toBeDisabled();
    });

    it('disables the Send button when text is deleted back to empty', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketReplyForm ticketId={42} />);

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      const sendBtn = screen.getByRole('button', { name: /send reply/i });

      expect(sendBtn).toBeDisabled();
      await user.type(textarea, 'Hi');
      expect(sendBtn).toBeEnabled();

      await user.clear(textarea);
      expect(sendBtn).toBeDisabled();
    });

    it('displays error banner and calls onError when addTicketMessage mutation rejects', async () => {
      const user = userEvent.setup();
      const handleError = vi.fn();
      vi.mocked(ticketsApi.addTicketMessage).mockRejectedValueOnce(
        new Error('Network error: Failed to post message reply')
      );

      renderWithQuery(
        <TicketReplyForm
          ticketId={42}
          onError={handleError}
        />
      );

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, 'Will fail to deliver');

      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      await user.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText('Network error: Failed to post message reply')).toBeInTheDocument();
      });

      expect(handleError).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Form Submission & State Management', () => {
    it('submits a reply, trims whitespace, invokes onSuccess callback, and resets textarea upon success', async () => {
      const user = userEvent.setup();
      const handleSuccess = vi.fn();
      vi.mocked(ticketsApi.addTicketMessage).mockResolvedValue({
        id: 'msg-101',
        ticketId: 42,
        senderType: 'AGENT',
        senderEmail: 'agent@helpdesk.com',
        body: 'Your ticket has been approved.',
        isInternalNote: false,
        createdAt: '2026-03-01T11:00:00.000Z',
      });

      renderWithQuery(
        <TicketReplyForm
          ticketId={42}
          onSuccess={handleSuccess}
        />
      );

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, '  Your ticket has been approved.  ');

      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      await user.click(sendBtn);

      await waitFor(() => {
        expect(ticketsApi.addTicketMessage).toHaveBeenCalledWith(42, {
          body: 'Your ticket has been approved.',
          senderType: 'AGENT',
          isInternalNote: false,
          sendEmail: true,
        });
      });

      expect(handleSuccess).toHaveBeenCalledTimes(1);
      expect(textarea).toHaveValue('');
    });

    it('clears reply body when clicking Clear button', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketReplyForm ticketId={42} />);

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, 'Draft reply that will be cleared');
      expect(textarea).toHaveValue('Draft reply that will be cleared');

      const clearBtn = screen.getByRole('button', { name: /clear/i });
      await user.click(clearBtn);

      expect(textarea).toHaveValue('');
    });
  });

  describe('4. Modal & Close Actions', () => {
    it('renders close button and triggers onClose callback when provided', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      renderWithQuery(
        <TicketReplyForm
          ticketId={42}
          onClose={handleClose}
          showHeader={false}
        />
      );

      expect(screen.queryByText('Submit a Reply')).not.toBeInTheDocument();
      const closeBtn = screen.getByRole('button', { name: /close/i });
      await user.click(closeBtn);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. AI Reply Polish (gpt-5-nano via Vercel AI SDK)', () => {
    it('renders Polish button disabled when textarea is empty and enables when user writes text', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketReplyForm ticketId={42} />);

      const polishBtn = screen.getByRole('button', { name: /polish/i });
      expect(polishBtn).toBeInTheDocument();
      expect(polishBtn).toBeDisabled();

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, 'Draft reply for student');
      expect(polishBtn).toBeEnabled();
    });

    it('successfully calls polishReply API and updates textarea with the improved text', async () => {
      const user = userEvent.setup();
      const mockTicket = {
        id: 42,
        subject: 'Course refund query',
        studentName: 'Alice Student',
        studentEmail: 'alice@example.com',
        body: 'i want refund',
        category: 'REFUND_REQUEST' as const,
        priority: 'HIGH' as const,
        status: 'OPEN' as const,
        summary: null,
        aiDraftResponse: null,
        assignedAgentId: null,
        messages: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      vi.mocked(ticketsApi.polishReply).mockResolvedValueOnce({
        originalText: 'i will refund you',
        polishedReply: 'Hello Alice,\n\nI will process your refund request promptly.\n\nBest regards,\nHelpdesk Support Team',
      });

      renderWithQuery(<TicketReplyForm ticket={mockTicket} />);

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, 'i will refund you');

      const polishBtn = screen.getByRole('button', { name: /polish/i });
      await user.click(polishBtn);

      await waitFor(() => {
        expect(ticketsApi.polishReply).toHaveBeenCalledWith({
          text: 'i will refund you',
          studentName: 'Alice Student',
          category: 'REFUND_REQUEST',
        });
      });

      await waitFor(() => {
        expect(textarea).toHaveValue(
          'Hello Alice,\n\nI will process your refund request promptly.\n\nBest regards,\nHelpdesk Support Team'
        );
      });

      expect(screen.getByText(/polished with ai \(gpt-5-nano\)/i)).toBeInTheDocument();
    });

    it('displays error banner when polishReply API fails', async () => {
      const user = userEvent.setup();
      vi.mocked(ticketsApi.polishReply).mockRejectedValueOnce(
        new Error('AI service rate limit exceeded')
      );

      renderWithQuery(<TicketReplyForm ticketId={42} />);

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, 'Rough response');

      const polishBtn = screen.getByRole('button', { name: /polish/i });
      await user.click(polishBtn);

      await waitFor(() => {
        expect(screen.getByText('AI service rate limit exceeded')).toBeInTheDocument();
      });
    });
  });
});

