import { apiClient } from './api-client';
import { Role } from './types';

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tickets: number;
  };
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: Role;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
  password?: string;
}

export const usersApi = {
  /**
   * Fetch users list with optional search, role, and status filters
   */
  async listUsers(params?: { search?: string; role?: Role | 'ALL' | string; status?: string }): Promise<ManagedUser[]> {
    const queryParams: Record<string, string> = {};
    if (params?.search) queryParams.search = params.search;
    if (params?.role && params.role !== 'ALL') queryParams.role = params.role;
    if (params?.status && params.status !== 'ALL') queryParams.status = params.status;

    try {
      const response = await apiClient.get<ManagedUser[]>('/api/users', {
        params: queryParams,
      });
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch users';
      throw new Error(message);
    }
  },

  /**
   * Create a new user account (Admin only)
   */
  async createUser(payload: CreateUserPayload): Promise<ManagedUser> {
    try {
      const response = await apiClient.post<ManagedUser>('/api/users', payload);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to create user';
      throw new Error(message);
    }
  },

  /**
   * Update an existing user account (Admin only)
   */
  async updateUser(id: string, payload: UpdateUserPayload): Promise<ManagedUser> {
    try {
      const response = await apiClient.patch<ManagedUser>(`/api/users/${id}`, payload);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to update user';
      throw new Error(message);
    }
  },

  /**
   * Delete a user account (Admin only)
   */
  async deleteUser(id: string): Promise<{ message: string; id: string }> {
    try {
      const response = await apiClient.delete<{ message: string; id: string }>(`/api/users/${id}`);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete user';
      throw new Error(message);
    }
  },
};
