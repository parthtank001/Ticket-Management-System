import React, { useState, useEffect } from 'react';
import { AuthUser } from '../lib/auth-client';
import { ManagedUser } from '../lib/users-api';
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

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; user: ManagedUser }
  | { type: 'delete'; user: { id: string; name: string } }
  | null;

export const UsersPage: React.FC<UsersPageProps> = ({ user: currentUser }) => {
  const [activeDialog, setActiveDialog] = useState<DialogState>(null);

  // 1. TanStack Query: Reactive user directory query
  const {
    data: users = [],
    isLoading,
    error,
  } = useUsers();

  // 2. TanStack Query Mutations
  const deleteUserMutation = useDeleteUser();

  // Handle opening modal in Create mode
  const handleOpenAddModal = () => {
    setActiveDialog({ type: 'create' });
  };

  // Handle opening modal in Edit mode with selected user data
  const handleEditUser = (user: ManagedUser) => {
    setActiveDialog({ type: 'edit', user });
  };

  const handleCloseDialog = () => {
    setActiveDialog(null);
  };

  // Handle ESC key for delete modal
  useEffect(() => {
    if (activeDialog?.type !== 'delete') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveDialog(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDialog]);

  // Handle User Deletion Submit
  const handleConfirmDelete = async () => {
    if (activeDialog?.type !== 'delete') return;
    try {
      await deleteUserMutation.mutateAsync(activeDialog.user.id);
      setActiveDialog(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Users
          </h1>
          {isLoading ? (
            <Skeleton className="h-4 w-12 rounded bg-slate-200 dark:bg-slate-800" />
          ) : users.length > 0 ? (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </span>
          ) : null}
        </div>

        <Button
          onClick={handleOpenAddModal}
          size="sm"
          className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center space-x-1.5 cursor-pointer rounded-lg"
        >
          <UserPlus className="h-3.5 w-3.5 text-white" />
          <span>Add User</span>
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 flex items-center justify-between bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 px-3 py-2 rounded-lg shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="text-xs font-medium">
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
        onEditUser={handleEditUser}
        onDeleteUser={(user) => setActiveDialog({ type: 'delete', user })}
      />

      {/* Add / Edit User Modal */}
      <UserForm
        isOpen={activeDialog?.type === 'create' || activeDialog?.type === 'edit'}
        userToEdit={activeDialog?.type === 'edit' ? activeDialog.user : null}
        onClose={handleCloseDialog}
      />

      {/* Delete Confirmation Modal */}
      {activeDialog?.type === 'delete' && (
        <div
          data-testid="delete-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={handleCloseDialog}
          className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 space-y-3.5 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100"
          >
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center shrink-0">
                <Trash2 className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Delete User Account</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">{activeDialog.user.name}</span>? Any assigned tickets will be unassigned automatically.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseDialog}
                className="h-8 text-xs bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deleteUserMutation.isPending}
                className="h-8 text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
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
