import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classificationApi } from '../lib/classification-api';
import { apiClient } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('classificationApi Client Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('evaluate', () => {
    it('sends POST to /api/classify/evaluate and returns evaluation result', async () => {
      const mockResult = {
        category: 'TECHNICAL_QUESTION',
        priority: 'MEDIUM',
        summary: '• Password reset failure',
        aiDraftResponse: 'Hello Alice,\n\nFollow these steps...',
        confidence: 0.95,
        reasoning: 'Password reset keywords',
        tags: ['password-reset', 'technical'],
        isEscalated: false,
      };

      (apiClient.post as any).mockResolvedValueOnce({ data: mockResult });

      const res = await classificationApi.evaluate({
        subject: 'Cannot login',
        body: 'Forgot password',
        studentName: 'Alice',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/classify/evaluate', {
        subject: 'Cannot login',
        body: 'Forgot password',
        studentName: 'Alice',
      });
      expect(res).toEqual(mockResult);
    });

    it('throws extracted error message on failure', async () => {
      (apiClient.post as any).mockRejectedValueOnce({
        response: { data: { error: 'Subject is required' } },
      });

      await expect(
        classificationApi.evaluate({ subject: '', body: '' })
      ).rejects.toThrow('Subject is required');
    });
  });

  describe('classifyTicket', () => {
    it('sends POST to /api/classify/ticket/:id with options', async () => {
      const mockResponse = {
        ticketId: 10,
        success: true,
        category: 'GENERAL_QUESTION',
        priority: 'LOW',
        summary: '• Certificate inquiry',
        aiDraftResponse: 'Hello Bob...',
        confidence: 0.95,
        reasoning: 'Certificate keywords',
        tags: ['certificate'],
        dryRun: false,
        updated: true,
      };

      (apiClient.post as any).mockResolvedValueOnce({ data: mockResponse });

      const res = await classificationApi.classifyTicket(10, { force: true });

      expect(apiClient.post).toHaveBeenCalledWith('/api/classify/ticket/10', { force: true });
      expect(res).toEqual(mockResponse);
    });
  });

  describe('batchClassify', () => {
    it('sends POST to /api/classify/batch and returns batch result', async () => {
      const mockBatchResponse = {
        totalProcessed: 5,
        classifiedCount: 5,
        updatedCount: 4,
        skippedCount: 1,
        failedCount: 0,
        dryRun: false,
        results: [],
      };

      (apiClient.post as any).mockResolvedValueOnce({ data: mockBatchResponse });

      const res = await classificationApi.batchClassify({ statusFilter: 'UNCLASSIFIED', limit: 25 });

      expect(apiClient.post).toHaveBeenCalledWith('/api/classify/batch', {
        statusFilter: 'UNCLASSIFIED',
        limit: 25,
      });
      expect(res).toEqual(mockBatchResponse);
    });
  });

  describe('getStats', () => {
    it('sends GET to /api/classify/stats', async () => {
      const mockStats = {
        totalTickets: 50,
        classifiedTickets: 48,
        unclassifiedTickets: 2,
        classificationRate: 0.96,
        categoryBreakdown: { GENERAL_QUESTION: 20, TECHNICAL_QUESTION: 20, REFUND_REQUEST: 8 },
        priorityBreakdown: { LOW: 15, MEDIUM: 25, HIGH: 8, URGENT: 2 },
        averageConfidence: 0.92,
      };

      (apiClient.get as any).mockResolvedValueOnce({ data: mockStats });

      const res = await classificationApi.getStats();

      expect(apiClient.get).toHaveBeenCalledWith('/api/classify/stats');
      expect(res).toEqual(mockStats);
    });
  });

  describe('getCategories', () => {
    it('sends GET to /api/classify/categories', async () => {
      const mockCategories = [
        { id: 'cat-1', category: 'GENERAL_QUESTION', title: 'General' },
      ];

      (apiClient.get as any).mockResolvedValueOnce({ data: mockCategories });

      const res = await classificationApi.getCategories();

      expect(apiClient.get).toHaveBeenCalledWith('/api/classify/categories');
      expect(res).toEqual(mockCategories);
    });
  });
});
