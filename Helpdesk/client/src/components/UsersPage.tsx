import React, { useState } from 'react';
import { AuthUser } from '../lib/auth-client';
import { useUsers, useDeleteUser } from '../lib/hooks/useUsers';
import {
  Shield,
  UserCheck,
  Mail,
  Calendar,
  AlertCircle,
  Users,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';

interface UsersPageProps {
  user: AuthUser;
}

export const UsersPage: React.FC<UsersPageProps> = ({ user: currentUser }) => {
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // 1. TanStack Query: Reactive user directory query
  const {
    data: users = [],
    isLoading,
    error,
  } = useUsers();

  // 2. TanStack Query Mutation for User Deletion
  const deleteUserMutation = useDeleteUser();

  // Avatar Initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Format creation timestamp
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Handle User Deletion Submit
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserMutation.mutateAsync(userToDelete.id);
      setUserToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <h1 className="text-base font-bold text-slate-900 tracking-tight">
            Users
          </h1>
          {isLoading ? (
            <Skeleton className="h-3 w-10 rounded" />
          ) : users.length > 0 ? (
            <span className="text-[11px] text-slate-500 font-medium">
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-3 flex items-center justify-between bg-red-50 border border-red-200 text-red-800 px-2.5 py-1.5 rounded-lg shadow-xs">
          <div className="flex items-center space-x-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
            <span className="text-[11px] font-medium">
              {error instanceof Error ? error.message : 'Failed to load users directory.'}
            </span>
          </div>
        </div>
      )}

      {/* Users Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="py-2 pl-3.5 pr-2.5">Name</th>
                  <th scope="col" className="px-2.5 py-2">Email</th>
                  <th scope="col" className="px-2.5 py-2">Role</th>
                  <th scope="col" className="py-2 pl-2.5 pr-3.5">Date Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="hover:bg-slate-50/30">
                    {/* 1. Name Column Skeleton */}
                    <td className="py-1.5 pl-3.5 pr-2.5 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                        <Skeleton className="h-3 w-20 rounded" />
                      </div>
                    </td>

                    {/* 2. Email Column Skeleton */}
                    <td className="px-2.5 py-1.5 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
                        <Skeleton className="h-3 w-32 rounded" />
                      </div>
                    </td>

                    {/* 3. Role Column Skeleton */}
                    <td className="px-2.5 py-1.5 whitespace-nowrap">
                      <Skeleton className="h-4 w-14 rounded" />
                    </td>

                    {/* 4. Date Created Column Skeleton */}
                    <td className="py-1.5 pl-2.5 pr-3.5 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
                        <Skeleton className="h-3 w-16 rounded" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : users.length === 0 ? (
          <div className="py-10 text-center px-4">
            <div className="mx-auto h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1.5">
              <Users className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">No users found</h3>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
              There are no user records to display.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="py-2 pl-3.5 pr-2.5">Name</th>
                  <th scope="col" className="px-2.5 py-2">Email</th>
                  <th scope="col" className="px-2.5 py-2">Role</th>
                  <th scope="col" className="py-2 pl-2.5 pr-3.5">Date Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {users.map((item) => {
                  const isSelf = item.id === currentUser.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* 1. Name Column */}
                      <td className="py-1.5 pl-3.5 pr-2.5 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`h-6 w-6 rounded-md flex items-center justify-center font-bold text-[9px] shadow-2xs shrink-0 ${
                              item.role === 'ADMIN'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {getInitials(item.name)}
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-[11px] text-slate-900">
                              {item.name}
                            </span>
                            {isSelf && (
                              <span className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Email Column */}
                      <td className="px-2.5 py-1.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1 text-[11px] text-slate-600">
                          <Mail className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          <span>{item.email}</span>
                        </div>
                      </td>

                      {/* 3. Role Column */}
                      <td className="px-2.5 py-1.5 whitespace-nowrap">
                        {item.role === 'ADMIN' ? (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
                            <Shield className="h-2.5 w-2.5 text-indigo-600" />
                            <span>ADMIN</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
                            <UserCheck className="h-2.5 w-2.5 text-blue-600" />
                            <span>AGENT</span>
                          </span>
                        )}
                      </td>

                      {/* 4. Date Created Column */}
                      <td className="py-1.5 pl-2.5 pr-3.5 whitespace-nowrap text-[11px] text-slate-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-2.5 w-2.5 text-slate-400" />
                            <span>{formatDate(item.createdAt)}</span>
                          </div>

                          {!isSelf && (
                            <button
                              onClick={() => setUserToDelete({ id: item.id, name: item.name })}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all ml-2"
                              title="Delete user"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Delete User Account</h4>
                <p className="text-[11px] text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{userToDelete.name}</span>? Any assigned tickets will be unassigned automatically.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUserToDelete(null)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deleteUserMutation.isPending}
                className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteUserMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                <span>Delete Account</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
