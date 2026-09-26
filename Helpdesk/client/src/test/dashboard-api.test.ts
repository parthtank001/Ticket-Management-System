import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dashboardApi } from '../lib/dashboard-api';
import { apiClient } from '../lib/api-client';
import type { DashboardStats } from '../lib/types';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('dashboardApi Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDashboardStats: DashboardStats = {
    totalTickets: 25,
    openTickets: 8,
    resolvedTickets: 15,
    closedTickets: 2,
    aiResolvedTickets: 12,
    aiResolvedPercentage: 48.0,
    aiResolvedPercentageOfResolved: 70.6,
    humanResolvedTickets: 5,
    avgResolutionTimeMs: 250000,
    avgResolutionTimeFormatted: '4 mins',
    aiAvgResolutionTimeMs: 15000,
    aiAvgResolutionTimeFormatted: '15s',
    humanAvgResolutionTimeMs: 7200000,
    humanAvgResolutionTimeFormatted: '2.0 hrs',
    categoryBreakdown: {
      GENERAL_QUESTION: 12,
      TECHNICAL_QUESTION: 8,
      REFUND_REQUEST: 4,
      UNCATEGORIZED: 1,
    },
    priorityBreakdown: {
      LOW: 5,
      MEDIUM: 14,
      HIGH: 4,
      URGENT: 2,
    },
    statusBreakdown: {
      NEW: 2,
      PROCESSING: 1,
      OPEN: 5,
      RESOLVED: 15,
      CLOSED: 2,
    },
    recentTickets: [],
  };

  it('fetches dashboard statistics successfully via GET /api/dashboard/stats', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockDashboardStats });

    const result = await dashboardApi.getStats();

    expect(apiClient.get).toHaveBeenCalledWith('/api/dashboard/stats', {
      params: undefined,
    });
    expect(result).toEqual(mockDashboardStats);
    expect(result.totalTickets).toBe(25);
    expect(result.openTickets).toBe(8);
    expect(result.aiResolvedTickets).toBe(12);
    expect(result.aiResolvedPercentage).toBe(48.0);
    expect(result.avgResolutionTimeFormatted).toBe('4 mins');
  });

  it('passes timeframe filter parameters to the API request', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockDashboardStats });

    const result = await dashboardApi.getStats({ timeframe: 'today' });

    expect(apiClient.get).toHaveBeenCalledWith('/api/dashboard/stats', {
      params: { timeframe: 'today' },
    });
    expect(result).toEqual(mockDashboardStats);
  });

  it('extracts and throws specific backend error message on API rejection', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce({
      response: {
        data: {
          error: 'Session expired or unauthorized',
        },
      },
    });

    await expect(dashboardApi.getStats()).rejects.toThrow('Session expired or unauthorized');
  });

  it('falls back to generic error message when error response lacks specific text', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network disconnected'));

    await expect(dashboardApi.getStats()).rejects.toThrow('Network disconnected');
  });
});
