import { prisma } from '../db';
import type { DashboardStats, Category, Priority, TicketStatus, Ticket } from '@helpdesk/core';

/**
 * Format duration in milliseconds to human-readable string
 * (e.g. "15s", "4 mins", "1.5 hrs", "2.1 days", "< 1 min")
 */
export function formatDurationMs(ms: number): string {
  if (!ms || ms <= 0 || isNaN(ms)) return '0s';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${Math.max(1, totalSeconds)}s`;
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} mins`;
  const totalHours = ms / 3600000;
  if (totalHours < 24) return `${totalHours.toFixed(1)} hrs`;
  const totalDays = ms / 86400000;
  return `${totalDays.toFixed(1)} days`;
}

/**
 * Calculates real-time executive dashboard metrics and operations statistics
 * using the PostgreSQL stored function `get_dashboard_stats()`.
 * Falls back to TypeScript computation when stored function is unavailable or during mock testing.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const rawResult = await prisma.$queryRaw<Array<{ stats: any } | { get_dashboard_stats: any }>>`SELECT get_dashboard_stats() AS stats;`;
    const payload = (rawResult?.[0] as any)?.stats ?? (rawResult?.[0] as any)?.get_dashboard_stats;

    if (payload && typeof payload === 'object') {
      return {
        totalTickets: Number(payload.totalTickets) || 0,
        openTickets: Number(payload.openTickets) || 0,
        resolvedTickets: Number(payload.resolvedTickets) || 0,
        closedTickets: Number(payload.closedTickets) || 0,
        aiResolvedTickets: Number(payload.aiResolvedTickets) || 0,
        aiResolvedPercentage: Number(payload.aiResolvedPercentage) || 0,
        aiResolvedPercentageOfResolved: Number(payload.aiResolvedPercentageOfResolved) || 0,
        humanResolvedTickets: Number(payload.humanResolvedTickets) || 0,
        avgResolutionTimeMs: Number(payload.avgResolutionTimeMs) || 0,
        avgResolutionTimeFormatted: formatDurationMs(Number(payload.avgResolutionTimeMs) || 0),
        aiAvgResolutionTimeMs: Number(payload.aiAvgResolutionTimeMs) || 0,
        aiAvgResolutionTimeFormatted: formatDurationMs(Number(payload.aiAvgResolutionTimeMs) || 0),
        humanAvgResolutionTimeMs: Number(payload.humanAvgResolutionTimeMs) || 0,
        humanAvgResolutionTimeFormatted: formatDurationMs(Number(payload.humanAvgResolutionTimeMs) || 0),
        categoryBreakdown: payload.categoryBreakdown || {
          GENERAL_QUESTION: 0,
          TECHNICAL_QUESTION: 0,
          REFUND_REQUEST: 0,
          UNCATEGORIZED: 0,
        },
        priorityBreakdown: payload.priorityBreakdown || {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          URGENT: 0,
        },
        statusBreakdown: payload.statusBreakdown || {
          NEW: 0,
          PROCESSING: 0,
          OPEN: 0,
          RESOLVED: 0,
          CLOSED: 0,
        },
        ticketsPerDay: Array.isArray(payload.ticketsPerDay) ? payload.ticketsPerDay : [],
        recentTickets: (Array.isArray(payload.recentTickets) ? payload.recentTickets : []) as unknown as Ticket[],
      };
    }
  } catch (error: any) {
    console.warn('PostgreSQL stored function get_dashboard_stats() invocation failed. Using TypeScript fallback computation.', error?.message || error);
  }

  return calculateDashboardStatsFallback();
}

/**
 * Fallback computation in TypeScript in case PostgreSQL stored function is unavailable or mocked.
 */
export async function calculateDashboardStatsFallback(): Promise<DashboardStats> {
  // Query core counts concurrently
  const [
    totalTickets,
    openTicketsCount,
    resolvedTicketsCount,
    closedTicketsCount,
    allTicketsForBreakdown,
    webhookLogs,
    recentTicketsData,
  ] = await Promise.all([
    // 1. Total tickets
    prisma.ticket.count(),

    // 2. Open / backlog tickets (OPEN, NEW, PROCESSING)
    prisma.ticket.count({
      where: {
        status: { in: ['OPEN', 'NEW', 'PROCESSING'] },
      },
    }),

    // Resolved tickets
    prisma.ticket.count({
      where: { status: 'RESOLVED' },
    }),

    // Closed tickets
    prisma.ticket.count({
      where: { status: 'CLOSED' },
    }),

    // All tickets for category, priority, status breakdown & resolution duration analysis
    prisma.ticket.findMany({
      select: {
        id: true,
        category: true,
        priority: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        body: true,
        summary: true,
      },
    }),

    // Webhook logs for auto-resolved tickets
    prisma.webhookLog.findMany({
      where: {
        source: 'auto_resolve_module',
        status: 'resolved',
      },
      select: {
        ticketId: true,
      },
    }),

    // Recent 5 tickets for dashboard preview
    prisma.ticket.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedAgent: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  // Set of ticket IDs confirmed auto-resolved via Webhook audit logs
  const aiResolvedIdSet = new Set<number>(
    webhookLogs
      .map((log) => log.ticketId)
      .filter((id): id is number => typeof id === 'number')
  );

  // Initialize breakdowns
  const categoryBreakdown: Record<Category | 'UNCATEGORIZED', number> = {
    GENERAL_QUESTION: 0,
    TECHNICAL_QUESTION: 0,
    REFUND_REQUEST: 0,
    UNCATEGORIZED: 0,
  };

  const priorityBreakdown: Record<Priority, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  };

  const statusBreakdown: Record<TicketStatus, number> = {
    NEW: 0,
    PROCESSING: 0,
    OPEN: 0,
    RESOLVED: 0,
    CLOSED: 0,
  };

  let aiResolvedTickets = 0;
  let humanResolvedTickets = 0;

  let totalResolutionTimeMs = 0;
  let aiResolutionTimeMs = 0;
  let humanResolutionTimeMs = 0;

  for (const ticket of allTicketsForBreakdown) {
    // Populate Category breakdown
    if (ticket.category && ticket.category in categoryBreakdown) {
      categoryBreakdown[ticket.category as Category]++;
    } else {
      categoryBreakdown.UNCATEGORIZED++;
    }

    // Populate Priority breakdown
    if (ticket.priority && ticket.priority in priorityBreakdown) {
      priorityBreakdown[ticket.priority as Priority]++;
    }

    // Populate Status breakdown
    if (ticket.status && ticket.status in statusBreakdown) {
      statusBreakdown[ticket.status as TicketStatus]++;
    }

    // Analyze resolved tickets (RESOLVED or CLOSED)
    const isResolvedOrClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
    if (isResolvedOrClosed) {
      const isAiResolved =
        aiResolvedIdSet.has(ticket.id) ||
        (ticket.body && ticket.body.includes('[Auto-Resolution Reply from Code with Mosh Support')) ||
        (ticket.summary && ticket.summary.toLowerCase().includes('automated resolution provided'));

      const createdTime = new Date(ticket.createdAt).getTime();
      const updatedTime = new Date(ticket.updatedAt).getTime();
      const durationMs = Math.max(0, updatedTime - createdTime);

      totalResolutionTimeMs += durationMs;

      if (isAiResolved) {
        aiResolvedTickets++;
        aiResolutionTimeMs += durationMs;
      } else {
        humanResolvedTickets++;
        humanResolutionTimeMs += durationMs;
      }
    }
  }

  const totalResolvedCount = resolvedTicketsCount + closedTicketsCount;

  // 4. Percentage of tickets resolved by AI relative to total tickets
  const aiResolvedPercentage =
    totalTickets > 0 ? Number(((aiResolvedTickets / totalTickets) * 100).toFixed(1)) : 0;

  // Percentage of resolved tickets that were resolved by AI
  const aiResolvedPercentageOfResolved =
    totalResolvedCount > 0
      ? Number(((aiResolvedTickets / totalResolvedCount) * 100).toFixed(1))
      : 0;

  // 5. Average Resolution Times
  const avgResolutionTimeMs =
    totalResolvedCount > 0 ? Math.round(totalResolutionTimeMs / totalResolvedCount) : 0;
  const avgResolutionTimeFormatted = formatDurationMs(avgResolutionTimeMs);

  const aiAvgResolutionTimeMs =
    aiResolvedTickets > 0 ? Math.round(aiResolutionTimeMs / aiResolvedTickets) : 0;
  const aiAvgResolutionTimeFormatted = formatDurationMs(aiAvgResolutionTimeMs);

  const humanAvgResolutionTimeMs =
    humanResolvedTickets > 0 ? Math.round(humanResolutionTimeMs / humanResolvedTickets) : 0;
  const humanAvgResolutionTimeFormatted = formatDurationMs(humanAvgResolutionTimeMs);

  // Generate daily ticket volume buckets for the past 30 days
  const dailyMap = new Map<string, { date: string; formattedDate: string; count: number }>();
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyMap.set(dateKey, {
      date: dateKey,
      formattedDate,
      count: 0,
    });
  }

  for (const ticket of allTicketsForBreakdown) {
    if (ticket.createdAt) {
      const ticketDate = new Date(ticket.createdAt);
      const yyyy = ticketDate.getFullYear();
      const mm = String(ticketDate.getMonth() + 1).padStart(2, '0');
      const dd = String(ticketDate.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const bucket = dailyMap.get(dateKey);
      if (bucket) {
        bucket.count++;
      }
    }
  }

  const ticketsPerDay = Array.from(dailyMap.values());

  return {
    totalTickets,
    openTickets: openTicketsCount,
    resolvedTickets: resolvedTicketsCount,
    closedTickets: closedTicketsCount,
    aiResolvedTickets,
    aiResolvedPercentage,
    aiResolvedPercentageOfResolved,
    humanResolvedTickets,
    avgResolutionTimeMs,
    avgResolutionTimeFormatted,
    aiAvgResolutionTimeMs,
    aiAvgResolutionTimeFormatted,
    humanAvgResolutionTimeMs,
    humanAvgResolutionTimeFormatted,
    categoryBreakdown,
    priorityBreakdown,
    statusBreakdown,
    ticketsPerDay,
    recentTickets: recentTicketsData as unknown as Ticket[],
  };
}
