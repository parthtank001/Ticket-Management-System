import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, ManagedUser, CreateUserPayload, UpdateUserPayload } from '../users-api';
import { Role } from '../types';

export const USERS_QUERY_KEY = ['users'] as const;

export function useUsers(params?: { search?: string; role?: Role | 'ALL' | string; status?: string }) {
  return useQuery({
    queryKey: [...USERS_QUERY_KEY, params],
    queryFn: () => usersApi.listUsers(params),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      usersApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
    },
  });
}
