import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ingestInboundEmail } from '../../../server/services/email-ingestion';
import { sendOutboundEmail } from '../../../server/services/email-sender';
import { verifyMailgunSignature, verifyWebhookSecret } from '../../../server/middleware/webhook-auth';
import { prisma } from '../../../server/db';
import crypto from 'node:crypto';

vi.mock('../../../server/db', () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    webhookLog: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../../../server/services/ai', () => ({
  scheduleTicketClassification: vi.fn(),
  getAiAgentUser: vi.fn().mockResolvedValue({ id: 'ai-agent-id', name: 'AI Support Agent' }),
}));

describe('Email Ingestion (Receiving) & Email Sender (Sending) Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MAILGUN_API_KEY;
    delete process.env.MAILGUN_DOMAIN;
    delete process.env.MAILGUN_SIGNING_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. INBOUND RECEIVING EMAIL TESTS
  // ==========================================
  describe('1. Inbound Email Ingestion (Receiving)', () => {
    it('creates a new ticket when receiving an email without existing thread tag', async () => {
      const mockTicket = {
        id: 101,
        subject: 'Cannot access physics lectures',
        studentEmail: 'student1@university.edu',
        studentName: 'Student One',
        body: 'Hello, the video player is giving me an error.',
        status: 'NEW',
        priority: 'MEDIUM',
        assignedAgentId: 'ai-agent-id',
        assignedAgent: { id: 'ai-agent-id', name: 'AI Support Agent' },
      };

      (prisma.ticket.create as any).mockResolvedValue(mockTicket);
      (prisma.webhookLog.findFirst as any).mockResolvedValue(null);
      (prisma.webhookLog.create as any).mockResolvedValue({ id: 'log-1' });

      const payload = {
        sender: 'student1@university.edu',
        from: '"Student One" <student1@university.edu>',
        recipient: 'support@helpdesk.com',
        subject: 'Cannot access physics lectures',
        'stripped-text': 'Hello, the video player is giving me an error.',
        'Message-Id': '<msg-101@university.edu>',
      };

      const result = await ingestInboundEmail(payload);

      expect(result.status).toBe('created');
      expect(result.ticketId).toBe(101);
      expect(result.isThreadReply).toBe(false);
      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studentEmail: 'student1@university.edu',
            studentName: 'Student One',
            subject: 'Cannot access physics lectures',
            body: 'Hello, the video player is giving me an error.',
            status: 'NEW',
          }),
        })
      );
    });

    it('appends reply to existing ticket when subject contains [Ticket #XXXX] tag', async () => {
      const existingTicket = {
        id: 105,
        subject: 'Billing inquiry',
        studentEmail: 'sarah@example.com',
        studentName: 'Sarah Connor',
        body: 'Original inquiry message.',
        status: 'OPEN',
      };

      (prisma.ticket.findUnique as any).mockResolvedValue(existingTicket);
      (prisma.ticket.update as any).mockResolvedValue({
        ...existingTicket,
        body: 'Original inquiry message.\n\n--- [Reply from Sarah Connor (sarah@example.com)] ---\nI have attached my payment receipt.',
      });
      (prisma.webhookLog.findFirst as any).mockResolvedValue(null);
      (prisma.webhookLog.create as any).mockResolvedValue({ id: 'log-2' });

      const replyPayload = {
        sender: 'sarah@example.com',
        from: 'Sarah Connor <sarah@example.com>',
        subject: 'Re: [Ticket #105] Billing inquiry',
        'stripped-text': 'I have attached my payment receipt.',
        'Message-Id': '<reply-105@example.com>',
        'In-Reply-To': '<msg-original@helpdesk.com>',
      };

      const result = await ingestInboundEmail(replyPayload);

      expect(result.status).toBe('appended');
      expect(result.ticketId).toBe(105);
      expect(result.isThreadReply).toBe(true);
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 105 },
          data: expect.objectContaining({
            body: expect.stringContaining('I have attached my payment receipt.'),
          }),
        })
      );
    });

    it('reopens closed/resolved tickets to OPEN when a customer replies', async () => {
      const closedTicket = {
        id: 106,
        subject: 'Password reset',
        studentEmail: 'alex@example.com',
        studentName: 'Alex Murphy',
        body: 'Old inquiry.',
        status: 'RESOLVED',
      };

      (prisma.ticket.findUnique as any).mockResolvedValue(closedTicket);
      (prisma.ticket.update as any).mockResolvedValue({
        ...closedTicket,
        status: 'OPEN',
      });
      (prisma.webhookLog.findFirst as any).mockResolvedValue(null);

      const replyPayload = {
        sender: 'alex@example.com',
        from: 'Alex Murphy <alex@example.com>',
        subject: '[Ticket #106] Password reset',
        'stripped-text': 'The reset link expired again, please send a new one.',
      };

      const result = await ingestInboundEmail(replyPayload);

      expect(result.status).toBe('appended');
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 106 },
          data: expect.objectContaining({
            status: 'OPEN',
          }),
        })
      );
    });

    it('applies anti-loop protection and drops auto-responders/out-of-office emails', async () => {
      (prisma.webhookLog.create as any).mockResolvedValue({ id: 'log-loop' });

      const loopPayload = {
        sender: 'robot@company.com',
        from: 'Mail Delivery System <robot@company.com>',
        subject: 'Automatic reply: Out of Office',
        body: 'I am on annual leave.',
        headers: {
          'auto-submitted': 'auto-generated',
        },
      };

      const result = await ingestInboundEmail(loopPayload);

      expect(result.status).toBe('ignored');
      expect(result.reason).toContain('Auto-Submitted');
      expect(prisma.ticket.create).not.toHaveBeenCalled();
      expect(prisma.ticket.update).not.toHaveBeenCalled();
    });

    it('rejects duplicate Message-ID that was already ingested', async () => {
      (prisma.webhookLog.findFirst as any).mockResolvedValue({
        id: 'log-existing',
        ticketId: 200,
        payload: '<duplicate-msg-id@example.com>',
      });

      const duplicatePayload = {
        sender: 'user@example.com',
        from: 'User <user@example.com>',
        subject: 'New Question',
        body: 'Some question.',
        'Message-Id': '<duplicate-msg-id@example.com>',
      };

      const result = await ingestInboundEmail(duplicatePayload);

      expect(result.status).toBe('duplicate');
      expect(result.ticketId).toBe(200);
      expect(prisma.ticket.create).not.toHaveBeenCalled();
    });

    it('throws validation error when sender email is invalid or missing', async () => {
      const invalidPayload = {
        sender: 'not-an-email',
        from: 'Bad Sender',
        subject: 'Hello',
        body: 'Message body',
      };

      await expect(ingestInboundEmail(invalidPayload)).rejects.toThrow(
        /valid sender email address is required/i
      );
    });

    it('throws validation error when email body is empty', async () => {
      const emptyBodyPayload = {
        sender: 'user@example.com',
        from: 'User <user@example.com>',
        subject: 'Hello',
        body: '   ',
      };

      await expect(ingestInboundEmail(emptyBodyPayload)).rejects.toThrow(
        /email body content cannot be empty/i
      );
    });
  });

  // ==========================================
  // 2. OUTBOUND SENDING EMAIL TESTS
  // ==========================================
  describe('2. Outbound Email Sender (Sending)', () => {
    it('sends mock/dev email with [Ticket #XXXX] subject formatting when credentials are unset', async () => {
      const result = await sendOutboundEmail({
        to: 'customer@example.com',
        toName: 'John Customer',
        subject: 'Regarding your inquiry',
        text: 'Hello John, we have resolved your issue.',
        ticketId: 501,
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('mock');
      expect(result.messageId).toContain('501');
      expect(result.messageId).toContain('mock-');
    });

    it('sends real email via Mailgun REST API when live credentials are provided', async () => {
      process.env.MAILGUN_API_KEY = 'key-real-live-mailgun-api-key-999';
      process.env.MAILGUN_DOMAIN = 'mg.myproductionhelpdesk.org';
      process.env.MAILGUN_HOST = 'api.mailgun.net';
      process.env.SUPPORT_EMAIL = 'support@mg.myproductionhelpdesk.org';

      const mockHttpClient = {
        post: vi.fn().mockResolvedValue({
          data: {
            id: '<20260928.msg-id-123@mg.myproductionhelpdesk.org>',
            message: 'Queued. Thank you.',
          },
        }),
      };

      const result = await sendOutboundEmail({
        to: 'customer@example.com',
        toName: 'Jane Student',
        subject: 'Course access updated',
        text: 'Your permissions are now active.',
        ticketId: 777,
        inReplyTo: '<student-inquiry-msg@university.edu>',
        references: ['<student-inquiry-msg@university.edu>'],
        httpClient: mockHttpClient,
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('mailgun');
      expect(result.messageId).toBe('<20260928.msg-id-123@mg.myproductionhelpdesk.org>');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.mailgun.net/v3/mg.myproductionhelpdesk.org/messages',
        expect.stringContaining('Course+access+updated'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: expect.stringContaining('Basic '),
          }),
        })
      );
    });

    it('handles Mailgun API failure gracefully and returns error info', async () => {
      process.env.MAILGUN_API_KEY = 'key-real-live-mailgun-api-key-999';
      process.env.MAILGUN_DOMAIN = 'mg.myproductionhelpdesk.org';

      const mockHttpClient = {
        post: vi.fn().mockRejectedValue({
          response: {
            data: { message: 'Domain not found or unauthorized' },
          },
          message: 'Request failed with status code 403',
        }),
      };

      const result = await sendOutboundEmail({
        to: 'customer@example.com',
        subject: 'Test Subject',
        text: 'Test Body',
        ticketId: 888,
        httpClient: mockHttpClient,
      });

      expect(result.success).toBe(false);
      expect(result.provider).toBe('mailgun');
      expect(result.error).toBe('Domain not found or unauthorized');
    });
  });

  // ==========================================
  // 3. MAILGUN SIGNATURE & WEBHOOK AUTH TESTS
  // ==========================================
  describe('3. Mailgun Webhook Signature Authentication', () => {
    it('verifies valid HMAC-SHA256 signature generated with signing key', () => {
      const signingKey = 'my-webhook-signing-key-xyz';
      const token = 'rand_token_50_chars_abc123';
      const timestamp = Math.floor(Date.now() / 1000);

      const expectedHmac = crypto
        .createHmac('sha256', signingKey)
        .update(`${timestamp}${token}`)
        .digest('hex');

      const isValid = verifyMailgunSignature(token, timestamp, expectedHmac, signingKey);
      expect(isValid).toBe(true);
    });

    it('rejects tampered or incorrect signature', () => {
      const signingKey = 'my-webhook-signing-key-xyz';
      const token = 'rand_token_50_chars_abc123';
      const timestamp = Math.floor(Date.now() / 1000);

      const isValid = verifyMailgunSignature(token, timestamp, 'bad_signature_hex_12345', signingKey);
      expect(isValid).toBe(false);
    });

    it('rejects expired timestamp older than 15 minutes (replay protection)', () => {
      const signingKey = 'my-webhook-signing-key-xyz';
      const token = 'rand_token_50_chars_abc123';
      const oldTimestamp = Math.floor(Date.now() / 1000) - 1000; // >16 minutes ago

      const hmac = crypto
        .createHmac('sha256', signingKey)
        .update(`${oldTimestamp}${token}`)
        .digest('hex');

      const isValid = verifyMailgunSignature(token, oldTimestamp, hmac, signingKey);
      expect(isValid).toBe(false);
    });

    it('middleware allows valid Mailgun signature and passes to next()', () => {
      process.env.MAILGUN_SIGNING_KEY = 'secret-signing-key';

      const token = 'token-123';
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = crypto
        .createHmac('sha256', 'secret-signing-key')
        .update(`${timestamp}${token}`)
        .digest('hex');

      const req: any = {
        body: { token, timestamp, signature },
        headers: {},
        query: {},
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      verifyWebhookSecret(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('middleware rejects invalid credentials with HTTP 401 Unauthorized', () => {
      process.env.MAILGUN_SIGNING_KEY = 'secret-signing-key';

      const req: any = {
        body: { token: 'bad-token', timestamp: 12345, signature: 'wrong-sig' },
        headers: {},
        query: {},
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      verifyWebhookSecret(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
        })
      );
    });
  });
});
