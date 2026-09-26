import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { autoResolveApi } from '../auto-resolve-api';
import { TICKETS_QUERY_KEY } from './useTickets';
import type {
  EvaluateInquiryInput,
  AutoResolveTicketInput,
  BatchAutoResolveInput,
} from '../types';

export const AUTO_RESOLVE_STATS_QUERY_KEY = ['auto-resolve-stats'] as const;
export const AUTO_RESOLVE_RULES_QUERY_KEY = ['auto-resolve-rules'] as const;

/**
 * React Query hook to fetch aggregate auto-resolution metrics.
 */
export function useAutoResolveStats() {
  return useQuery({
    queryKey: AUTO_RESOLVE_STATS_QUERY_KEY,
    queryFn: () => autoResolveApi.getStats(),
    staleTime: 60 * 1000,
  });
}

/**
 * React Query hook to fetch supported Knowledge Base auto-resolution rules.
 */
export function useAutoResolveRules() {
  return useQuery({
    queryKey: AUTO_RESOLVE_RULES_QUERY_KEY,
    queryFn: () => autoResolveApi.getRules(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * React Query mutation hook to evaluate an inquiry against Knowledge Base rules without mutating the DB.
 */
export function useEvaluateAutoResolve() {
  return useMutation({
    mutationFn: (params: EvaluateInquiryInput) => autoResolveApi.evaluate(params),
  });
}

/**
 * React Query mutation hook to auto-resolve a single ticket by ID.
 * Automatically invalidates tickets list, ticket detail, and stats query caches.
 */
export function useAutoResolveTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ticketId,
      options,
    }: {
      ticketId: number;
      options?: AutoResolveTicketInput;
    }) => autoResolveApi.autoResolveTicket(ticketId, options),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...TICKETS_QUERY_KEY, variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: AUTO_RESOLVE_STATS_QUERY_KEY });
    },
  });
}

/**
 * React Query mutation hook to batch auto-resolve pending tickets.
 * Automatically invalidates tickets list and stats query caches.
 */
export function useBatchAutoResolve() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options?: BatchAutoResolveInput) => autoResolveApi.batchAutoResolve(options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: AUTO_RESOLVE_STATS_QUERY_KEY });
    },
  });
}
