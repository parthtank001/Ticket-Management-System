import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usersApi, ManagedUser, CreateUserPayload, UpdateUserPayload } from '../lib/users-api';
import { apiClient } from '../lib/api-client';

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('usersApi Service Unit Tests', () => {
  const mockUser: ManagedUser = {
    id: 'user-1',
    name: 'Alice Johnson',
    email: 'alice@helpdesk.com',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    _count: { tickets: 5 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsers', () => {
    it('fetches users list without filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockUser] });

      const result = await usersApi.listUsers();
      expect(apiClient.get).toHaveBeenCalledWith('/api/users', { params: {} });
      expect(result).toEqual([mockUser]);
    });

    it('applies search, role, and status query parameters correctly', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockUser] });

      const result = await usersApi.listUsers({
        search: 'Alice',
        role: 'AGENT',
        status: 'ACTIVE',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/users', {
        params: {
          search: 'Alice',
          role: 'AGENT',
          status: 'ACTIVE',
        },
      });
      expect(result).toEqual([mockUser]);
    });

    it('ignores "ALL" filter values when querying users', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [mockUser] });

      await usersApi.listUsers({
        role: 'ALL',
        status: 'ALL',
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/users', { params: {} });
    });

    it('throws error with server message when request fails', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce({
        response: { data: { error: 'Database connection failed' } },
      });

      await expect(usersApi.listUsers()).rejects.toThrow('Database connection failed');
    });

    it('throws fallback error when no specific message is returned', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network offline'));

      await expect(usersApi.listUsers()).rejects.toThrow('Network offline');
    });
  });

  describe('createUser', () => {
    const payload: CreateUserPayload = {
      name: 'Bob Smith',
      email: 'bob@helpdesk.com',
      password: 'password123',
      role: 'AGENT',
      isActive: true,
    };

    it('posts new user payload and returns created user', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { ...mockUser, ...payload } });

      const result = await usersApi.createUser(payload);
      expect(apiClient.post).toHaveBeenCalledWith('/api/users', payload);
      expect(result.name).toBe('Bob Smith');
    });

    it('throws formatted error when creation fails', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce({
        response: { data: { message: 'Email already exists' } },
      });

      await expect(usersApi.createUser(payload)).rejects.toThrow('Email already exists');
    });
  });

  describe('updateUser', () => {
    const updatePayload: UpdateUserPayload = {
      name: 'Alice Updated',
      role: 'AGENT',
    };

    it('patches user with payload and returns updated user', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: { ...mockUser, name: 'Alice Updated', role: 'AGENT' },
      });

      const result = await usersApi.updateUser('user-1', updatePayload);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/users/user-1', updatePayload);
      expect(result.name).toBe('Alice Updated');
    });

    it('throws formatted error when update fails', async () => {
      vi.mocked(apiClient.patch).mockRejectedValueOnce({
        response: { data: { error: 'User not found' } },
      });

      await expect(usersApi.updateUser('user-99', updatePayload)).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('deletes user by ID and returns confirmation message', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({
        data: { message: 'User deleted successfully', id: 'user-1' },
      });

      const result = await usersApi.deleteUser('user-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/api/users/user-1');
      expect(result.id).toBe('user-1');
    });

    it('throws formatted error when deletion fails', async () => {
      vi.mocked(apiClient.delete).mockRejectedValueOnce({
        response: { data: { error: 'Cannot delete the last admin account' } },
      });

      await expect(usersApi.deleteUser('user-1')).rejects.toThrow('Cannot delete the last admin account');
    });
  });
});
