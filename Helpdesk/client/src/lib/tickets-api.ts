import { apiClient } from './api-client';
import { Role } from './types';

export type TicketCategory = 'GENERAL_QUESTION' | 'TECHNICAL_QUESTION' | 'REFUND_REQUEST';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TicketAgent {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: 'STUDENT' | 'AGENT' | 'SYSTEM';
  senderEmail: string;
  body: string;
  isInternalNote: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  subject: string;
  studentName: string;
  studentEmail: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  aiDraftResponse: string | null;
  assignedAgentId: string | null;
  assignedAgent?: TicketAgent | null;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketPayload {
  studentName?: string;
  studentEmail: string;
  subject: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  message: string;
}

export interface UpdateTicketPayload {
  status?: TicketStatus;
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
  async updateTicket(id: string, payload: UpdateTicketPayload): Promise<Ticket> {
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
    ticketId: string,
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
