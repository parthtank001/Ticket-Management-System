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
  bodyHtml?: string | null;
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
  assignedAgentId?: string | null;
  assignedToId?: string | null;
}

export interface UpdateTicketPayload {
  status?: TicketStatus;
  category?: Category | null;
  priority?: Priority;
  assignedAgentId?: string | null;
  assignedToId?: string | null;
}

export interface AddTicketMessagePayload {
  body: string;
  bodyHtml?: string | null;
  senderType?: SenderType;
  senderEmail?: string;
  isInternalNote?: boolean;
}

export interface PaginatedTicketsResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListTicketsParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: string;
  category?: string;
  priority?: string;
  assignedAgentId?: string;
  assignedToId?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export const ticketsApi = {
  /**
   * Fetch tickets with nested relations, optional server-side sorting, filtering, and pagination
   */
  async listTickets(params?: ListTicketsParams): Promise<PaginatedTicketsResponse> {
    try {
      const queryParams: Record<string, any> = {};
      if (params?.sortBy) queryParams.sortBy = params.sortBy;
      if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
      if (params?.search && params.search.trim()) queryParams.search = params.search.trim();
      if (params?.status && params.status !== 'ALL') queryParams.status = params.status;
      if (params?.category && params.category !== 'ALL') queryParams.category = params.category;
      if (params?.priority && params.priority !== 'ALL') queryParams.priority = params.priority;
      const filterAssignedId = params?.assignedAgentId || params?.assignedToId;
      if (filterAssignedId && filterAssignedId !== 'ALL') queryParams.assignedAgentId = filterAssignedId;
      if (params?.page !== undefined) queryParams.page = params.page;
      if (params?.pageSize !== undefined) queryParams.pageSize = params.pageSize;
      if (params?.limit !== undefined) queryParams.limit = params.limit;

      const response = await apiClient.get<Ticket[] | PaginatedTicketsResponse>('/api/tickets', {
        params: queryParams,
      });

      if (Array.isArray(response.data)) {
        const list = response.data;
        const pageNum = params?.page || 1;
        const pageSizeNum = params?.pageSize || params?.limit || (list.length > 0 ? list.length : 15);
        return {
          tickets: list,
          total: list.length,
          page: pageNum,
          pageSize: pageSizeNum,
          totalPages: Math.ceil(list.length / pageSizeNum) || 1,
        };
      }

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
   * Fetch a single ticket by ID with messages and assigned agent
   */
  async getTicket(id: number): Promise<Ticket> {
    try {
      const response = await apiClient.get<Ticket>(`/api/tickets/${id}`);
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch ticket';
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
