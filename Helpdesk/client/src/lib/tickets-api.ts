import { apiClient } from './api-client';
import type {
  Role,
  Category,
  Priority,
  TicketStatus,
  SenderType,
} from '@helpdesk/core';

export interface TicketAgent {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TicketMessage {
  id: string;
  ticketId: number;
  senderType: SenderType;
  senderEmail: string;
  body: string;
  isInternalNote: boolean;
  messageId?: string | null;
  inReplyTo?: string | null;
  createdAt: string;
}

export interface Ticket {
  id: number;
  ticketNumber?: number;
  subject: string;
  studentName: string;
  studentEmail: string;
  category: Category | null;
  priority: Priority;
  status: TicketStatus;
  summary: string | null;
  aiDraftResponse: string | null;
  assignedAgentId: string | null;
  assignedAgent?: TicketAgent | null;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketPayload {
  studentName: string;
  studentEmail: string;
  subject: string;
  category?: Category | null;
  priority?: Priority;
  message: string;
}

export interface UpdateTicketPayload {
  status?: TicketStatus;
  category?: Category | null;
  priority?: Priority;
  assignedAgentId?: string | null;
}

export interface AddTicketMessagePayload {
  body: string;
  isInternalNote?: boolean;
}

export const ticketsApi = {
  /**
   * Fetch all tickets with nested relations
   */
  async listTickets(): Promise<Ticket[]> {
    try {
      const response = await apiClient.get<Ticket[]>('/api/tickets');
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch tickets';
      throw new Error(message);
    }
  },

  /**
   * Fetch active support agents available for assignment
   */
  async listAgents(): Promise<TicketAgent[]> {
    try {
      const response = await apiClient.get<TicketAgent[]>('/api/agents');
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch agents';
      throw new Error(message);
    }
  },

  /**
   * Create a new ticket (e.g. inbound student inquiry)
   */
  async createTicket(payload: CreateTicketPayload): Promise<Ticket> {
    try {
      const response = await apiClient.post<Ticket>('/api/tickets', payload);
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to create ticket';
      throw new Error(message);
    }
  },

  /**
   * Update ticket status or assign agent
   */
  async updateTicket(id: number, payload: UpdateTicketPayload): Promise<Ticket> {
    try {
      const response = await apiClient.patch<Ticket>(`/api/tickets/${id}`, payload);
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to update ticket';
      throw new Error(message);
    }
  },

  /**
   * Add a reply or internal note to a ticket
   */
  async addTicketMessage(
    ticketId: number,
    payload: AddTicketMessagePayload
  ): Promise<TicketMessage> {
    try {
      const response = await apiClient.post<TicketMessage>(
        `/api/tickets/${ticketId}/messages`,
        payload
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to post message reply';
      throw new Error(message);
    }
  },
};
