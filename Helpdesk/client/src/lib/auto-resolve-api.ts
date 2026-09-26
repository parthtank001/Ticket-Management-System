import { apiClient } from './api-client';
import type {
  EvaluateInquiryInput,
  AutoResolveEvaluationResult,
  AutoResolveTicketInput,
  AutoResolveTicketResult,
  BatchAutoResolveInput,
  BatchAutoResolveResult,
  AutoResolveStats,
  AutoResolveRuleInfo,
} from './types';

/**
 * Auto-Resolve API Service Layer
 * Centralizes all REST API calls for Knowledge Base ticket auto-resolution.
 */
export const autoResolveApi = {
  /**
   * Evaluates an inquiry (subject, body, studentName, studentEmail) against the Knowledge Base
   * without mutating the database (useful for live preview and real-time triage assistance).
   */
  evaluate: async (params: EvaluateInquiryInput): Promise<AutoResolveEvaluationResult> => {
    try {
      const response = await apiClient.post<AutoResolveEvaluationResult>('/api/auto-resolve/evaluate', params);
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to evaluate ticket for auto-resolution';
      throw new Error(message);
    }
  },

  /**
   * Executes auto-resolution on a specific ticket by ID.
   */
  autoResolveTicket: async (
    ticketId: number,
    options?: AutoResolveTicketInput
  ): Promise<AutoResolveTicketResult> => {
    try {
      const response = await apiClient.post<AutoResolveTicketResult>(
        `/api/auto-resolve/ticket/${ticketId}`,
        options || {}
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        `Failed to auto-resolve Ticket #${ticketId}`;
      throw new Error(message);
    }
  },

  /**
   * Batch auto-resolves tickets in the queue matching specified filter criteria.
   */
  batchAutoResolve: async (
    options?: BatchAutoResolveInput
  ): Promise<BatchAutoResolveResult> => {
    try {
      const response = await apiClient.post<BatchAutoResolveResult>(
        '/api/auto-resolve/batch',
        options || {}
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to execute batch auto-resolution';
      throw new Error(message);
    }
  },

  /**
   * Fetches aggregate performance metrics and statistics for auto-resolved tickets.
   */
  getStats: async (): Promise<AutoResolveStats> => {
    try {
      const response = await apiClient.get<AutoResolveStats>('/api/auto-resolve/stats');
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch auto-resolution metrics';
      throw new Error(message);
    }
  },

  /**
   * Fetches the supported Knowledge Base auto-resolution rules and escalation guardrails.
   */
  getRules: async (): Promise<AutoResolveRuleInfo[]> => {
    try {
      const response = await apiClient.get<AutoResolveRuleInfo[]>('/api/auto-resolve/rules');
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch auto-resolution rules';
      throw new Error(message);
    }
  },
};
