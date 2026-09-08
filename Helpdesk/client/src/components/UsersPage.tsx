import React, { useState } from 'react';
import { z } from 'zod';
import { AuthUser } from '../lib/auth-client';
import { Role } from '../lib/types';
import { useUsers, useCreateUser, useDeleteUser } from '../lib/hooks/useUsers';
import {
  Shield,
  UserCheck,
  Mail,
  Calendar,
  AlertCircle,
  Users,
  Loader2,
  Trash2,
  UserPlus,
  Eye,
  EyeOff,
  X,
  Lock,
  User as UserIcon,
} from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface UsersPageProps {
  user: AuthUser;
}

const createUserFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters long.'),
  email: z
    .string()
    .trim()
    .email('A valid email address is required.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.'),
});

type UserFormData = z.infer<typeof createUserFormSchema>;

const initialFormData: UserFormData = {
  name: '',
  email: '',
  password: '',
};

export const UsersPage: React.FC<UsersPageProps> = ({ user: currentUser }) => {
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // 1. TanStack Query: Reactive user directory query
  const {
    data: users = [],
    isLoading,
    error,
  } = useUsers();

  // 2. TanStack Query Mutations
  const createUserMutation = useCreateUser();
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

  // Reset Create User modal state
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setFormData(initialFormData);
    setFormErrors({});
    setGeneralError(null);
    setShowPassword(false);
  };

  // Validate form fields with Zod schema
  const validateForm = () => {
    const result = createUserFormSchema.safeParse(formData);
    if (!result.success) {
      const errors: { name?: string; email?: string; password?: string } = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'name' | 'email' | 'password';
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFormErrors(errors);
      return false;
    }
    setFormErrors({});
    return true;
  };

  // Handle Create User Submit
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    try {
      await createUserMutation.mutateAsync({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: Role.AGENT,
        isActive: true,
      });

      handleCloseAddModal();
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to create user account.');
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
                              item.role === Role.ADMIN
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
                        {item.role === Role.ADMIN ? (
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

      {/* Add New User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New User</h3>
                  <p className="text-[11px] text-slate-500">Create a new user account with role permissions.</p>
                </div>
              </div>
              <button
                onClick={handleCloseAddModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* General Error Banner */}
            {generalError && (
              <div className="flex items-center space-x-1.5 bg-red-50 border border-red-200 text-red-800 px-2.5 py-1.5 rounded-lg text-[11px]">
                <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Create User Form */}
            <form onSubmit={handleCreateUser} className="space-y-3">
              {/* Full Name */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="create-name" className="text-xs font-semibold text-slate-700">
                    Full Name
                  </Label>
                </div>
                <div className="relative">
                  <UserIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    id="create-name"
                    type="text"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                    }}
                    className={`pl-8 text-xs h-8.5 ${formErrors.name ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                  />
                </div>
                {formErrors.name && (
                  <p className="text-[10px] text-red-600 font-medium">{formErrors.name}</p>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <Label htmlFor="create-email" className="text-xs font-semibold text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    id="create-email"
                    type="email"
                    placeholder="abc.@example.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (formErrors.email) setFormErrors({ ...formErrors, email: undefined });
                    }}
                    className={`pl-8 text-xs h-8.5 ${formErrors.email ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                  />
                </div>
                {formErrors.email && (
                  <p className="text-[10px] text-red-600 font-medium">{formErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="create-password" className="text-xs font-semibold text-slate-700">
                    Password
                  </Label>
                  <span className="text-[10px] text-slate-400">Min. 8 characters</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    id="create-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (formErrors.password) setFormErrors({ ...formErrors, password: undefined });
                    }}
                    className={`pl-8 pr-8 text-xs h-8.5 ${formErrors.password ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-[10px] text-red-600 font-medium">{formErrors.password}</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Role</Label>
                <div className="flex items-center space-x-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
                    <UserCheck className="h-2.5 w-2.5 text-blue-600" />
                    <span>AGENT</span>
                  </span>
                  <span className="text-[11px] text-slate-500">Assigned default support agent role</span>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseAddModal}
                  disabled={createUserMutation.isPending}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createUserMutation.isPending}
                  className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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

