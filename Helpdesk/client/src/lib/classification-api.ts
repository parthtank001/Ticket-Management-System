import { apiClient } from './api-client';
import type {
  EvaluateClassificationInput,
  TicketClassificationResult,
  ClassifyTicketInput,
  ClassifyTicketResult,
  BatchClassifyInput,
  BatchClassifyResult,
  ClassificationStats,
  ClassificationCategoryInfo,
} from './types';

/**
 * Classification API Service Layer
 * Centralizes all REST API calls for AI & heuristic ticket classification.
 */
export const classificationApi = {
  /**
   * Evaluates an inquiry (subject, body, studentName, studentEmail) against classification heuristics & AI
   * without mutating the database (useful for live preview and real-time triage assistance).
   */
  evaluate: async (params: EvaluateClassificationInput): Promise<TicketClassificationResult> => {
    try {
      const response = await apiClient.post<TicketClassificationResult>('/api/classify/evaluate', params);
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to evaluate ticket for classification';
      throw new Error(message);
    }
  },

  /**
   * Executes classification on a specific ticket by ID.
   */
  classifyTicket: async (
    ticketId: number,
    options?: ClassifyTicketInput
  ): Promise<ClassifyTicketResult> => {
    try {
      const response = await apiClient.post<ClassifyTicketResult>(
        `/api/classify/ticket/${ticketId}`,
        options || {}
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        `Failed to classify Ticket #${ticketId}`;
      throw new Error(message);
    }
  },

  /**
   * Batch classifies tickets in the queue matching specified filter criteria.
   */
  batchClassify: async (
    options?: BatchClassifyInput
  ): Promise<BatchClassifyResult> => {
    try {
      const response = await apiClient.post<BatchClassifyResult>(
        '/api/classify/batch',
        options || {}
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to execute batch classification';
      throw new Error(message);
    }
  },

  /**
   * Fetches aggregate classification statistics, accuracy rates, and category/priority breakdowns.
   */
  getStats: async (): Promise<ClassificationStats> => {
    try {
      const response = await apiClient.get<ClassificationStats>('/api/classify/stats');
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch classification metrics';
      throw new Error(message);
    }
  },

  /**
   * Fetches supported classification categories, keywords, and priority guidelines.
   */
  getCategories: async (): Promise<ClassificationCategoryInfo[]> => {
    try {
      const response = await apiClient.get<ClassificationCategoryInfo[]>('/api/classify/categories');
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch classification categories';
      throw new Error(message);
    }
  },
};
