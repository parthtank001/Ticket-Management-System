import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoResolveApi } from '../lib/auto-resolve-api';
import { apiClient } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('autoResolveApi Client Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('evaluate', () => {
    it('sends POST /api/auto-resolve/evaluate with payload and returns evaluation response', async () => {
      const mockResult = {
        canAutoResolve: true,
        autoResolveReason: 'Section 1 Match',
        category: 'TECHNICAL_QUESTION',
        priority: 'MEDIUM',
        summary: 'Summary bullets',
        confidence: 0.95,
        isEscalated: false,
      };

      (apiClient.post as any).mockResolvedValueOnce({ data: mockResult });

      const input = {
        subject: 'Cannot login',
        body: 'Forgot my password',
        studentName: 'Alice',
      };

      const result = await autoResolveApi.evaluate(input);

      expect(apiClient.post).toHaveBeenCalledWith('/api/auto-resolve/evaluate', input);
      expect(result).toEqual(mockResult);
    });

    it('extracts backend error messages and throws standard Error on failure', async () => {
      (apiClient.post as any).mockRejectedValueOnce({
        response: {
          data: {
            error: 'Message body cannot be empty.',
          },
        },
      });

      await expect(
        autoResolveApi.evaluate({ subject: 'Test', body: '' })
      ).rejects.toThrow('Message body cannot be empty.');
    });
  });

  describe('autoResolveTicket', () => {
    it('sends POST /api/auto-resolve/ticket/:id and returns result', async () => {
      const mockResult = {
        ticketId: 101,
        success: true,
        autoResolved: true,
        status: 'RESOLVED',
        previousStatus: 'NEW',
        reason: 'Resolved via KB',
        dryRun: false,
        messageAdded: true,
      };

      (apiClient.post as any).mockResolvedValueOnce({ data: mockResult });

      const result = await autoResolveApi.autoResolveTicket(101, { dryRun: false });

      expect(apiClient.post).toHaveBeenCalledWith('/api/auto-resolve/ticket/101', { dryRun: false });
      expect(result).toEqual(mockResult);
    });
  });

  describe('batchAutoResolve', () => {
    it('sends POST /api/auto-resolve/batch and returns batch summary', async () => {
      const mockBatchResult = {
        totalProcessed: 5,
        autoResolvedCount: 3,
        escalatedCount: 1,
        skippedCount: 1,
        dryRun: false,
        results: [],
      };

      (apiClient.post as any).mockResolvedValueOnce({ data: mockBatchResult });

      const result = await autoResolveApi.batchAutoResolve({ statusFilter: 'NEW', limit: 25 });

      expect(apiClient.post).toHaveBeenCalledWith('/api/auto-resolve/batch', {
        statusFilter: 'NEW',
        limit: 25,
      });
      expect(result).toEqual(mockBatchResult);
    });
  });

  describe('getStats', () => {
    it('sends GET /api/auto-resolve/stats and returns stats object', async () => {
      const mockStats = {
        totalTickets: 50,
        autoResolvedTickets: 12,
        openTickets: 20,
        resolvedTickets: 30,
        autoResolveRate: 24.0,
        categoryBreakdown: { GENERAL_QUESTION: 8, TECHNICAL_QUESTION: 4, REFUND_REQUEST: 0 },
        topMatchedSections: [],
      };

      (apiClient.get as any).mockResolvedValueOnce({ data: mockStats });

      const stats = await autoResolveApi.getStats();

      expect(apiClient.get).toHaveBeenCalledWith('/api/auto-resolve/stats');
      expect(stats).toEqual(mockStats);
    });
  });

  describe('getRules', () => {
    it('sends GET /api/auto-resolve/rules and returns rules array', async () => {
      const mockRules = [
        { id: 'kb-sec-1-password', section: 1, title: 'Password Reset', category: 'TECHNICAL_QUESTION' },
      ];

      (apiClient.get as any).mockResolvedValueOnce({ data: mockRules });

      const rules = await autoResolveApi.getRules();

      expect(apiClient.get).toHaveBeenCalledWith('/api/auto-resolve/rules');
      expect(rules).toEqual(mockRules);
    });
  });
});
