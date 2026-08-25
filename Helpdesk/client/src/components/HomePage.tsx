import React from 'react';
import { AuthUser } from '../lib/auth-client';

interface HomePageProps {
  user: AuthUser;
}

export const HomePage: React.FC<HomePageProps> = ({ user }) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100 text-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg shadow-slate-200/50 text-center max-w-md w-full space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Welcome to the Helpdesk
        </h1>
        <p className="text-slate-500 text-sm font-medium">
          Logged in as <span className="font-semibold text-slate-700">{user.name || user.email}</span>
        </p>
      </div>
    </div>
  );
};
