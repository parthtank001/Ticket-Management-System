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
      const response = await fetch('/api/auth/get-session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': origin,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        return { user: null, session: null };
      }

      const data = await response.json();
      if (data && data.user) {
        // Fetch full profile via /api/me to guarantee `role` field is retrieved
        const meRes = await fetch('/api/me', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }).catch(() => null);

        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          if (meData?.user) {
            return {
              user: meData.user,
              session: meData.session || data.session || null,
            };
          }
        }

        return {
          user: data.user,
          session: data.session || null,
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
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': origin,
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data?.message || data?.error || 'invalid email or password';
        return { success: false, error: errorMsg };
      }

      const session = await this.getSession();

      return {
        success: true,
        user: session.user || data.user,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'failed to fetch',
      };
    }
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<boolean> {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': origin,
        },
        credentials: 'include',
      });

      return response.ok;
    } catch (err) {
      console.error('Error signing out:', err);
      return false;
    }
  },
};
