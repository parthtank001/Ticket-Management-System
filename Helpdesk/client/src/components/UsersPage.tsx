import React, { useState, useEffect } from 'react';
import { AuthUser } from '../lib/auth-client';
import { useUsers, useDeleteUser } from '../lib/hooks/useUsers';
import {
  AlertCircle,
  Loader2,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { UserForm } from './UserForm';
import { UsersTable } from './UsersTable';

interface UsersPageProps {
  user: AuthUser;
}

export const UsersPage: React.FC<UsersPageProps> = ({ user: currentUser }) => {
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // 1. TanStack Query: Reactive user directory query
  const {
    data: users = [],
    isLoading,
    error,
  } = useUsers();

  // 2. TanStack Query Mutations
  const deleteUserMutation = useDeleteUser();

  // Handle ESC key for delete modal
  useEffect(() => {
    if (!userToDelete) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserToDelete(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userToDelete]);

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

        <Button
          onClick={() => setIsAddModalOpen(true)}
          size="sm"
          className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center space-x-1.5"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Add User</span>
        </Button>
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
      <UsersTable
        users={users}
        currentUser={currentUser}
        isLoading={isLoading}
        onDeleteUser={setUserToDelete}
      />

      {/* Add New User Modal */}
      <UserForm
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div
          data-testid="delete-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setUserToDelete(null)}
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-3 animate-in fade-in zoom-in-95 duration-150"
          >
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
