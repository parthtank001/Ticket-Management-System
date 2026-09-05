import { apiClient } from './api-client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'AGENT';
  image?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  id: string;
  token: string;
  expiresAt: string;
  userId: string;
}

export interface SessionResponse {
  user: AuthUser | null;
  session: AuthSession | null;
}

export const authClient = {
  /**
   * Fetches current authenticated session
   */
  async getSession(): Promise<SessionResponse> {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const response = await apiClient.get<SessionResponse>('/api/auth/get-session', {
        headers: {
          Origin: origin,
        },
      });

      if (response.data && response.data.user) {
        return {
          user: response.data.user,
          session: response.data.session || null,
        };
      }
      return { user: null, session: null };
    } catch (err) {
      console.error('Error fetching session:', err);
      return { user: null, session: null };
    }
  },

  /**
   * Sign in with Email & Password
   */
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const response = await apiClient.post<{ user?: AuthUser; message?: string; error?: string }>(
        '/api/auth/sign-in/email',
        { email, password },
        {
          headers: {
            Origin: origin,
          },
        }
      );

      return {
        success: true,
        user: response.data?.user,
      };
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'invalid email or password';
      return {
        success: false,
        error: errorMsg,
      };
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<boolean> {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const response = await apiClient.post(
        '/api/auth/sign-out',
        {},
        {
          headers: {
            Origin: origin,
          },
        }
      );

      return response.status >= 200 && response.status < 300;
    } catch (err) {
      console.error('Error signing out:', err);
      return false;
    }
  },
};
