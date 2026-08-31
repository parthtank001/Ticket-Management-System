import React from 'react';
import { AuthUser } from '../lib/auth-client';
import { Users as UsersIcon, ShieldAlert } from 'lucide-react';

interface UsersPageProps {
  user: AuthUser;
}

export const UsersPage: React.FC<UsersPageProps> = ({ user }) => {
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.email?.toLowerCase().includes('admin');

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <ShieldAlert className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-600 max-w-md mx-auto text-sm">
          You do not have administrative permissions to view the Users page.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5 mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <UsersIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users</h1>
            <p className="text-sm text-slate-500 font-medium">
              Manage system users and access roles (Admin Only)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
