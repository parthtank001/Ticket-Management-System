import { apiClient } from './api-client';
import type { DashboardStats, GetDashboardStatsQueryInput } from './types';

/**
 * Dashboard API Service Layer
 * Centralizes REST API calls for system metrics, operational KPIs, and resolution stats.
 */
export const dashboardApi = {
  /**
   * Fetches real-time dashboard statistics and operational metrics.
   */
  getStats: async (params?: GetDashboardStatsQueryInput): Promise<DashboardStats> => {
    try {
      const response = await apiClient.get<DashboardStats>('/api/dashboard/stats', {
        params,
      });
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch dashboard statistics';
      throw new Error(message);
    }
  },
};
