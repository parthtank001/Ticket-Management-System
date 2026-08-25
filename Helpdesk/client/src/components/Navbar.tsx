import React, { useState } from 'react';
import { LogOut, Ticket, User as UserIcon, Shield, Loader2 } from 'lucide-react';
import { AuthUser } from '../lib/auth-client';

interface NavbarProps {
  user: AuthUser;
  onSignOut: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onSignOut }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOutClick = async () => {
    setIsLoggingOut(true);
    try {
      await onSignOut();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Helpdesk AI
              <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                Portal
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Ticket Management System
            </p>
          </div>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 bg-slate-800/60 border border-slate-700/50 rounded-full py-1.5 px-3.5">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-indigo-400 font-semibold text-sm border border-indigo-500/30">
              {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-100 leading-tight">
                {user.name || 'User'}
              </span>
              <div className="flex items-center space-x-1">
                <Shield className="h-3 w-3 text-indigo-400" />
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                  {user.role || 'AGENT'}
                </span>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOutClick}
            disabled={isLoggingOut}
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-red-500/15 hover:border-red-500/40 border border-slate-700/60 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm"
            title="Sign out of your account"
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 text-slate-400 group-hover:text-red-400 transition-colors" />
            )}
            <span className="group-hover:text-red-300">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
