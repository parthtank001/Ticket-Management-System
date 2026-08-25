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
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm text-white">
            <Ticket className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Helpdesk AI
              <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                Portal
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Ticket Management System
            </p>
          </div>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2.5 bg-slate-50 border border-slate-200 rounded-full py-1 px-3">
            <div className="h-7 w-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-xs border border-indigo-200">
              {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="h-3.5 w-3.5" />}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {user.name || 'User'}
              </span>
              <div className="flex items-center space-x-1">
                <Shield className="h-2.5 w-2.5 text-indigo-600" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                  {user.role || 'AGENT'}
                </span>
              </div>
            </div>
          </div>

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
