import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReplyThred } from '../ReplyThred';
import type { TicketMessage } from '../../lib/types';

const mockMessages: TicketMessage[] = [
  {
    id: 'msg-1',
    ticketId: 42,
    senderType: 'STUDENT',
    senderEmail: 'maya@student.edu',
    body: 'I cannot connect to the internal VPN from campus dorms.',
    isInternalNote: false,
    createdAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'msg-2',
    ticketId: 42,
    senderType: 'AGENT',
    senderEmail: 'smith@helpdesk.com',
    body: 'Investigating routing logs for building B.',
    isInternalNote: true,
    createdAt: '2026-03-01T10:15:00.000Z',
  },
  {
    id: 'msg-3',
    ticketId: 42,
    senderType: 'AGENT',
    senderEmail: 'smith@helpdesk.com',
    body: 'Please try authenticating with your Duo MFA token again.',
    isInternalNote: false,
    createdAt: '2026-03-01T10:30:00.000Z',
  },
];

describe('ReplyThred Component', () => {
  it('renders empty thread state when messages array is empty or undefined', () => {
    const { rerender } = render(<ReplyThred messages={[]} />);

    expect(screen.getByText('Conversation Thread (0)')).toBeInTheDocument();
    expect(screen.getByText('No messages in thread yet.')).toBeInTheDocument();

    rerender(<ReplyThred messages={undefined} />);
    expect(screen.getByText('Conversation Thread (0)')).toBeInTheDocument();
    expect(screen.getByText('No messages in thread yet.')).toBeInTheDocument();
  });

  it('renders custom empty message when specified', () => {
    render(<ReplyThred messages={[]} emptyMessage="No ticket conversation history recorded." />);

    expect(screen.getByText('No ticket conversation history recorded.')).toBeInTheDocument();
  });

  it('renders conversation thread with all messages and correct count header', () => {
    render(<ReplyThred messages={mockMessages} />);

    expect(screen.getByText('Conversation Thread (3)')).toBeInTheDocument();
    expect(screen.getByText('3 messages')).toBeInTheDocument();

    // Verify messages content
    expect(screen.getByText('I cannot connect to the internal VPN from campus dorms.')).toBeInTheDocument();
    expect(screen.getByText('Investigating routing logs for building B.')).toBeInTheDocument();
    expect(screen.getByText('Please try authenticating with your Duo MFA token again.')).toBeInTheDocument();

    // Verify sender emails
    expect(screen.getByText('maya@student.edu')).toBeInTheDocument();
    expect(screen.getAllByText('smith@helpdesk.com')).toHaveLength(2);
  });

  it('renders singular "1 message" count when exactly 1 message is in thread', () => {
    render(<ReplyThred messages={[mockMessages[0]]} />);

    expect(screen.getByText('Conversation Thread (1)')).toBeInTheDocument();
    expect(screen.getByText('1 message')).toBeInTheDocument();
  });

  it('renders appropriate sender role badges (Student, Internal Note, Support Agent)', () => {
    render(<ReplyThred messages={mockMessages} />);

    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('Internal Note')).toBeInTheDocument();
    expect(screen.getByText('Support Agent')).toBeInTheDocument();
  });

  it('hides header bar when showHeader is false', () => {
    render(<ReplyThred messages={mockMessages} showHeader={false} />);

    expect(screen.queryByText('Conversation Thread (3)')).not.toBeInTheDocument();
    expect(screen.getByText('I cannot connect to the internal VPN from campus dorms.')).toBeInTheDocument();
  });

  it('applies custom className to the wrapper container', () => {
    const { container } = render(<ReplyThred messages={mockMessages} className="custom-thread-class" />);

    expect(container.querySelector('.custom-thread-class')).toBeInTheDocument();
  });
});
