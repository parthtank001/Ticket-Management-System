import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../dashboard-api';
import type { GetDashboardStatsQueryInput } from '../types';

export const DASHBOARD_STATS_QUERY_KEY = ['dashboard', 'stats'] as const;

/**
 * React Query hook to fetch real-time dashboard operations and resolution statistics.
 */
export function useDashboardStats(params?: GetDashboardStatsQueryInput) {
  return useQuery({
    queryKey: params ? [...DASHBOARD_STATS_QUERY_KEY, params] : DASHBOARD_STATS_QUERY_KEY,
    queryFn: () => dashboardApi.getStats(params),
    staleTime: 60 * 1000, // 1 minute fresh cache
    refetchOnWindowFocus: false,
  });
}
