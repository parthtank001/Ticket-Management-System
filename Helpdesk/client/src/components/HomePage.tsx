import React from 'react';
import { AuthUser } from '../lib/auth-client';

interface HomePageProps {
  user: AuthUser;
}

export const HomePage: React.FC<HomePageProps> = ({ user }) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Welcome, {user.name}
        </h1>
        <p className="text-slate-400 text-sm">
          Authenticated as <span className="text-indigo-400 font-mono font-semibold">{user.email}</span> ({user.role})
        </p>
      </div>
    </div>
  );
};
