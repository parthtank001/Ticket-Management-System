import { describe, it, expect } from 'vitest';
import {
  parseEmailAddress,
  stripHtml,
  extractTicketNumberFromSubject,
  cleanMessageId,
  parseReferences,
  normalizeHeaders,
  detectAutoSubmitted,
  parseInboundEmail,
} from '@helpdesk/core';

describe('Email Parser Unit Tests', () => {
  describe('parseEmailAddress', () => {
    it('should extract name and email from RFC angle-bracket format', () => {
      const result = parseEmailAddress('"Sarah Connor" <sarah.connor@cyberdyne.com>');
      expect(result.name).toBe('Sarah Connor');
      expect(result.email).toBe('sarah.connor@cyberdyne.com');
    });

    it('should extract unquoted name and email', () => {
      const result = parseEmailAddress('Alex Murphy <alex.murphy@detroit.gov>');
      expect(result.name).toBe('Alex Murphy');
      expect(result.email).toBe('alex.murphy@detroit.gov');
    });

    it('should extract email when no name is present', () => {
      const result = parseEmailAddress('<student123@university.edu>');
      expect(result.name).toBe('student123');
      expect(result.email).toBe('student123@university.edu');
    });

    it('should extract plain email without brackets', () => {
      const result = parseEmailAddress('jane.doe@example.com');
      expect(result.name).toBe('jane.doe');
      expect(result.email).toBe('jane.doe@example.com');
    });
  });

  describe('stripHtml', () => {
    it('should convert HTML paragraphs and line breaks to plain text', () => {
      const html = '<p>Hello Support,</p><p>I cannot log in.<br/>Please help.</p>';
      const text = stripHtml(html);
      expect(text).toContain('Hello Support,');
      expect(text).toContain('I cannot log in.');
      expect(text).toContain('Please help.');
    });

    it('should remove style and script tags completely', () => {
      const html = '<style>body { color: red; }</style><script>alert("test")</script><p>Actual message</p>';
      const text = stripHtml(html);
      expect(text).toBe('Actual message');
    });
  });

  describe('extractTicketNumberFromSubject', () => {
    it('should extract ticket number from [Ticket #1042] tag', () => {
      const { ticketNumber, cleanSubject } = extractTicketNumberFromSubject('[Ticket #1042] Cannot access course materials');
      expect(ticketNumber).toBe(1042);
      expect(cleanSubject).toBe('Cannot access course materials');
    });

    it('should extract ticket number from Ticket #500 tag', () => {
      const { ticketNumber, cleanSubject } = extractTicketNumberFromSubject('Re: Ticket #500 Portal bug');
      expect(ticketNumber).toBe(500);
      expect(cleanSubject).toBe('Re: Portal bug');
    });

    it('should return original subject when no tag is found', () => {
      const { ticketNumber, cleanSubject } = extractTicketNumberFromSubject('New question about finals');
      expect(ticketNumber).toBeUndefined();
      expect(cleanSubject).toBe('New question about finals');
    });
  });

  describe('cleanMessageId & parseReferences', () => {
    it('should remove enclosing angle brackets from Message-ID', () => {
      expect(cleanMessageId('<msg-12345@mail.gmail.com>')).toBe('msg-12345@mail.gmail.com');
    });

    it('should parse space-separated or array references', () => {
      const raw = '<parent-1@example.com> <parent-2@example.com>';
      const refs = parseReferences(raw);
      expect(refs).toEqual(['parent-1@example.com', 'parent-2@example.com']);
    });
  });

  describe('detectAutoSubmitted (Anti-Loop Protection)', () => {
    it('should detect Auto-Submitted: auto-generated', () => {
      const headers = { 'auto-submitted': 'auto-generated' };
      const { isAutoSubmitted, reason } = detectAutoSubmitted(headers, 'Some subject', {});
      expect(isAutoSubmitted).toBe(true);
      expect(reason).toContain('Auto-Submitted');
    });

    it('should detect Auto-Submitted: auto-replied', () => {
      const headers = { 'auto-submitted': 'auto-replied' };
      const { isAutoSubmitted } = detectAutoSubmitted(headers, 'Some subject', {});
      expect(isAutoSubmitted).toBe(true);
    });

    it('should detect X-Autoreply header', () => {
      const headers = { 'x-autoreply': 'yes' };
      const { isAutoSubmitted } = detectAutoSubmitted(headers, 'Some subject', {});
      expect(isAutoSubmitted).toBe(true);
    });

    it('should detect automatic reply subjects', () => {
      const headers = {};
      const { isAutoSubmitted } = detectAutoSubmitted(headers, 'Automatic reply: Out of the office until Monday', {});
      expect(isAutoSubmitted).toBe(true);
    });

    it('should not flag normal student emails', () => {
      const headers = {};
      const { isAutoSubmitted } = detectAutoSubmitted(headers, 'Question regarding homework 4', {});
      expect(isAutoSubmitted).toBe(false);
    });
  });

  describe('parseInboundEmail (Full normalization)', () => {
    it('should normalize standard JSON payload', () => {
      const payload = {
        from: 'Alice Johnson <alice@student.edu>',
        to: 'support@helpdesk.com',
        subject: 'Need help with lecture video [Ticket #1020]',
        text: 'The video fails to load with error code 500.',
        messageId: '<msg-999@student.edu>',
        inReplyTo: '<msg-888@helpdesk.com>',
      };

      const parsed = parseInboundEmail(payload);
      expect(parsed.senderName).toBe('Alice Johnson');
      expect(parsed.senderEmail).toBe('alice@student.edu');
      expect(parsed.ticketNumberFromSubject).toBe(1020);
      expect(parsed.cleanSubject).toBe('Need help with lecture video');
      expect(parsed.body).toBe('The video fails to load with error code 500.');
      expect(parsed.messageId).toBe('msg-999@student.edu');
      expect(parsed.inReplyTo).toBe('msg-888@helpdesk.com');
      expect(parsed.isAutoSubmitted).toBe(false);
    });

    it('should normalize SendGrid format payload with HTML fallback', () => {
      const payload = {
        from: 'Bob Dylan <bob@music.edu>',
        to: 'support@helpdesk.com',
        subject: 'Course enrollment status',
        html: '<p>Hi,</p><p>Can you check my course enrollment status?</p>',
      };

      const parsed = parseInboundEmail(payload);
      expect(parsed.senderName).toBe('Bob Dylan');
      expect(parsed.senderEmail).toBe('bob@music.edu');
      expect(parsed.body).toContain('Can you check my course enrollment status?');
    });

    it('should normalize Mailgun format payload', () => {
      const payload = {
        sender: 'clara@university.edu',
        recipient: 'support@helpdesk.com',
        subject: 'Refund request for dropped lab',
        'stripped-text': 'I dropped the physics lab within the add/drop period. Please process my refund.',
        'Message-Id': '<mailgun-777@university.edu>',
      };

      const parsed = parseInboundEmail(payload);
      expect(parsed.senderName).toBe('clara');
      expect(parsed.senderEmail).toBe('clara@university.edu');
      expect(parsed.body).toContain('Please process my refund.');
      expect(parsed.messageId).toBe('mailgun-777@university.edu');
    });
  });
});
