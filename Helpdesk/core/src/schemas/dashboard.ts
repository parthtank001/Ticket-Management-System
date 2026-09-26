import { z } from 'zod';
import { Category, Priority, TicketStatus } from '../enums';
import { Ticket } from './ticket';

/**
 * Zod validation schema for querying dashboard statistics
 */
export const getDashboardStatsQuerySchema = z.object({
  timeframe: z.enum(['all', 'today', 'week', 'month']).optional().default('all'),
});

export type GetDashboardStatsQueryInput = z.input<typeof getDashboardStatsQuerySchema>;
export type GetDashboardStatsQueryOutput = z.output<typeof getDashboardStatsQuerySchema>;

export interface DailyTicketCount {
  date: string;
  formattedDate: string;
  count: number;
}

/**
 * Comprehensive dashboard metrics and operations statistics
 */
export interface DashboardStats {
  // 1. Total Tickets count across all statuses
  totalTickets: number;

  // 2. Backlog / Open Tickets count (OPEN, NEW, PROCESSING)
  openTickets: number;

  // Resolved & Closed Tickets counts
  resolvedTickets: number;
  closedTickets: number;

  // 3. Tickets Resolved by AI count
  aiResolvedTickets: number;

  // 4. Percentage of tickets resolved by AI relative to total tickets
  aiResolvedPercentage: number;

  // Percentage of tickets resolved by AI relative to all resolved tickets
  aiResolvedPercentageOfResolved: number;

  // Tickets resolved by Human support staff
  humanResolvedTickets: number;

  // 5. Overall Average Resolution Time (in milliseconds and formatted human-readable)
  avgResolutionTimeMs: number;
  avgResolutionTimeFormatted: string;

  // AI-Specific Average Resolution Time
  aiAvgResolutionTimeMs: number;
  aiAvgResolutionTimeFormatted: string;

  // Human Agent Specific Average Resolution Time
  humanAvgResolutionTimeMs: number;
  humanAvgResolutionTimeFormatted: string;

  // Distribution breakdowns
  categoryBreakdown: Record<Category | 'UNCATEGORIZED', number>;
  priorityBreakdown: Record<Priority, number>;
  statusBreakdown: Record<TicketStatus, number>;

  // Daily ticket volume over the past 30 days
  ticketsPerDay: DailyTicketCount[];

  // Recent 5 tickets for quick access
  recentTickets: Ticket[];
}
