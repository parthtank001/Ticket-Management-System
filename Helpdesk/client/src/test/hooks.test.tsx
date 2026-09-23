import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useTickets,
  useTicket,
  useAgents,
  useCreateTicket,
  useUpdateTicket,
  useAddTicketMessage,
  usePolishReply,
  useSummarizeTicket,
  useClassifyTicket,
} from '../lib/hooks/useTickets';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '../lib/hooks/useUsers';
import { useSession, useSignIn, useSignOut } from '../lib/hooks/useAuth';
import { ticketsApi } from '../lib/tickets-api';
import { usersApi } from '../lib/users-api';
import { authClient } from '../lib/auth-client';

vi.mock('../lib/tickets-api', () => ({
  ticketsApi: {
    listTickets: vi.fn(),
    getTicket: vi.fn(),
    listAgents: vi.fn(),
    createTicket: vi.fn(),
    updateTicket: vi.fn(),
    addTicketMessage: vi.fn(),
    polishReply: vi.fn(),
    summarizeTicket: vi.fn(),
    classifyTicket: vi.fn(),
  },
}));

vi.mock('../lib/users-api', () => ({
  usersApi: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

vi.mock('../lib/auth-client', () => ({
  authClient: {
    getSession: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Custom React Query Hooks Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tickets Hooks', () => {
    it('useTickets fetches and returns paginated tickets data', async () => {
      const mockResponse = {
        tickets: [{ id: 1, subject: 'Test' } as any],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };
      vi.mocked(ticketsApi.listTickets).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useTickets({ page: 1 }), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockResponse);
    });

    it('useTicket fetches single ticket by id when enabled', async () => {
      const mockTicket = { id: 42, subject: 'VPN issue' } as any;
      vi.mocked(ticketsApi.getTicket).mockResolvedValueOnce(mockTicket);

      const { result } = renderHook(() => useTicket(42), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockTicket);
    });

    it('useAgents fetches active agents list', async () => {
      const mockAgents = [{ id: 'a1', name: 'Agent Smith', email: 'smith@test.com', role: 'AGENT' as const }];
      vi.mocked(ticketsApi.listAgents).mockResolvedValueOnce(mockAgents);

      const { result } = renderHook(() => useAgents(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockAgents);
    });

    it('useCreateTicket executes creation mutation', async () => {
      const payload = {
        studentName: 'Maya',
        studentEmail: 'maya@test.edu',
        subject: 'Help',
        message: 'Need help',
      };
      const createdTicket = { id: 10, body: 'Need help', ...payload } as any;
      vi.mocked(ticketsApi.createTicket).mockResolvedValueOnce(createdTicket);

      const { result } = renderHook(() => useCreateTicket(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync(payload);
      expect(res).toEqual(createdTicket);
      expect(ticketsApi.createTicket).toHaveBeenCalledWith(payload);
    });

    it('useUpdateTicket executes update mutation', async () => {
      const updatedTicket = { id: 42, status: 'RESOLVED' } as any;
      vi.mocked(ticketsApi.updateTicket).mockResolvedValueOnce(updatedTicket);

      const { result } = renderHook(() => useUpdateTicket(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync({ id: 42, payload: { status: 'RESOLVED' } });
      expect(res).toEqual(updatedTicket);
      expect(ticketsApi.updateTicket).toHaveBeenCalledWith(42, { status: 'RESOLVED' });
    });

    it('useAddTicketMessage executes message addition mutation', async () => {
      const msg = { id: 'm1', body: 'Reply text', isInternalNote: false } as any;
      vi.mocked(ticketsApi.addTicketMessage).mockResolvedValueOnce(msg);

      const { result } = renderHook(() => useAddTicketMessage(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync({
        ticketId: 42,
        payload: { body: 'Reply text', senderType: 'AGENT' },
      });
      expect(res).toEqual(msg);
      expect(ticketsApi.addTicketMessage).toHaveBeenCalledWith(42, { body: 'Reply text', senderType: 'AGENT' });
    });

    it('usePolishReply calls polishReply mutation', async () => {
      vi.mocked(ticketsApi.polishReply).mockResolvedValueOnce({
        polishedReply: 'Hello Maya,\n\nPolished reply.\n\nBest regards,\nHelpdesk Support Team',
        originalText: 'raw draft',
      });

      const { result } = renderHook(() => usePolishReply(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync({ text: 'raw draft', studentName: 'Maya' });
      expect(res.polishedReply).toContain('Hello Maya');
      expect(ticketsApi.polishReply).toHaveBeenCalledWith({ text: 'raw draft', studentName: 'Maya' });
    });

    it('useSummarizeTicket calls summarizeTicket mutation', async () => {
      const summaryResult = {
        summary: '• Issue: VPN issue\n• Status: Open',
        ticket: { id: 42, summary: '• Issue: VPN issue\n• Status: Open' } as any,
      };
      vi.mocked(ticketsApi.summarizeTicket).mockResolvedValueOnce(summaryResult);

      const { result } = renderHook(() => useSummarizeTicket(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync(42);
      expect(res).toEqual(summaryResult);
      expect(ticketsApi.summarizeTicket).toHaveBeenCalledWith(42);
    });

    it('useClassifyTicket triggers AI classification and updates ticket cache', async () => {
      const classifyResult = {
        classification: {
          category: 'TECHNICAL_QUESTION' as const,
          priority: 'HIGH' as const,
          summary: '- Cannot login to portal',
          aiDraftResponse: 'Hello Student,\n\nPlease clear cache.',
        },
        ticket: {
          id: 42,
          category: 'TECHNICAL_QUESTION',
          priority: 'HIGH',
          summary: '- Cannot login to portal',
          aiDraftResponse: 'Hello Student,\n\nPlease clear cache.',
        } as any,
      };
      vi.mocked(ticketsApi.classifyTicket).mockResolvedValueOnce(classifyResult);

      const { result } = renderHook(() => useClassifyTicket(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync(42);
      expect(res).toEqual(classifyResult);
      expect(ticketsApi.classifyTicket).toHaveBeenCalledWith(42);
    });
  });

  describe('Users Hooks', () => {
    it('useUsers fetches user list', async () => {
      const mockUsers = [{ id: 'u1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' as const, isActive: true, createdAt: '', updatedAt: '' }];
      vi.mocked(usersApi.listUsers).mockResolvedValueOnce(mockUsers);

      const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockUsers);
    });

    it('useCreateUser calls createUser mutation', async () => {
      const newUser = { id: 'u2', name: 'New Agent', email: 'agent@test.com', role: 'AGENT' as const, isActive: true, createdAt: '', updatedAt: '' };
      vi.mocked(usersApi.createUser).mockResolvedValueOnce(newUser);

      const { result } = renderHook(() => useCreateUser(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync({ name: 'New Agent', email: 'agent@test.com', password: 'password123' });
      expect(res).toEqual(newUser);
    });

    it('useUpdateUser calls updateUser mutation', async () => {
      const updatedUser = { id: 'u2', name: 'Updated Agent', email: 'agent@test.com', role: 'AGENT' as const, isActive: true, createdAt: '', updatedAt: '' };
      vi.mocked(usersApi.updateUser).mockResolvedValueOnce(updatedUser);

      const { result } = renderHook(() => useUpdateUser(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync({ id: 'u2', payload: { name: 'Updated Agent' } });
      expect(res).toEqual(updatedUser);
    });

    it('useDeleteUser calls deleteUser mutation', async () => {
      vi.mocked(usersApi.deleteUser).mockResolvedValueOnce({ message: 'Deleted', id: 'u2' });

      const { result } = renderHook(() => useDeleteUser(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync('u2');
      expect(res.id).toBe('u2');
      expect(usersApi.deleteUser).toHaveBeenCalledWith('u2');
    });
  });

  describe('Auth Hooks', () => {
    it('useSession fetches current session', async () => {
      const sessionData = {
        user: { id: 'u1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' as const, isActive: true, createdAt: '', updatedAt: '' },
        session: null,
      };
      vi.mocked(authClient.getSession).mockResolvedValueOnce(sessionData);

      const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(sessionData);
    });

    it('useSignIn performs login mutation', async () => {
      const user = { id: 'u1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' as const, isActive: true, createdAt: '', updatedAt: '' };
      vi.mocked(authClient.signIn).mockResolvedValueOnce({ success: true, user });

      const { result } = renderHook(() => useSignIn(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync({ email: 'admin@test.com', password: 'password123' });
      expect(res.success).toBe(true);
      expect(res.user).toEqual(user);
    });

    it('useSignOut performs logout mutation', async () => {
      vi.mocked(authClient.signOut).mockResolvedValueOnce(true);

      const { result } = renderHook(() => useSignOut(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync();
      expect(res).toBe(true);
      expect(authClient.signOut).toHaveBeenCalled();
    });
  });
});
