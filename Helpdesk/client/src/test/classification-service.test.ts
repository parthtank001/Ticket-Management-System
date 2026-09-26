import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluateInquiryForClassification,
  extractClassificationTags,
  generateClassificationReasoning,
  calculateClassificationConfidence,
  classifySingleTicket,
  batchClassifyTickets,
  getClassificationMetrics,
  getAvailableClassificationCategories,
} from '../../../server/services/classification';
import { prisma } from '../../../server/db';

vi.mock('../../../server/db', () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    webhookLog: {
      create: vi.fn(),
    },
  },
}));

describe('Classification Module Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. getAvailableClassificationCategories', () => {
    it('returns all 3 official classification categories with descriptive metadata', () => {
      const categories = getAvailableClassificationCategories();
      expect(categories).toHaveLength(3);

      const categoryIds = categories.map((c) => c.category);
      expect(categoryIds).toContain('GENERAL_QUESTION');
      expect(categoryIds).toContain('TECHNICAL_QUESTION');
      expect(categoryIds).toContain('REFUND_REQUEST');

      const refund = categories.find((c) => c.category === 'REFUND_REQUEST');
      expect(refund?.defaultPriority).toBe('HIGH');
      expect(refund?.keywords).toContain('refund');
      expect(refund?.examples.length).toBeGreaterThan(0);
    });
  });

  describe('2. extractClassificationTags', () => {
    it('extracts refund and 30-day guarantee tags for refund inquiries', () => {
      const tags = extractClassificationTags(
        'Refund request for Ultimate React',
        'I want a refund under the 30 day guarantee',
        'REFUND_REQUEST'
      );
      expect(tags).toContain('billing');
      expect(tags).toContain('refund');
      expect(tags).toContain('30-day-guarantee');
    });

    it('extracts technical, password-reset and video tags for technical inquiries', () => {
      const tags = extractClassificationTags(
        'Video playback buffer error',
        'I also need to reset password',
        'TECHNICAL_QUESTION'
      );
      expect(tags).toContain('technical');
      expect(tags).toContain('video-playback');
      expect(tags).toContain('password-reset');
    });

    it('extracts general, certificate, and lifetime tags for general questions', () => {
      const tags = extractClassificationTags(
        'Course certificate and lifetime access',
        'How do I download my certificate of completion?',
        'GENERAL_QUESTION'
      );
      expect(tags).toContain('general');
      expect(tags).toContain('certificate');
      expect(tags).toContain('lifetime-access');
    });
  });

  describe('3. calculateClassificationConfidence', () => {
    it('returns 0.95 when Knowledge Base match is found', () => {
      const confidence = calculateClassificationConfidence(
        'TECHNICAL_QUESTION',
        'Password reset',
        'Forgot password',
        true
      );
      expect(confidence).toBe(0.95);
    });

    it('returns 0.90 for high-density keyword matches without direct KB match', () => {
      const confidence = calculateClassificationConfidence(
        'REFUND_REQUEST',
        'Need money back and invoice receipt',
        'Please process my refund and cancel subscription',
        false
      );
      expect(confidence).toBe(0.90);
    });

    it('returns default confidence for sparse keyword matches', () => {
      const confidence = calculateClassificationConfidence(
        'GENERAL_QUESTION',
        'Hello support',
        'I have a question about Python',
        false
      );
      expect(confidence).toBe(0.75);
    });
  });

  describe('4. generateClassificationReasoning', () => {
    it('mentions escalation reason when inquiry is escalated', () => {
      const reasoning = generateClassificationReasoning(
        'REFUND_REQUEST',
        'HIGH',
        true,
        'Refund outside 30-day window'
      );
      expect(reasoning).toContain('Refund outside 30-day window');
      expect(reasoning).toContain('REFUND_REQUEST');
    });

    it('mentions Knowledge Base section when matched', () => {
      const reasoning = generateClassificationReasoning(
        'TECHNICAL_QUESTION',
        'MEDIUM',
        false,
        undefined,
        'Section 1 (Password Reset)'
      );
      expect(reasoning).toContain('Section 1 (Password Reset)');
    });
  });

  describe('5. evaluateInquiryForClassification', () => {
    it('evaluates password reset inquiry as TECHNICAL_QUESTION', async () => {
      const result = await evaluateInquiryForClassification({
        subject: 'Cannot login to my account',
        body: 'I forgot my password and reset email is not coming.',
        studentName: 'Bob Dylan',
      });

      expect(result.category).toBe('TECHNICAL_QUESTION');
      expect(result.priority).toBe('MEDIUM');
      expect(result.summary).toBeDefined();
      expect(result.aiDraftResponse).toContain('Bob');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.tags).toContain('password-reset');
      expect(result.isEscalated).toBe(false);
    });

    it('evaluates legal threats as URGENT priority with escalation flag', async () => {
      const result = await evaluateInquiryForClassification({
        subject: 'Legal action against your company',
        body: 'I will contact my attorney and lawyer immediately if not resolved.',
        studentName: 'Charles Darwin',
      });

      expect(result.priority).toBe('URGENT');
      expect(result.isEscalated).toBe(true);
      expect(result.escalationReason).toContain('legal action');
    });
  });

  describe('6. classifySingleTicket', () => {
    it('classifies a new ticket and updates Prisma database record', async () => {
      const mockTicket = {
        id: 101,
        subject: 'How do I download my certificate?',
        body: 'I finished 100% of the React course and want my certificate.',
        studentName: 'David Bowie',
        studentEmail: 'david@example.com',
        category: null,
        priority: 'MEDIUM',
        status: 'NEW',
        summary: null,
        aiDraftResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.ticket.findUnique as any).mockResolvedValue(mockTicket);
      (prisma.ticket.update as any).mockResolvedValue({
        ...mockTicket,
        category: 'GENERAL_QUESTION',
        priority: 'LOW',
        summary: '• Certificate download inquiry',
        aiDraftResponse: 'Hello David,\n\nCongratulations on completing the course!',
      });
      (prisma.webhookLog.create as any).mockResolvedValue({ id: 'log-1' });

      const result = await classifySingleTicket(101);

      expect(result.ticketId).toBe(101);
      expect(result.success).toBe(true);
      expect(result.category).toBe('GENERAL_QUESTION');
      expect(result.updated).toBe(true);
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 101 },
          data: expect.objectContaining({
            category: 'GENERAL_QUESTION',
          }),
        })
      );
      expect(prisma.webhookLog.create).toHaveBeenCalled();
    });

    it('returns existing classification when already classified and force is false', async () => {
      const mockTicket = {
        id: 102,
        subject: 'Video playback buffering',
        body: 'Videos are buffering constantly.',
        studentName: 'Emma Watson',
        studentEmail: 'emma@example.com',
        category: 'TECHNICAL_QUESTION',
        priority: 'MEDIUM',
        status: 'OPEN',
        summary: '• Video buffering issue',
        aiDraftResponse: 'Hello Emma,\n\nTry clearing browser cache.',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.ticket.findUnique as any).mockResolvedValue(mockTicket);

      const result = await classifySingleTicket(102, { force: false });

      expect(result.ticketId).toBe(102);
      expect(result.category).toBe('TECHNICAL_QUESTION');
      expect(result.updated).toBe(false);
      expect(prisma.ticket.update).not.toHaveBeenCalled();
    });

    it('performs simulation without database update when dryRun is true', async () => {
      const mockTicket = {
        id: 103,
        subject: 'I want a refund for Python course',
        body: 'Purchased 3 days ago and requesting a refund.',
        studentName: 'Frank Sinatra',
        studentEmail: 'frank@example.com',
        category: null,
        priority: 'LOW',
        status: 'NEW',
        summary: null,
        aiDraftResponse: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.ticket.findUnique as any).mockResolvedValue(mockTicket);

      const result = await classifySingleTicket(103, { dryRun: true });

      expect(result.ticketId).toBe(103);
      expect(result.category).toBe('REFUND_REQUEST');
      expect(result.dryRun).toBe(true);
      expect(result.updated).toBe(false);
      expect(prisma.ticket.update).not.toHaveBeenCalled();
    });

    it('throws error when ticket does not exist', async () => {
      (prisma.ticket.findUnique as any).mockResolvedValue(null);

      await expect(classifySingleTicket(9999)).rejects.toThrow('Ticket #9999 not found');
    });
  });

  describe('7. batchClassifyTickets', () => {
    it('processes batch of candidate tickets and returns aggregated results', async () => {
      const mockCandidates = [{ id: 201 }, { id: 202 }];

      (prisma.ticket.findMany as any).mockResolvedValue(mockCandidates);
      (prisma.ticket.findUnique as any).mockImplementation(({ where }: any) => {
        return Promise.resolve({
          id: where.id,
          subject: where.id === 201 ? 'Reset password' : 'Need refund',
          body: where.id === 201 ? 'Forgot my password' : 'Want refund under 30 days',
          studentName: 'User ' + where.id,
          studentEmail: `user${where.id}@example.com`,
          category: null,
          priority: 'MEDIUM',
          status: 'NEW',
          summary: null,
          aiDraftResponse: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
      (prisma.ticket.update as any).mockResolvedValue({});
      (prisma.webhookLog.create as any).mockResolvedValue({});

      const batchResult = await batchClassifyTickets({
        statusFilter: 'UNCLASSIFIED',
        limit: 10,
      });

      expect(batchResult.totalProcessed).toBe(2);
      expect(batchResult.classifiedCount).toBe(2);
      expect(batchResult.updatedCount).toBe(2);
      expect(batchResult.results).toHaveLength(2);
      expect(batchResult.results[0].category).toBe('TECHNICAL_QUESTION');
      expect(batchResult.results[1].category).toBe('REFUND_REQUEST');
    });
  });

  describe('8. getClassificationMetrics', () => {
    it('calculates classification statistics and category breakdown', async () => {
      (prisma.ticket.count as any)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(40)  // GENERAL_QUESTION
        .mockResolvedValueOnce(35)  // TECHNICAL_QUESTION
        .mockResolvedValueOnce(20)  // REFUND_REQUEST
        .mockResolvedValueOnce(30)  // LOW
        .mockResolvedValueOnce(45)  // MEDIUM
        .mockResolvedValueOnce(15)  // HIGH
        .mockResolvedValueOnce(5)   // URGENT
        .mockResolvedValueOnce(5);  // unclassified

      const metrics = await getClassificationMetrics();

      expect(metrics.totalTickets).toBe(100);
      expect(metrics.classifiedTickets).toBe(95);
      expect(metrics.unclassifiedTickets).toBe(5);
      expect(metrics.classificationRate).toBe(0.95);
      expect(metrics.categoryBreakdown.GENERAL_QUESTION).toBe(40);
      expect(metrics.categoryBreakdown.TECHNICAL_QUESTION).toBe(35);
      expect(metrics.categoryBreakdown.REFUND_REQUEST).toBe(20);
      expect(metrics.averageConfidence).toBe(0.92);
    });
  });
});
