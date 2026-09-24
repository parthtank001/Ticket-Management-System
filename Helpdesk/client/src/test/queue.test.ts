import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  QUEUE_TICKET_CLASSIFICATION,
  isQueueReady,
  enqueueTicketClassification,
  scheduleTicketClassification,
  getBossInstance,
  stopQueue,
} from '../../../server/services/queue';
import * as aiModule from '../../../server/services/ai';

vi.mock('../../../server/db', () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  checkDatabaseConnection: vi.fn(),
}));

describe('pg-boss Job Queue Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Queue Constants & Status Checks', () => {
    it('defines ticket-classification queue name constant', () => {
      expect(QUEUE_TICKET_CLASSIFICATION).toBe('ticket-classification');
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

    it('stopQueue handles stopping gracefully when queue was not started', async () => {
      await expect(stopQueue()).resolves.toBeUndefined();
      expect(isQueueReady()).toBe(false);
    });
  });
});
