import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardStats, formatDurationMs } from '../../../server/services/dashboard';
import { prisma } from '../../../server/db';

vi.mock('../../../server/db', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    ticket: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    webhookLog: {
      findMany: vi.fn(),
    },
  },
}));

describe('Dashboard Analytics Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatDurationMs', () => {
    it('formats durations in seconds, minutes, hours, and days', () => {
      expect(formatDurationMs(0)).toBe('0s');
      expect(formatDurationMs(15000)).toBe('15s');
      expect(formatDurationMs(240000)).toBe('4 mins');
      expect(formatDurationMs(5400000)).toBe('1.5 hrs');
      expect(formatDurationMs(172800000)).toBe('2.0 days');
    });

    it('handles negative or invalid values gracefully', () => {
      expect(formatDurationMs(-100)).toBe('0s');
      expect(formatDurationMs(NaN)).toBe('0s');
    });
  });

  describe('getDashboardStats', () => {
    it('aggregates total tickets, open tickets, AI resolved tickets, percentage, and resolution times', async () => {
      // Mock counts
      vi.mocked(prisma.ticket.count)
        .mockResolvedValueOnce(30) // total
        .mockResolvedValueOnce(6)  // open
        .mockResolvedValueOnce(20) // resolved
        .mockResolvedValueOnce(4);  // closed

      // Mock tickets for breakdown
      const now = Date.now();
      const mockTickets = [
        {
          id: 1,
          category: 'TECHNICAL_QUESTION',
          priority: 'HIGH',
          status: 'RESOLVED',
          createdAt: new Date(now - 120000), // 2 mins ago
          updatedAt: new Date(now),
          body: '[Auto-Resolution Reply from Code with Mosh Support (support@example.com)]',
          summary: 'Password reset resolved',
        },
        {
          id: 2,
          category: 'GENERAL_QUESTION',
          priority: 'MEDIUM',
          status: 'RESOLVED',
          createdAt: new Date(now - 3600000), // 1 hour ago
          updatedAt: new Date(now),
          body: 'Here is the course syllabus information.',
          summary: 'Provided general assistance',
        },
        {
          id: 3,
          category: 'REFUND_REQUEST',
          priority: 'URGENT',
          status: 'OPEN',
          createdAt: new Date(now - 60000),
          updatedAt: new Date(now),
          body: 'I want a refund.',
          summary: null,
        },
      ];

      vi.mocked(prisma.ticket.findMany)
        .mockResolvedValueOnce(mockTickets as any) // allTicketsForBreakdown
        .mockResolvedValueOnce([mockTickets[0]] as any); // recentTicketsData

      vi.mocked(prisma.webhookLog.findMany).mockResolvedValueOnce([
        { ticketId: 1 },
      ] as any);

      const stats = await getDashboardStats();

      expect(stats.totalTickets).toBe(30);
      expect(stats.openTickets).toBe(6);
      expect(stats.resolvedTickets).toBe(20);
      expect(stats.closedTickets).toBe(4);
      expect(stats.aiResolvedTickets).toBe(1);
      expect(stats.humanResolvedTickets).toBe(1);
      expect(stats.aiResolvedPercentage).toBe(3.3); // (1 / 30) * 100
      expect(stats.aiResolvedPercentageOfResolved).toBe(4.2); // (1 / 24) * 100
      expect(stats.categoryBreakdown.TECHNICAL_QUESTION).toBe(1);
      expect(stats.categoryBreakdown.GENERAL_QUESTION).toBe(1);
      expect(stats.categoryBreakdown.REFUND_REQUEST).toBe(1);
      expect(stats.priorityBreakdown.HIGH).toBe(1);
      expect(stats.priorityBreakdown.MEDIUM).toBe(1);
      expect(stats.priorityBreakdown.URGENT).toBe(1);
      expect(stats.recentTickets.length).toBe(1);
      expect(stats.ticketsPerDay).toBeDefined();
      expect(stats.ticketsPerDay.length).toBe(30);
    });

    it('fetches dashboard stats directly from PostgreSQL stored procedure get_dashboard_stats() when available', async () => {
      const mockStoredPayload = {
        totalTickets: 100,
        openTickets: 25,
        resolvedTickets: 70,
        closedTickets: 5,
        aiResolvedTickets: 40,
        aiResolvedPercentage: 40.0,
        aiResolvedPercentageOfResolved: 53.3,
        humanResolvedTickets: 35,
        avgResolutionTimeMs: 125000,
        aiAvgResolutionTimeMs: 15000,
        humanAvgResolutionTimeMs: 250000,
        categoryBreakdown: {
          GENERAL_QUESTION: 40,
          TECHNICAL_QUESTION: 40,
          REFUND_REQUEST: 20,
          UNCATEGORIZED: 0,
        },
        priorityBreakdown: {
          LOW: 30,
          MEDIUM: 40,
          HIGH: 20,
          URGENT: 10,
        },
        statusBreakdown: {
          NEW: 5,
          PROCESSING: 5,
          OPEN: 15,
          RESOLVED: 70,
          CLOSED: 5,
        },
        ticketsPerDay: [
          { date: '2026-09-25', formattedDate: 'Sep 25', count: 12 },
          { date: '2026-09-26', formattedDate: 'Sep 26', count: 8 },
        ],
        recentTickets: [
          { id: 101, subject: 'Stored procedure test ticket', status: 'OPEN' },
        ],
      };

      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
        { stats: mockStoredPayload },
      ] as any);

      const stats = await getDashboardStats();

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(stats.totalTickets).toBe(100);
      expect(stats.openTickets).toBe(25);
      expect(stats.aiResolvedTickets).toBe(40);
      expect(stats.aiResolvedPercentage).toBe(40.0);
      expect(stats.avgResolutionTimeFormatted).toBe('2 mins');
      expect(stats.aiAvgResolutionTimeFormatted).toBe('15s');
      expect(stats.humanAvgResolutionTimeFormatted).toBe('4 mins');
      expect(stats.ticketsPerDay.length).toBe(2);
      expect(stats.recentTickets.length).toBe(1);
    });

    it('handles empty database with zero tickets gracefully', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('Stored function not found'));

      vi.mocked(prisma.ticket.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      vi.mocked(prisma.ticket.findMany)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      vi.mocked(prisma.webhookLog.findMany).mockResolvedValueOnce([]);

      const stats = await getDashboardStats();

      expect(stats.totalTickets).toBe(0);
      expect(stats.openTickets).toBe(0);
      expect(stats.aiResolvedTickets).toBe(0);
      expect(stats.aiResolvedPercentage).toBe(0);
      expect(stats.avgResolutionTimeFormatted).toBe('0s');
      expect(stats.ticketsPerDay).toBeDefined();
      expect(stats.ticketsPerDay.length).toBe(30);
      expect(stats.recentTickets).toEqual([]);
    });
  });
});
