import React, { useState } from 'react';
import { LogOut, Ticket, Loader2, Users, LayoutDashboard, Sun, Moon } from 'lucide-react';
import { AuthUser } from '../lib/auth-client';
import type { Role } from '../lib/types';
import { useTheme } from '../lib/theme';

interface NavbarProps {
  user: AuthUser;
  currentPath: string;
  onNavigate: (path: string) => void;
  onSignOut: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({ user, currentPath, onNavigate, onSignOut }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();
  const isAdmin = user?.role === 'ADMIN';
  const displayRole: Role = isAdmin ? 'ADMIN' : 'AGENT';

  const handleSignOutClick = async () => {
    setIsLoggingOut(true);
    try {
      await onSignOut();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isDashboardActive = currentPath === '/' || currentPath === '/dashboard';
  const isTicketsActive = currentPath === '/tickets' || currentPath.startsWith('/tickets/');
  const isUsersActive = currentPath === '/users';

  return (
    <header className="sticky top-0 z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/90 px-4 lg:px-8 py-3 shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Navigation Links */}
        <div className="flex items-center space-x-6">
          <div
            onClick={() => onNavigate('/')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 group-hover:from-indigo-500 group-hover:to-indigo-400 flex items-center justify-center shadow-xs text-white transition-all">
              <Ticket className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <span>Helpdesk AI</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </h2>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => onNavigate('/')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isDashboardActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              title="Go to Dashboard"
            >
              <LayoutDashboard className={`h-3.5 w-3.5 ${isDashboardActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onNavigate('/tickets')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isTicketsActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              title="Go to Tickets"
            >
              <Ticket className={`h-3.5 w-3.5 ${isTicketsActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span>Tickets</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => onNavigate('/users')}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isUsersActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
                title="Go to Users Directory"
              >
                <Users className={`h-3.5 w-3.5 ${isUsersActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <span>Users</span>
              </button>
            )}
          </div>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
            aria-label="Toggle theme"
            title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600" />
            )}
          </button>

          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
            {displayRole}
          </span>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOutClick}
            disabled={isLoggingOut}
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 bg-slate-100/80 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700/60 hover:border-rose-200 dark:hover:border-rose-800/50 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            title="Sign out of your account"
          >
            {isLoggingOut ? (
              <Loader2 className="h-3 w-3 text-slate-400 animate-spin" />
            ) : (
              <LogOut className="h-3 w-3 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors" />
            )}
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
