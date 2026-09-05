export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'AGENT';
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
  role?: 'ADMIN' | 'AGENT';
  isActive?: boolean;
}

export interface UpdateUserPayload {
  name?: string;
  role?: 'ADMIN' | 'AGENT';
  isActive?: boolean;
  password?: string;
}

export const usersApi = {
  /**
   * Fetch users list with optional search, role, and status filters
   */
  async listUsers(params?: { search?: string; role?: string; status?: string }): Promise<ManagedUser[]> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set('search', params.search);
    if (params?.role && params.role !== 'ALL') queryParams.set('role', params.role);
    if (params?.status && params.status !== 'ALL') queryParams.set('status', params.status);

    const url = `/api/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.message || errorData?.error || `Failed to fetch users (${response.status})`);
    }

    return response.json();
  },

  /**
   * Create a new user account (Admin only)
   */
  async createUser(payload: CreateUserPayload): Promise<ManagedUser> {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || data?.error || `Failed to create user (${response.status})`);
    }

    return data;
  },

  /**
   * Update an existing user account (Admin only)
   */
  async updateUser(id: string, payload: UpdateUserPayload): Promise<ManagedUser> {
    const response = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || data?.error || `Failed to update user (${response.status})`);
    }

    return data;
  },

  /**
   * Delete a user account (Admin only)
   */
  async deleteUser(id: string): Promise<{ message: string; id: string }> {
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || data?.error || `Failed to delete user (${response.status})`);
    }

    return data;
  },
};
