import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authClient, AuthUser, SessionResponse } from '../lib/auth-client';
import { apiClient } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('authClient Service Unit Tests', () => {
  const mockUser: AuthUser = {
    id: 'agent-1',
    name: 'Agent Smith',
    email: 'smith@helpdesk.com',
    role: 'AGENT',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSession', () => {
    it('returns user and session when active session exists', async () => {
      const mockSessionData: SessionResponse = {
        user: mockUser,
        session: {
          id: 'sess-1',
          token: 'token-xyz',
          expiresAt: '2026-12-31T00:00:00.000Z',
          userId: 'agent-1',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockSessionData });

      const result = await authClient.getSession();
      expect(result.user).toEqual(mockUser);
      expect(result.session?.id).toBe('sess-1');
    });

    it('returns null user and session when no session is present', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { user: null, session: null } });

      const result = await authClient.getSession();
      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
    });

    it('handles network exceptions gracefully and returns null session', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

      const result = await authClient.getSession();
      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
    });
  });

  describe('signIn', () => {
    it('returns success: true and user object upon successful sign in', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: { user: mockUser },
      });

      const result = await authClient.signIn('smith@helpdesk.com', 'secret123');
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('returns success: false with server error message when sign in rejects', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce({
        response: { data: { message: 'Invalid email or password' } },
      });

      const result = await authClient.signIn('bad@example.com', 'wrongpassword');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('returns fallback error message when response message is missing', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Connection timed out'));

      const result = await authClient.signIn('test@example.com', 'password123');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timed out');
    });
  });

  describe('signOut', () => {
    it('returns true when sign-out endpoint responds with 200 OK', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ status: 200, data: { success: true } });

      const result = await authClient.signOut();
      expect(result).toBe(true);
    });

    it('returns false when sign-out request rejects', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Failed to sign out'));

      const result = await authClient.signOut();
      expect(result).toBe(false);
    });
  });
});
