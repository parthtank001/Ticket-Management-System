import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluateInquiryForAutoResolve,
  autoResolveSingleTicket,
  batchAutoResolveTickets,
  getAutoResolveMetrics,
  getAvailableAutoResolveRules,
} from '../../../server/services/auto-resolve';
import { prisma } from '../../../server/db';

vi.mock('../../../server/db', () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    webhookLog: {
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
}));

describe('Auto-Resolve Tickets Module Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. getAvailableAutoResolveRules', () => {
    it('returns all 14 Knowledge Base rules and escalation guardrails', () => {
      const rules = getAvailableAutoResolveRules();
      expect(rules).toBeDefined();
      expect(rules.length).toBe(14);

      const standardRules = rules.filter((r) => !r.isEscalationRule);
      const escalationRules = rules.filter((r) => r.isEscalationRule);

      expect(standardRules.length).toBe(10);
      expect(escalationRules.length).toBe(4);

      expect(rules.some((r) => r.id === 'kb-sec-1-password')).toBe(true);
      expect(rules.some((r) => r.id === 'kb-sec-4-refund')).toBe(true);
      expect(rules.some((r) => r.id === 'kb-sec-10-escalation-legal')).toBe(true);
      expect(rules.some((r) => r.id === 'kb-sec-10-escalation-chargeback')).toBe(true);
    });
  });

  describe('2. evaluateInquiryForAutoResolve', () => {
    it('evaluates Password Reset inquiries and grants auto-resolution with 0.95 confidence', () => {
      const res = evaluateInquiryForAutoResolve({
        subject: 'Cannot login to my account',
        body: 'I forgot my password and cannot sign in.',
        studentName: 'Alice Cooper',
      });

      expect(res.canAutoResolve).toBe(true);
      expect(res.confidence).toBe(0.95);
      expect(res.isEscalated).toBe(false);
      expect(res.category).toBe('TECHNICAL_QUESTION');
      expect(res.resolutionAnswer).toContain('Hello Alice,');
      expect(res.resolutionAnswer).toContain('Forgot Password');
      expect(res.resolutionAnswer).toContain('Code with Mosh Support');
    });

    it('evaluates Lifetime Access inquiries and auto-resolves with General Question category', () => {
      const res = evaluateInquiryForAutoResolve({
        subject: 'Question about Lifetime Access',
        body: 'What does lifetime access mean for the Python Masterclass?',
        studentName: 'Bruce Banner',
      });

      expect(res.canAutoResolve).toBe(true);
      expect(res.category).toBe('GENERAL_QUESTION');
      expect(res.priority).toBe('LOW');
      expect(res.resolutionAnswer).toContain('Hello Bruce,');
      expect(res.resolutionAnswer).toContain('One-time payment');
    });

    it('evaluates standard refund inquiries (< 30 days) and provides official 30-day refund policy', () => {
      const res = evaluateInquiryForAutoResolve({
        subject: 'How do I request a refund?',
        body: 'What is your refund policy and money back guarantee?',
        studentName: 'Clark Kent',
      });

      expect(res.canAutoResolve).toBe(true);
      expect(res.category).toBe('REFUND_REQUEST');
      expect(res.resolutionAnswer).toContain('Hello Clark,');
      expect(res.resolutionAnswer).toContain('30-Day Money-Back Guarantee');
    });

    it('strictly escalates legal threats and sets confidence to 0.0 without resolution answer', () => {
      const res = evaluateInquiryForAutoResolve({
        subject: 'Legal action notice',
        body: 'I will contact my attorney and sue your company in court.',
        studentName: 'Diana Prince',
      });

      expect(res.canAutoResolve).toBe(false);
      expect(res.isEscalated).toBe(true);
      expect(res.confidence).toBe(0.0);
      expect(res.priority).toBe('HIGH');
      expect(res.escalationReason).toContain('legal action');
      expect(res.resolutionAnswer).toBeUndefined();
    });

    it('strictly escalates refund requests outside the 30-day window', () => {
      const res = evaluateInquiryForAutoResolve({
        subject: 'Refund for purchase',
        body: 'I bought this course 3 months ago and want a refund.',
        studentName: 'Edward Nygma',
      });

      expect(res.canAutoResolve).toBe(false);
      expect(res.isEscalated).toBe(true);
      expect(res.escalationReason).toContain('outside the standard 30-day guarantee window');
      expect(res.resolutionAnswer).toBeUndefined();
    });

    it('strictly escalates payment chargebacks and disputes', () => {
      const res = evaluateInquiryForAutoResolve({
        subject: 'Disputing charge',
        body: 'I am filing a bank chargeback with my card provider.',
        studentName: 'Frank Castle',
      });

      expect(res.canAutoResolve).toBe(false);
      expect(res.isEscalated).toBe(true);
      expect(res.escalationReason).toContain('chargeback or payment dispute');
    });

    it('strictly escalates compromised accounts and unauthorized security breaches', () => {
      const res = evaluateInquiryForAutoResolve({
        subject: 'Account security alert',
        body: 'My account was hacked and unauthorized access occurred.',
        studentName: 'Gwen Stacy',
      });

      expect(res.canAutoResolve).toBe(false);
      expect(res.isEscalated).toBe(true);
      expect(res.escalationReason).toContain('account security');
    });

    it('routes unknown bespoke inquiries to human queue with confidence 0.2', () => {
      const res = evaluateInquiryForAutoResolve({
        subject: 'Custom enterprise B2B licensing',
        body: 'We want to buy seats for 2000 engineers across our global offices.',
        studentName: 'Harry Osborn',
      });

      expect(res.canAutoResolve).toBe(false);
      expect(res.isEscalated).toBe(false);
      expect(res.confidence).toBe(0.2);
      expect(res.resolutionAnswer).toBeUndefined();
    });
  });

  describe('3. autoResolveSingleTicket', () => {
    it('successfully auto-resolves eligible ticket in database and updates status to RESOLVED', async () => {
      const mockTicket = {
        id: 101,
        subject: 'Forgot my password',
        studentName: 'Peter Parker',
        studentEmail: 'peter@example.com',
        body: 'I forgot my password. How can I reset it?',
        status: 'NEW',
        category: null,
        priority: 'MEDIUM',
        summary: null,
      };

      (prisma.ticket.findUnique as any).mockResolvedValue(mockTicket);
      (prisma.ticket.update as any).mockResolvedValue({
        ...mockTicket,
        status: 'RESOLVED',
      });

      const result = await autoResolveSingleTicket(101, { sendReply: true, dryRun: false });

      expect(result.success).toBe(true);
      expect(result.autoResolved).toBe(true);
      expect(result.status).toBe('RESOLVED');
      expect(result.previousStatus).toBe('NEW');
      expect(result.messageAdded).toBe(true);
      expect(result.resolutionAnswer).toContain('Hello Peter,');

      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: expect.objectContaining({
          status: 'RESOLVED',
          category: 'TECHNICAL_QUESTION',
        }),
      });

      expect(prisma.webhookLog.create).toHaveBeenCalled();
    });

    it('transitions non-resolvable NEW tickets to OPEN for human staff queue and unassigns from AI agent', async () => {
      const mockAiAgent = {
        id: 'ai-agent-user-id',
        name: 'AI',
        email: 'ai@example.com',
        role: 'AGENT',
      };
      const mockTicket = {
        id: 102,
        subject: 'Custom syllabus inquiry',
        studentName: 'Tony Stark',
        studentEmail: 'tony@example.com',
        body: 'Can you teach a custom syllabus on quantum computing?',
        status: 'NEW',
        category: null,
        priority: 'MEDIUM',
        assignedAgentId: 'ai-agent-user-id',
      };

      (prisma.user.findFirst as any).mockResolvedValue(mockAiAgent);
      (prisma.ticket.findUnique as any).mockResolvedValue(mockTicket);
      (prisma.ticket.update as any).mockResolvedValue({
        ...mockTicket,
        status: 'OPEN',
        assignedAgentId: null,
      });

      const result = await autoResolveSingleTicket(102, { dryRun: false });

      expect(result.success).toBe(true);
      expect(result.autoResolved).toBe(false);
      expect(result.status).toBe('OPEN');
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 102 },
        data: expect.objectContaining({
          status: 'OPEN',
          assignedAgentId: null,
        }),
      });
    });

    it('assigns ticket to AI agent when auto-resolving an unassigned ticket', async () => {
      const mockAiAgent = {
        id: 'ai-agent-user-id',
        name: 'AI',
        email: 'ai@example.com',
        role: 'AGENT',
      };
      const mockTicket = {
        id: 104,
        subject: 'Forgot my password',
        studentName: 'Steve Rogers',
        studentEmail: 'steve@example.com',
        body: 'I forgot my password. Please help.',
        status: 'NEW',
        category: null,
        priority: 'MEDIUM',
        assignedAgentId: null,
      };

      (prisma.user.findFirst as any).mockResolvedValue(mockAiAgent);
      (prisma.ticket.findUnique as any).mockResolvedValue(mockTicket);
      (prisma.ticket.update as any).mockResolvedValue({
        ...mockTicket,
        status: 'RESOLVED',
        assignedAgentId: 'ai-agent-user-id',
      });

      const result = await autoResolveSingleTicket(104, { dryRun: false });

      expect(result.success).toBe(true);
      expect(result.autoResolved).toBe(true);
      expect(result.status).toBe('RESOLVED');
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 104 },
        data: expect.objectContaining({
          status: 'RESOLVED',
          assignedAgentId: 'ai-agent-user-id',
        }),
      });
    });

    it('does not modify database when dryRun is true', async () => {
      const mockTicket = {
        id: 103,
        subject: 'How do I download videos?',
        studentName: 'Wanda Maximoff',
        studentEmail: 'wanda@example.com',
        body: 'Can I download the videos for offline viewing?',
        status: 'NEW',
      };

      (prisma.ticket.findUnique as any).mockResolvedValue(mockTicket);

      const result = await autoResolveSingleTicket(103, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.autoResolved).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(prisma.ticket.update).not.toHaveBeenCalled();
      expect(prisma.webhookLog.create).not.toHaveBeenCalled();
    });

    it('handles non-existent ticket gracefully and returns error reason', async () => {
      (prisma.ticket.findUnique as any).mockResolvedValue(null);

      const result = await autoResolveSingleTicket(999);

      expect(result.success).toBe(false);
      expect(result.autoResolved).toBe(false);
      expect(result.reason).toContain('does not exist');
    });
  });

  describe('4. batchAutoResolveTickets', () => {
    it('processes batch of tickets and calculates accurate resolution counts', async () => {
      const mockTickets = [
        {
          id: 201,
          subject: 'Forgot password',
          studentName: 'Arthur Dent',
          studentEmail: 'arthur@example.com',
          body: 'How do I reset my password?',
          status: 'NEW',
        },
        {
          id: 202,
          subject: 'Legal threat',
          studentName: 'Zaphod Beeblebrox',
          studentEmail: 'zaphod@example.com',
          body: 'I will sue you in court if not resolved immediately.',
          status: 'NEW',
        },
        {
          id: 203,
          subject: 'Custom enterprise licensing',
          studentName: 'Ford Prefect',
          studentEmail: 'ford@example.com',
          body: 'Do you offer custom company onboarding packages?',
          status: 'NEW',
        },
      ];

      (prisma.ticket.findMany as any).mockResolvedValue(mockTickets);
      (prisma.ticket.findUnique as any).mockImplementation(({ where }: any) => {
        return mockTickets.find((t) => t.id === where.id) || null;
      });
      (prisma.ticket.update as any).mockResolvedValue({});

      const batchResult = await batchAutoResolveTickets({
        statusFilter: 'NEW',
        limit: 10,
        dryRun: false,
      });

      expect(batchResult.totalProcessed).toBe(3);
      expect(batchResult.autoResolvedCount).toBe(1);
      expect(batchResult.escalatedCount).toBe(1);
      expect(batchResult.skippedCount).toBe(1);
      expect(batchResult.results.length).toBe(3);
    });
  });

  describe('5. getAutoResolveMetrics', () => {
    it('aggregates total tickets and auto-resolution rates accurately', async () => {
      (prisma.ticket.count as any)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(40)  // resolved
        .mockResolvedValueOnce(60); // open

      (prisma.ticket.findMany as any).mockResolvedValue([
        {
          id: 1,
          category: 'TECHNICAL_QUESTION',
          body: '--- [Auto-Resolution Reply from Code with Mosh Support (support@example.com)] ---',
          summary: 'Automated resolution provided from Knowledge Base (Section 1)',
        },
        {
          id: 2,
          category: 'GENERAL_QUESTION',
          body: '--- [Auto-Resolution Reply from Code with Mosh Support (support@example.com)] ---',
          summary: 'Automated resolution provided from Knowledge Base (Section 2)',
        },
        {
          id: 3,
          category: 'REFUND_REQUEST',
          body: 'Manual agent reply',
          summary: 'Agent helped student with invoice',
        },
      ]);

      const stats = await getAutoResolveMetrics();

      expect(stats.totalTickets).toBe(100);
      expect(stats.resolvedTickets).toBe(40);
      expect(stats.openTickets).toBe(60);
      expect(stats.autoResolvedTickets).toBe(2);
      expect(stats.autoResolveRate).toBe(2.0);
      expect(stats.categoryBreakdown.TECHNICAL_QUESTION).toBe(1);
      expect(stats.categoryBreakdown.GENERAL_QUESTION).toBe(1);
    });
  });
});
