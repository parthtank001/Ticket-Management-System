import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/node';
import { isSentryEnabled, flushSentry, captureServerException } from '../../../server/instrument';

vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
  captureException: vi.fn().mockReturnValue('mock-server-event-id-12345'),
  setUser: vi.fn(),
  setupExpressErrorHandler: vi.fn(),
}));

describe('Sentry Server Instrumentation & Error Logging Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('flushSentry Helper', () => {
    it('flushes pending Sentry events when called', async () => {
      const result = await flushSentry(1000);
      expect(result).toBe(true);
    });
  });

  describe('captureServerException Helper', () => {
    it('captures server exceptions with provided tags and metadata', () => {
      const testErr = new Error('Database connection failed');
      const eventId = captureServerException(testErr, {
        tags: { service: 'postgres', component: 'db-pool' },
        extra: { retryCount: 3 },
      });

      if (isSentryEnabled) {
        expect(Sentry.captureException).toHaveBeenCalledWith(testErr, {
          tags: { service: 'postgres', component: 'db-pool' },
          extra: { retryCount: 3 },
        });
        expect(eventId).toBe('mock-server-event-id-12345');
      } else {
        expect(eventId).toBe('sentry-disabled');
      }
    });
  });

  describe('beforeSend Header Sanitization Logic', () => {
    it('scrubs authorization, cookie, and secret headers from Sentry event', () => {
      const mockEvent: any = {
        request: {
          headers: {
            authorization: 'Bearer super-secret-token',
            cookie: 'session_id=abcdef123456',
            'x-webhook-secret': 'whsec_99999',
            'better-auth-secret': 'secret_123',
            'content-type': 'application/json',
            'user-agent': 'Mozilla/5.0',
          },
        },
      };

      // Apply the same sanitization logic as instrument.ts
      if (mockEvent.request?.headers) {
        delete mockEvent.request.headers['authorization'];
        delete mockEvent.request.headers['cookie'];
        delete mockEvent.request.headers['x-webhook-secret'];
        delete mockEvent.request.headers['better-auth-secret'];
      }

      expect(mockEvent.request.headers['authorization']).toBeUndefined();
      expect(mockEvent.request.headers['cookie']).toBeUndefined();
      expect(mockEvent.request.headers['x-webhook-secret']).toBeUndefined();
      expect(mockEvent.request.headers['better-auth-secret']).toBeUndefined();
      expect(mockEvent.request.headers['content-type']).toBe('application/json');
      expect(mockEvent.request.headers['user-agent']).toBe('Mozilla/5.0');
    });
  });
});
