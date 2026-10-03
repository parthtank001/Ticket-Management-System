import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SendMailgunEmailModal } from '../SendMailgunEmailModal';
import { ticketsApi } from '../../lib/tickets-api';
import type { Ticket } from '../../lib/types';

vi.mock('../../lib/tickets-api', () => ({
  ticketsApi: {
    sendEmail: vi.fn(),
    polishReply: vi.fn(),
  },
}));

const mockTicket: Ticket = {
  id: 101,
  subject: 'Cannot login to course',
  studentName: 'Parth Tank',
  studentEmail: 'parthstank001@gmail.com',
  body: 'I forgot my password and need assistance.',
  category: 'TECHNICAL_QUESTION',
  priority: 'HIGH',
  status: 'OPEN',
  summary: 'Student cannot login',
  aiDraftResponse: 'Hello Parth, please reset your password using the recovery link.',
  assignedAgentId: null,
  createdAt: '2026-09-28T10:00:00.000Z',
  updatedAt: '2026-09-28T10:00:00.000Z',
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('SendMailgunEmailModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = renderWithClient(
      <SendMailgunEmailModal isOpen={false} onClose={vi.fn()} ticket={mockTicket} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal dialog and pre-populates fields with ticket details', () => {
    renderWithClient(
      <SendMailgunEmailModal isOpen={true} onClose={vi.fn()} ticket={mockTicket} />
    );

    expect(screen.getByText('Send Email via Mailgun')).toBeInTheDocument();
    expect(screen.getByText('Mailgun Sandbox')).toBeInTheDocument();
    expect(screen.getByDisplayValue('parthstank001@gmail.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Parth Tank')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/\[Ticket #101\] Re: Cannot login to course/)).toBeInTheDocument();
  });

  it('inserts AI Draft Response into textarea when Insert AI Draft is clicked', async () => {
    const user = userEvent.setup();
    renderWithClient(
      <SendMailgunEmailModal isOpen={true} onClose={vi.fn()} ticket={mockTicket} />
    );

    const insertDraftBtn = screen.getByRole('button', { name: /Insert AI Draft/i });
    await user.click(insertDraftBtn);

    const bodyTextarea = screen.getByPlaceholderText(/Write your email message/i);
    expect(bodyTextarea).toHaveValue('Hello Parth, please reset your password using the recovery link.');
  });

  it('inserts chosen template into subject and body when selected from dropdown', async () => {
    const user = userEvent.setup();
    renderWithClient(
      <SendMailgunEmailModal isOpen={true} onClose={vi.fn()} ticket={mockTicket} />
    );

    const templateSelect = screen.getByLabelText(/Insert quick response template/i);
    await user.selectOptions(templateSelect, 'certificate');

    const bodyTextarea = screen.getByPlaceholderText(/Write your email message/i) as HTMLTextAreaElement;
    expect(bodyTextarea.value).toContain('Certificate of Completion');
  });

  it('polishes email draft using AI when Polish with AI is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(ticketsApi.polishReply).mockResolvedValueOnce({
      originalText: 'hi fix this',
      polishedReply: 'Hello Parth, We have investigated your account and resolved the login issue.',
    });

    renderWithClient(
      <SendMailgunEmailModal isOpen={true} onClose={vi.fn()} ticket={mockTicket} />
    );

    const bodyTextarea = screen.getByPlaceholderText(/Write your email message/i);
    await user.type(bodyTextarea, 'hi fix this');

    const polishBtn = screen.getByRole('button', { name: /Polish with AI/i });
    await user.click(polishBtn);

    await waitFor(() => {
      expect(ticketsApi.polishReply).toHaveBeenCalledWith({
        text: 'hi fix this',
        studentName: 'Parth Tank',
        category: 'TECHNICAL_QUESTION',
      });
      expect(bodyTextarea).toHaveValue('Hello Parth, We have investigated your account and resolved the login issue.');
      expect(screen.getByText(/Polished with AI/i)).toBeInTheDocument();
    });
  });

  it('validates required fields before submitting', async () => {
    const user = userEvent.setup();
    renderWithClient(
      <SendMailgunEmailModal isOpen={true} onClose={vi.fn()} ticket={null} />
    );

    const sendBtn = screen.getByRole('button', { name: /Send Email/i });
    await user.click(sendBtn);

    expect(screen.getByText(/Recipient email is required/i)).toBeInTheDocument();
    expect(ticketsApi.sendEmail).not.toHaveBeenCalled();
  });

  it('submits email via Mailgun, shows success banner, and invokes onSuccess callback', async () => {
    const user = userEvent.setup();
    const onSuccessMock = vi.fn();
    vi.mocked(ticketsApi.sendEmail).mockResolvedValueOnce({
      success: true,
      messageId: '<20260928120000.abcd@sandboxea1b.mailgun.org>',
      provider: 'mailgun',
    });

    renderWithClient(
      <SendMailgunEmailModal
        isOpen={true}
        onClose={vi.fn()}
        ticket={mockTicket}
        onSuccess={onSuccessMock}
      />
    );

    const bodyTextarea = screen.getByPlaceholderText(/Write your email message/i);
    await user.type(bodyTextarea, 'Your access has been restored.');

    const sendBtn = screen.getByRole('button', { name: /Send Email/i });
    await user.click(sendBtn);

    await waitFor(() => {
      expect(ticketsApi.sendEmail).toHaveBeenCalledWith({
        ticketId: 101,
        to: 'parthstank001@gmail.com',
        toName: 'Parth Tank',
        subject: '[Ticket #101] Re: Cannot login to course',
        text: 'Your access has been restored.',
        statusUpdate: 'RESOLVED',
      });
      expect(screen.getByText(/Email successfully delivered via Mailgun!/i)).toBeInTheDocument();
      expect(screen.getByText(/Message-ID: <20260928120000.abcd@sandboxea1b.mailgun.org>/i)).toBeInTheDocument();
      expect(onSuccessMock).toHaveBeenCalledWith({
        messageId: '<20260928120000.abcd@sandboxea1b.mailgun.org>',
        provider: 'mailgun',
      });
    });
  });

  it('displays error banner when sending rejects', async () => {
    const user = userEvent.setup();
    const onErrorMock = vi.fn();
    vi.mocked(ticketsApi.sendEmail).mockRejectedValueOnce(
      new Error('Mailgun sandbox recipient not authorized')
    );

    renderWithClient(
      <SendMailgunEmailModal
        isOpen={true}
        onClose={vi.fn()}
        ticket={mockTicket}
        onError={onErrorMock}
      />
    );

    const bodyTextarea = screen.getByPlaceholderText(/Write your email message/i);
    await user.type(bodyTextarea, 'Test body');

    const sendBtn = screen.getByRole('button', { name: /Send Email/i });
    await user.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Mailgun sandbox recipient not authorized/i)).toBeInTheDocument();
      expect(onErrorMock).toHaveBeenCalled();
    });
  });
});
