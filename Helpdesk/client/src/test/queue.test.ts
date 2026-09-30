import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  QUEUE_TICKET_CLASSIFICATION,
  QUEUE_TICKET_AUTO_RESOLVE,
  QUEUE_EMAIL_SEND,
  QUEUE_EMAIL_INBOUND,
  isQueueReady,
  enqueueTicketClassification,
  scheduleTicketClassification,
  enqueueTicketAutoResolve,
  scheduleTicketAutoResolve,
  enqueueEmailSend,
  scheduleEmailSend,
  enqueueInboundEmail,
  scheduleInboundEmail,
  getBossInstance,
  stopQueue,
} from '../../../server/services/queue';
import * as aiModule from '../../../server/services/ai';
import * as autoResolveModule from '../../../server/services/auto-resolve';
import * as emailSenderModule from '../../../server/services/email-sender';
import * as emailIngestionModule from '../../../server/services/email-ingestion';

vi.mock('../../../server/db', () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    webhookLog: {
      create: vi.fn(),
    },
  },
  checkDatabaseConnection: vi.fn(),
}));

describe('pg-boss Job Queue Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Queue Constants & Status Checks', () => {
    it('defines ticket-classification and email queue name constants', () => {
      expect(QUEUE_TICKET_CLASSIFICATION).toBe('ticket-classification');
      expect(QUEUE_TICKET_AUTO_RESOLVE).toBe('ticket-auto-resolve');
      expect(QUEUE_EMAIL_SEND).toBe('email-send');
      expect(QUEUE_EMAIL_INBOUND).toBe('email-inbound');
    });

    it('returns false for isQueueReady when queue is not initialized', () => {
      expect(isQueueReady()).toBe(false);
      expect(getBossInstance()).toBeNull();
    });
  });

  describe('enqueueTicketClassification & scheduleTicketClassification', () => {
    it('falls back to non-blocking setImmediate execution when pg-boss is not active', async () => {
      const classifySpy = vi.spyOn(aiModule, 'classifyTicketInBackground').mockResolvedValueOnce({
        id: 101,
        category: 'GENERAL_QUESTION',
      } as any);

      const jobId = await enqueueTicketClassification(101, { preserveCategoryIfSet: true });
      expect(jobId).toBeNull();

      // Wait a tick for setImmediate to execute
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(classifySpy).toHaveBeenCalledWith(101, { preserveCategoryIfSet: true });
      classifySpy.mockRestore();
    });

    it('scheduleTicketClassification dispatches without throwing', () => {
      expect(() => scheduleTicketClassification(202)).not.toThrow();
    });
  });

  describe('enqueueTicketAutoResolve & scheduleTicketAutoResolve', () => {
    it('falls back to non-blocking setImmediate execution when pg-boss is not active', async () => {
      const autoResolveSpy = vi.spyOn(autoResolveModule, 'autoResolveSingleTicket').mockResolvedValueOnce({
        status: 'RESOLVED',
      } as any);

      const jobId = await enqueueTicketAutoResolve(105);
      expect(jobId).toBeNull();

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(autoResolveSpy).toHaveBeenCalledWith(105, undefined);
      autoResolveSpy.mockRestore();
    });

    it('scheduleTicketAutoResolve dispatches without throwing', () => {
      expect(() => scheduleTicketAutoResolve(205)).not.toThrow();
    });
  });

  describe('enqueueEmailSend & scheduleEmailSend', () => {
    it('falls back to non-blocking setImmediate execution and dispatches email', async () => {
      const sendSpy = vi.spyOn(emailSenderModule, 'sendOutboundEmail').mockResolvedValueOnce({
        success: true,
        messageId: '<msg-123@mailgun.org>',
        provider: 'mailgun',
      });

      const jobId = await enqueueEmailSend({
        options: {
          to: 'student@example.com',
          subject: 'Test Subject',
          text: 'Test Body',
        },
      });
      expect(jobId).toBeNull();

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(sendSpy).toHaveBeenCalledWith({
        to: 'student@example.com',
        subject: 'Test Subject',
        text: 'Test Body',
      });
      sendSpy.mockRestore();
    });

    it('scheduleEmailSend dispatches without throwing', () => {
      expect(() =>
        scheduleEmailSend({
          options: { to: 'student@example.com', subject: 'Hi', text: 'Hello' },
        })
      ).not.toThrow();
    });
  });

  describe('enqueueInboundEmail & scheduleInboundEmail', () => {
    it('falls back to non-blocking setImmediate execution and processes inbound email', async () => {
      const ingestSpy = vi.spyOn(emailIngestionModule, 'ingestInboundEmail').mockResolvedValueOnce({
        status: 'created',
        isThreadReply: false,
        ticketId: 301,
      });

      const jobId = await enqueueInboundEmail({
        payload: { sender: 'student@example.com', subject: 'Help' },
      });
      expect(jobId).toBeNull();

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(ingestSpy).toHaveBeenCalledWith({ sender: 'student@example.com', subject: 'Help' });
      ingestSpy.mockRestore();
    });

    it('scheduleInboundEmail dispatches without throwing', () => {
      expect(() =>
        scheduleInboundEmail({ payload: { sender: 'test@example.com' } })
      ).not.toThrow();
    });
  });

  describe('stopQueue', () => {
    it('stopQueue handles stopping gracefully when queue was not started', async () => {
      await expect(stopQueue()).resolves.toBeUndefined();
      expect(isQueueReady()).toBe(false);
    });
  });
});

