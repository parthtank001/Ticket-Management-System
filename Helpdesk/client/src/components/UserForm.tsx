import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, CreateUserInput, Role } from '@helpdesk/core';
import { useCreateUser } from '../lib/hooks/useUsers';
import { cn } from '../lib/utils';
import {
  UserCheck,
  Mail,
  AlertCircle,
  Loader2,
  UserPlus,
  Eye,
  EyeOff,
  X,
  Lock,
  User as UserIcon,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const createUserMutation = useCreateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: Role.AGENT,
      isActive: true,
    },
  });

  const handleClose = () => {
    reset();
    setGeneralError(null);
    setShowPassword(false);
    onClose();
  };

  // Close dialog on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleCreateUser = async (data: CreateUserInput) => {
    setGeneralError(null);

    try {
      await createUserMutation.mutateAsync({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        role: data.role || Role.AGENT,
        isActive: data.isActive !== undefined ? data.isActive : true,
      });

      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to create user account.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
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
            onClick={handleClose}
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
        <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-3" noValidate>
          {/* Full Name */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="create-name" className="text-xs font-semibold text-slate-700">
                Full Name
              </Label>
            </div>
            <div className="relative">
              <UserIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <Input
                id="create-name"
                type="text"
                placeholder="Full Name"
                aria-invalid={errors.name ? 'true' : 'false'}
                {...register('name')}
                className={cn(
                  'pl-8 text-xs h-8.5 transition-colors',
                  errors.name
                    ? 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 bg-red-50/20'
                    : 'border-slate-200 focus-visible:ring-indigo-500'
                )}
              />
            </div>
            {errors.name && (
              <p className="text-[10px] text-red-600 font-medium">{errors.name.message}</p>
            )}
          </div>

          {/* Email Address */}
          <div className="space-y-1">
            <Label htmlFor="create-email" className="text-xs font-semibold text-slate-700">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <Input
                id="create-email"
                type="email"
                placeholder="abc.@example.com"
                aria-invalid={errors.email ? 'true' : 'false'}
                {...register('email')}
                className={cn(
                  'pl-8 text-xs h-8.5 transition-colors',
                  errors.email
                    ? 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 bg-red-50/20'
                    : 'border-slate-200 focus-visible:ring-indigo-500'
                )}
              />
            </div>
            {errors.email && (
              <p className="text-[10px] text-red-600 font-medium">{errors.email.message}</p>
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
              <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <Input
                id="create-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                aria-invalid={errors.password ? 'true' : 'false'}
                {...register('password')}
                className={cn(
                  'pl-8 pr-8 text-xs h-8.5 transition-colors',
                  errors.password
                    ? 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500 bg-red-50/20'
                    : 'border-slate-200 focus-visible:ring-indigo-500'
                )}
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
            {errors.password && (
              <p className="text-[10px] text-red-600 font-medium">{errors.password.message}</p>
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
              onClick={handleClose}
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
  );
};

export const CreateUserModal = UserForm;
export const AddUserModal = UserForm;
export default UserForm;
