import React, { useState } from 'react';
import { LogOut, Ticket, User as UserIcon, Shield, Loader2, Users } from 'lucide-react';
import { AuthUser } from '../lib/auth-client';

interface NavbarProps {
  user: AuthUser;
  currentPath: string;
  onNavigate: (path: string) => void;
  onSignOut: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({ user, currentPath, onNavigate, onSignOut }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.email?.toLowerCase().includes('admin');
  const displayRole = isAdmin ? 'ADMIN' : 'AGENT';

  const handleSignOutClick = async () => {
    setIsLoggingOut(true);
    try {
      await onSignOut();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Navigation */}
        <div className="flex items-center space-x-6">
          <div
            onClick={() => onNavigate('/')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 flex items-center justify-center shadow-sm text-white transition-colors">
              <Ticket className="h-4.5 w-4.5" />
            </div>
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  Helpdesk AI
                </h1>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  Ticket Management System
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('/users');
                  }}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentPath === '/users'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  title="Go to Users Directory"
                >
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Users</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            {displayRole}
          </span>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOutClick}
            disabled={isLoggingOut}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-red-700 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
            title="Sign out of your account"
          >
            {isLoggingOut ? (
              <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5 text-slate-400 group-hover:text-red-600 transition-colors" />
            )}
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
