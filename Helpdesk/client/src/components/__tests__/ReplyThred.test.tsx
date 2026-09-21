import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReplyThred, ReplyThread } from '../ReplyThred';
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
  {
    id: 'msg-4',
    ticketId: 42,
    senderType: 'SYSTEM',
    senderEmail: 'system@helpdesk.com',
    body: 'Automatic ticket priority elevated to HIGH.',
    isInternalNote: false,
    createdAt: '2026-03-01T10:45:00.000Z',
  },
];

describe('ReplyThred Component', () => {
  describe('1. Empty Thread States', () => {
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
  });

  describe('2. Thread Rendering & Header Count Pluralization', () => {
    it('renders conversation thread with all messages and correct pluralized count header', () => {
      render(<ReplyThred messages={mockMessages} />);

      expect(screen.getByText('Conversation Thread (4)')).toBeInTheDocument();
      expect(screen.getByText('4 messages')).toBeInTheDocument();

      // Verify messages content
      expect(screen.getByText('I cannot connect to the internal VPN from campus dorms.')).toBeInTheDocument();
      expect(screen.getByText('Investigating routing logs for building B.')).toBeInTheDocument();
      expect(screen.getByText('Please try authenticating with your Duo MFA token again.')).toBeInTheDocument();
      expect(screen.getByText('Automatic ticket priority elevated to HIGH.')).toBeInTheDocument();

      // Verify sender emails
      expect(screen.getByText('maya@student.edu')).toBeInTheDocument();
      expect(screen.getAllByText('smith@helpdesk.com')).toHaveLength(2);
      expect(screen.getByText('system@helpdesk.com')).toBeInTheDocument();
    });

    it('renders singular "1 message" count when exactly 1 message is in thread', () => {
      render(<ReplyThred messages={[mockMessages[0]]} />);

      expect(screen.getByText('Conversation Thread (1)')).toBeInTheDocument();
      expect(screen.getByText('1 message')).toBeInTheDocument();
    });

    it('hides header bar when showHeader is false', () => {
      render(<ReplyThred messages={mockMessages} showHeader={false} />);

      expect(screen.queryByText(/conversation thread/i)).not.toBeInTheDocument();
      expect(screen.getByText('I cannot connect to the internal VPN from campus dorms.')).toBeInTheDocument();
    });
  });

  describe('3. Sender Badges & Styling Variants', () => {
    it('renders appropriate sender role badges (Student, Internal Note, Support Agent, System)', () => {
      render(<ReplyThred messages={mockMessages} />);

      expect(screen.getByText('Student')).toBeInTheDocument();
      expect(screen.getByText('Internal Note')).toBeInTheDocument();
      expect(screen.getByText('Support Agent')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('applies corresponding variant styling classes to message items', () => {
      const { container } = render(<ReplyThred messages={mockMessages} />);

      const studentMsg = container.querySelector('.thread-message-student');
      expect(studentMsg).toBeInTheDocument();

      const noteMsg = container.querySelector('.thread-message-note');
      expect(noteMsg).toBeInTheDocument();

      const agentMsg = container.querySelector('.thread-message-agent');
      expect(agentMsg).toBeInTheDocument();
    });
  });

  describe('4. Custom Attributes, Fallbacks & Aliases', () => {
    it('applies custom className to the wrapper container', () => {
      const { container } = render(<ReplyThred messages={mockMessages} className="custom-thread-class" />);

      expect(container.querySelector('.custom-thread-class')).toBeInTheDocument();
    });

    it('renders messages gracefully when msg.id is empty or missing using index key fallback', () => {
      const messagesWithoutId: TicketMessage[] = [
        {
          id: '',
          ticketId: 42,
          senderType: 'STUDENT',
          senderEmail: 'test@student.edu',
          body: 'Fallback index test body',
          isInternalNote: false,
          createdAt: '2026-03-01T10:00:00.000Z',
        },
      ];

      render(<ReplyThred messages={messagesWithoutId} />);
      expect(screen.getByText('Fallback index test body')).toBeInTheDocument();
      expect(screen.getByText('test@student.edu')).toBeInTheDocument();
    });

    it('exports ReplyThread alias correctly', () => {
      expect(ReplyThread).toBe(ReplyThred);
    });
  });

  describe('5. Rich HTML Body Rendering & DOMPurify XSS Sanitization', () => {
    it('renders sanitized bodyHtml when present in a message', () => {
      const messagesWithHtml: TicketMessage[] = [
        {
          id: 'msg-html-1',
          ticketId: 42,
          senderType: 'STUDENT',
          senderEmail: 'student@example.edu',
          body: 'Plain text fallback',
          bodyHtml: '<p>Hello from <strong>rich text</strong> formatted email!</p>',
          isInternalNote: false,
          createdAt: '2026-03-01T11:00:00.000Z',
        },
      ];

      const { container } = render(<ReplyThred messages={messagesWithHtml} />);
      const strongElement = container.querySelector('strong');
      expect(strongElement).toBeInTheDocument();
      expect(strongElement?.textContent).toBe('rich text');
      expect(screen.getByText(/rich text/)).toBeInTheDocument();
    });

    it('sanitizes and strips malicious <script> tags from bodyHtml', () => {
      const messagesWithXss: TicketMessage[] = [
        {
          id: 'msg-xss-1',
          ticketId: 42,
          senderType: 'STUDENT',
          senderEmail: 'attacker@example.edu',
          body: 'Plain text body',
          bodyHtml: '<p>Safe intro</p><script>alert("XSS")</script><p>Safe outro</p>',
          isInternalNote: false,
          createdAt: '2026-03-01T11:00:00.000Z',
        },
      ];

      const { container } = render(<ReplyThred messages={messagesWithXss} />);
      expect(container.querySelector('script')).toBeNull();
      expect(container.innerHTML).not.toContain('alert("XSS")');
      expect(screen.getByText('Safe intro')).toBeInTheDocument();
      expect(screen.getByText('Safe outro')).toBeInTheDocument();
    });

    it('sanitizes and strips dangerous onerror event handlers and javascript: URLs from bodyHtml', () => {
      const messagesWithEventHandlers: TicketMessage[] = [
        {
          id: 'msg-xss-2',
          ticketId: 42,
          senderType: 'STUDENT',
          senderEmail: 'attacker@example.edu',
          body: 'Plain text body',
          bodyHtml: '<img src="invalid.png" onerror="alert(\'XSS\')" /><a href="javascript:stealData()">Click here</a>',
          isInternalNote: false,
          createdAt: '2026-03-01T11:00:00.000Z',
        },
      ];

      const { container } = render(<ReplyThred messages={messagesWithEventHandlers} />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute('onerror')).toBeNull();

      const anchor = container.querySelector('a');
      expect(anchor).toBeInTheDocument();
      expect(anchor?.getAttribute('href')).toBeNull();
    });
  });
});
