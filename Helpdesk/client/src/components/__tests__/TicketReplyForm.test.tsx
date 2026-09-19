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
  },
}));

describe('TicketReplyForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Rendering & Layout Options', () => {
    it('renders default reply form with header, textarea, and submit button', () => {
      renderWithQuery(<TicketReplyForm ticketId={42} />);

      expect(screen.getByText('Submit a Reply')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Write a reply to the student...')).toBeInTheDocument();
      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      expect(sendBtn).toBeInTheDocument();
      expect(sendBtn).toBeEnabled();
      expect(screen.queryByRole('button', { name: /use ai draft/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /support agent/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /customer \/ student/i })).not.toBeInTheDocument();
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
    it('displays validation error message when submitting an empty reply', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketReplyForm ticketId={42} />);

      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      expect(sendBtn).toBeEnabled();
      await user.click(sendBtn);

      expect(screen.getByText('Please enter a reply message.')).toBeInTheDocument();
      expect(ticketsApi.addTicketMessage).not.toHaveBeenCalled();
    });

    it('displays validation error message when submitting whitespace-only reply', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketReplyForm ticketId={42} />);

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, '     ');

      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      await user.click(sendBtn);

      expect(screen.getByText('Please enter a reply message.')).toBeInTheDocument();
      expect(ticketsApi.addTicketMessage).not.toHaveBeenCalled();
    });

    it('clears validation error when user types into the textarea', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketReplyForm ticketId={42} />);

      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      await user.click(sendBtn);
      expect(screen.getByText('Please enter a reply message.')).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, 'A');
      expect(screen.queryByText('Please enter a reply message.')).not.toBeInTheDocument();
    });

    it('clears validation error when clicking the Clear button', async () => {
      const user = userEvent.setup();
      renderWithQuery(<TicketReplyForm ticketId={42} />);

      const textarea = screen.getByPlaceholderText('Write a reply to the student...');
      await user.type(textarea, '   ');

      const sendBtn = screen.getByRole('button', { name: /send reply/i });
      await user.click(sendBtn);
      expect(screen.getByText('Please enter a reply message.')).toBeInTheDocument();

      const clearBtn = screen.getByRole('button', { name: /clear/i });
      await user.click(clearBtn);

      expect(screen.queryByText('Please enter a reply message.')).not.toBeInTheDocument();
      expect(textarea).toHaveValue('');
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
});
