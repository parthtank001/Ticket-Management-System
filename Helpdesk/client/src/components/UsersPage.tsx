import React from 'react';
import { AuthUser } from '../lib/auth-client';

interface UsersPageProps {
  user: AuthUser;
}

export const UsersPage: React.FC<UsersPageProps> = () => {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
        Users
      </h1>
    </div>
  );
};
