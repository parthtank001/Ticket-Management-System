import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classificationApi } from '../classification-api';
import { TICKETS_QUERY_KEY } from './useTickets';
import type {
  EvaluateClassificationInput,
  ClassifyTicketInput,
  BatchClassifyInput,
} from '../types';

export const CLASSIFICATION_STATS_QUERY_KEY = ['classification-stats'] as const;
export const CLASSIFICATION_CATEGORIES_QUERY_KEY = ['classification-categories'] as const;

/**
 * React Query hook to fetch aggregate classification metrics.
 */
export function useClassificationStats() {
  return useQuery({
    queryKey: CLASSIFICATION_STATS_QUERY_KEY,
    queryFn: () => classificationApi.getStats(),
    staleTime: 60 * 1000,
  });
}

/**
 * React Query hook to fetch supported classification categories and guidelines.
 */
export function useClassificationCategories() {
  return useQuery({
    queryKey: CLASSIFICATION_CATEGORIES_QUERY_KEY,
    queryFn: () => classificationApi.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * React Query mutation hook to evaluate an inquiry against classification rules without mutating the DB.
 */
export function useEvaluateClassification() {
  return useMutation({
    mutationFn: (params: EvaluateClassificationInput) => classificationApi.evaluate(params),
  });
}

/**
 * React Query mutation hook to classify a single ticket by ID.
 * Automatically invalidates tickets list, ticket detail, and classification stats query caches.
 */
export function useClassifyTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticketId,
      options,
    }: {
      ticketId: number;
      options?: ClassifyTicketInput;
    }) => classificationApi.classifyTicket(ticketId, options),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...TICKETS_QUERY_KEY, variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: CLASSIFICATION_STATS_QUERY_KEY });
    },
  });
}

/**
 * React Query mutation hook to batch classify tickets in the queue.
 * Automatically invalidates tickets list and stats query caches.
 */
export function useBatchClassify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options?: BatchClassifyInput) => classificationApi.batchClassify(options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CLASSIFICATION_STATS_QUERY_KEY });
    },
  });
}
