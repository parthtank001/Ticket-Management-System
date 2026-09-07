import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ticketsApi,
  Ticket,
  TicketAgent,
  CreateTicketPayload,
  UpdateTicketPayload,
  AddTicketMessagePayload,
} from '../tickets-api';

export const TICKETS_QUERY_KEY = ['tickets'] as const;
export const AGENTS_QUERY_KEY = ['agents'] as const;

/**
 * Hook to fetch all tickets with automatic caching
 */
export function useTickets() {
  return useQuery<Ticket[]>({
    queryKey: TICKETS_QUERY_KEY,
    queryFn: () => ticketsApi.listTickets(),
  });
}

/**
 * Hook to fetch active agents list for assignments
 */
export function useAgents() {
  return useQuery<TicketAgent[]>({
    queryKey: AGENTS_QUERY_KEY,
    queryFn: () => ticketsApi.listAgents(),
  });
}

/**
 * Mutation hook to create a new ticket
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTicketPayload) => ticketsApi.createTicket(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook to update ticket status or assigned agent
 */
export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTicketPayload }) =>
      ticketsApi.updateTicket(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook to add a reply or note to a ticket
 */
export function useAddTicketMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      payload,
    }: {
      ticketId: string;
      payload: AddTicketMessagePayload;
    }) => ticketsApi.addTicketMessage(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
    },
  });
}
