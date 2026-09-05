import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient, AuthUser, SessionResponse } from '../auth-client';

export const AUTH_SESSION_QUERY_KEY = ['auth', 'session'] as const;

export function useSession() {
  return useQuery<SessionResponse>({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: () => authClient.getSession(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authClient.signIn(email, password),
    onSuccess: (result) => {
      if (result.success && result.user) {
        queryClient.setQueryData<SessionResponse>(AUTH_SESSION_QUERY_KEY, {
          user: result.user,
          session: null,
        });
      }
      queryClient.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      queryClient.setQueryData<SessionResponse>(AUTH_SESSION_QUERY_KEY, {
        user: null,
        session: null,
      });
      queryClient.clear();
    },
  });
}
