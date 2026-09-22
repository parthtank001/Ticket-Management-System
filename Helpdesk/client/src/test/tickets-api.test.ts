import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ticketsApi } from '../lib/tickets-api';
import { apiClient } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Tickets API Service Unit Tests (ticketsApi)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listTickets', () => {
    it('fetches tickets without params', async () => {
      const mockData = {
        tickets: [{ id: 1, subject: 'Test' }],
        total: 1,
        page: 1,
        pageSize: 15,
        totalPages: 1,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

      const result = await ticketsApi.listTickets();
      expect(apiClient.get).toHaveBeenCalledWith('/api/tickets', { params: {} });
      expect(result).toEqual(mockData);
    });

    it('passes sorting, search, and pagination query params correctly', async () => {
      const mockData = {
        tickets: [],
        total: 0,
        page: 2,
        pageSize: 25,
        totalPages: 0,
      };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });

      const result = await ticketsApi.listTickets({
        sortBy: 'createdAt',
        sortOrder: 'asc',
        search: '  vpn issue  ',
        status: 'OPEN',
        category: 'TECHNICAL_QUESTION',
        priority: 'HIGH',
        assignedAgentId: 'agent-123',
        page: 2,
        pageSize: 25,
        limit: 25,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/tickets', {
        params: {
          sortBy: 'createdAt',
          sortOrder: 'asc',
          search: 'vpn issue',
          status: 'OPEN',
          category: 'TECHNICAL_QUESTION',
          priority: 'HIGH',
          assignedAgentId: 'agent-123',
          page: 2,
          pageSize: 25,
          limit: 25,
        },
      });
      expect(result).toEqual(mockData);
    });

    it('filters out ALL placeholder values from query parameters', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await ticketsApi.listTickets({
        status: 'ALL',
        category: 'ALL',
        priority: 'ALL',
        assignedAgentId: 'ALL',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/tickets', { params: {} });
    });

    it('maps assignedToId when assignedAgentId is not provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

      await ticketsApi.listTickets({
        assignedToId: 'agent-456',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/tickets', {
        params: {
          assignedAgentId: 'agent-456',
        },
      });
    });

    it('transforms plain array response into PaginatedTicketsResponse structure', async () => {
      const rawTickets = [
        { id: 10, subject: 'Issue 1' },
        { id: 11, subject: 'Issue 2' },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: rawTickets });

      const result = await ticketsApi.listTickets({ page: 1, pageSize: 10 });
      expect(result).toEqual({
        tickets: rawTickets,
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });

    it('throws formatted error message when API call rejects with response error', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: { data: { error: 'Database connection failed' } },
      });

      await expect(ticketsApi.listTickets()).rejects.toThrow('Database connection failed');
    });

    it('throws formatted error message when API call rejects with response message', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: { data: { message: 'Unauthorized access' } },
      });

      await expect(ticketsApi.listTickets()).rejects.toThrow('Unauthorized access');
    });

    it('throws fallback error message when no error details are returned', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({});

      await expect(ticketsApi.listTickets()).rejects.toThrow('Failed to fetch tickets');
    });
  });

  describe('getTicket', () => {
    it('fetches a single ticket by id', async () => {
      const mockTicket = { id: 42, subject: 'VPN access' };
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockTicket });

      const result = await ticketsApi.getTicket(42);
      expect(apiClient.get).toHaveBeenCalledWith('/api/tickets/42');
      expect(result).toEqual(mockTicket);
    });

    it('throws formatted error when getTicket fails', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: { data: { error: 'Ticket not found' } },
      });

      await expect(ticketsApi.getTicket(999)).rejects.toThrow('Ticket not found');
    });
  });

  describe('listAgents', () => {
    it('fetches available support agents', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent Smith', email: 'smith@helpdesk.com', role: 'AGENT' },
      ];
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockAgents });

      const result = await ticketsApi.listAgents();
      expect(apiClient.get).toHaveBeenCalledWith('/api/agents');
      expect(result).toEqual(mockAgents);
    });

    it('throws formatted error when listAgents fails', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: { data: { error: 'Agent fetch failed' } },
      });

      await expect(ticketsApi.listAgents()).rejects.toThrow('Agent fetch failed');
    });
  });

  describe('createTicket', () => {
    it('sends POST request with ticket creation payload including assignedToId / assignedAgentId', async () => {
      const payload = {
        studentName: 'Maya Lin',
        studentEmail: 'maya@student.edu',
        subject: 'Cannot login',
        message: 'Password reset not working',
        assignedToId: 'agent-123',
      };
      const createdTicket = { id: 1, ...payload };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: createdTicket });

      const result = await ticketsApi.createTicket(payload);
      expect(apiClient.post).toHaveBeenCalledWith('/api/tickets', payload);
      expect(result).toEqual(createdTicket);
    });

    it('throws formatted error when createTicket fails', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce({
        response: { data: { error: 'Assigned user does not exist or is invalid.' } },
      });

      await expect(
        ticketsApi.createTicket({
          studentName: 'Maya Lin',
          studentEmail: 'maya@student.edu',
          subject: 'Cannot login',
          message: 'Password reset not working',
          assignedToId: 'invalid-user-id',
        })
      ).rejects.toThrow('Assigned user does not exist or is invalid.');
    });
  });

  describe('updateTicket', () => {
    it('sends PATCH request with update payload including assignedAgentId / assignedToId', async () => {
      const payload = {
        status: 'RESOLVED' as const,
        assignedToId: 'agent-456',
      };
      const updatedTicket = { id: 42, ...payload };
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: updatedTicket });

      const result = await ticketsApi.updateTicket(42, payload);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/tickets/42', payload);
      expect(result).toEqual(updatedTicket);
    });

    it('throws formatted error when updateTicket fails', async () => {
      vi.mocked(apiClient.patch).mockRejectedValueOnce({
        response: { data: { error: 'Assigned user does not exist or is invalid.' } },
      });

      await expect(
        ticketsApi.updateTicket(42, { assignedToId: 'non-existent-user' })
      ).rejects.toThrow('Assigned user does not exist or is invalid.');
    });
  });

  describe('addTicketMessage', () => {
    it('sends POST request to add ticket message with senderType', async () => {
      const payload = {
        body: 'Here is the resolution steps.',
        senderType: 'AGENT' as const,
        isInternalNote: false,
      };
      const createdMessage = { id: 'msg-1', ticketId: 42, ...payload };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: createdMessage });

      const result = await ticketsApi.addTicketMessage(42, payload);
      expect(apiClient.post).toHaveBeenCalledWith('/api/tickets/42/messages', payload);
      expect(result).toEqual(createdMessage);
    });

    it('sends POST request to add customer reply with senderType STUDENT', async () => {
      const payload = {
        body: 'Thank you, I tried VPN and it worked!',
        senderType: 'STUDENT' as const,
        isInternalNote: false,
      };
      const createdMessage = { id: 'msg-2', ticketId: 42, ...payload };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: createdMessage });

      const result = await ticketsApi.addTicketMessage(42, payload);
      expect(apiClient.post).toHaveBeenCalledWith('/api/tickets/42/messages', payload);
      expect(result).toEqual(createdMessage);
    });

    it('throws formatted error when addTicketMessage fails', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce({
        response: { data: { error: 'Message body cannot be empty.' } },
      });

      await expect(
        ticketsApi.addTicketMessage(42, { body: '' })
      ).rejects.toThrow('Message body cannot be empty.');
    });
  });

  describe('polishReply', () => {
    it('sends POST request to polish reply with AI', async () => {
      const payload = {
        text: 'your request is accepted',
        subject: 'Request Subject',
        studentName: 'Alice',
        category: 'REFUND_REQUEST',
      };
      const responseData = {
        polishedReply: 'Hello Alice,\n\nYour request has been approved.\n\nBest regards,\nSupport Team',
        originalText: 'your request is accepted',
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: responseData });

      const result = await ticketsApi.polishReply(payload);
      expect(apiClient.post).toHaveBeenCalledWith('/api/tickets/polish-reply', payload);
      expect(result).toEqual(responseData);
    });

    it('throws formatted error when polishReply fails', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce({
        response: { data: { error: 'Failed to polish reply' } },
      });

      await expect(
        ticketsApi.polishReply({ text: 'Draft' })
      ).rejects.toThrow('Failed to polish reply');
    });
  });

  describe('summarizeTicket', () => {
    it('sends POST request to summarize ticket and conversation history', async () => {
      const responseData = {
        summary: '• Initial Issue:\n  - Customer inquired about 2FA\n• Conversation & Actions Taken:\n  - 2 messages\n• Current Status:\n  - Open',
        ticket: {
          id: 42,
          subject: '2FA issue',
          studentName: 'Alice',
          studentEmail: 'alice@example.com',
          category: 'TECHNICAL_QUESTION' as const,
          priority: 'HIGH' as const,
          status: 'OPEN' as const,
          summary: '• Initial Issue:\n  - Customer inquired about 2FA',
          aiDraftResponse: null,
          assignedAgentId: null,
          messages: [],
          createdAt: '2026-09-20T10:00:00.000Z',
          updatedAt: '2026-09-20T10:00:00.000Z',
        },
      };
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: responseData });

      const result = await ticketsApi.summarizeTicket(42);
      expect(apiClient.post).toHaveBeenCalledWith('/api/tickets/42/summarize');
      expect(result).toEqual(responseData);
    });

    it('throws formatted error when summarizeTicket fails', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce({
        response: { data: { error: 'Ticket not found' } },
      });

      await expect(ticketsApi.summarizeTicket(999)).rejects.toThrow('Ticket not found');
    });
  });
});
