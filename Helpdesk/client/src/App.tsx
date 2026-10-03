import React, { useState, useEffect } from 'react';
import { useSession, useSignOut } from './lib/hooks/useAuth';
import { AuthUser } from './lib/auth-client';
import type { Role } from './lib/types';
import { setSentryUser, triggerClientTestError } from './lib/sentry';
import { ThemeProvider } from './lib/theme';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './components/HomePage';
import { TicketsPage } from './components/TicketsPage';
import { TicketDetailPage } from './components/TicketDetailPage';
import { UsersPage } from './components/UsersPage';
import { SentryDebugPage } from './components/SentryDebugPage';
import { Ticket } from 'lucide-react';
import { Skeleton } from './components/ui/skeleton';

export default function App() {
  const { data: sessionData, isLoading: isLoadingSession } = useSession();
  const signOutMutation = useSignOut();
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);

  const user: AuthUser | null = sessionData?.user || null;

  // Synchronize authenticated user profile with Sentry scope & expose console debug helper
  useEffect(() => {
    setSentryUser(user);
    if (typeof window !== 'undefined') {
      (window as any).triggerTestSentryError = triggerClientTestError;
    }
  }, [user]);

  // Sync state on browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync();
    navigateTo('/');
  };

  return (
    <ThemeProvider defaultTheme="light">
      <AppContent
        isLoadingSession={isLoadingSession}
        user={user}
        currentPath={currentPath}
        navigateTo={navigateTo}
        handleSignOut={handleSignOut}
      />
    </ThemeProvider>
  );
}

interface AppContentProps {
  isLoadingSession: boolean;
  user: AuthUser | null;
  currentPath: string;
  navigateTo: (path: string) => void;
  handleSignOut: () => Promise<void>;
}

function AppContent({
  isLoadingSession,
  user,
  currentPath,
  navigateTo,
  handleSignOut,
}: AppContentProps) {
  // Skeleton placeholder while session status is verifying
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        {/* Navbar Skeleton */}
        <header className="bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                  <Skeleton className="h-2.5 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-20 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          </div>
        </header>

        {/* Workspace Body Skeleton */}
        <main className="flex-1 max-w-6xl mx-auto py-5 px-4 sm:px-6 w-full space-y-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
            <Skeleton className="h-3.5 w-12 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
              <Skeleton className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
              <Skeleton className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                      <Skeleton className="h-2.5 w-36 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16 rounded-md bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If user navigates directly to /debug-sentry, allow access even before login for quick verification
  if (currentPath === '/debug-sentry' || currentPath === '/debug') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 lg:px-8 py-3 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigateTo('/')}>
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs text-white">
              <Ticket className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">Helpdesk AI</h2>
          </div>
          <button
            onClick={() => navigateTo('/')}
            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 text-xs font-semibold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
          >
            ← Back to Home
          </button>
        </header>
        <main className="flex-1">
          <SentryDebugPage />
        </main>
      </div>
    );
  }

  // If user is not logged in, show Login Page
  if (!user) {
    return <LoginPage onLoginSuccess={() => navigateTo('/')} />;
  }

  // Determine active view component based on route
  const renderMainContent = () => {
    if (currentPath === '/debug-sentry' || currentPath === '/debug') {
      return <SentryDebugPage />;
    }

    if (currentPath === '/users') {
      const isAdmin = user?.role === 'ADMIN';
      if (!isAdmin) {
        return (
          <div className="max-w-4xl mx-auto py-16 px-4 text-center font-sans">
            <div className="mx-auto h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/50 flex items-center justify-center mb-4">
              <Ticket className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Access Restricted</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6 text-sm">
              The Users Directory is restricted to Admin accounts only.
            </p>
            <button
              onClick={() => navigateTo('/')}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>Return to Workspace</span>
            </button>
          </div>
        );
      }
      return <UsersPage user={user} />;
    }

    const ticketDetailMatch = currentPath.match(/^\/tickets\/(\d+)$/);
    if (ticketDetailMatch) {
      const ticketId = parseInt(ticketDetailMatch[1], 10);
      return (
        <TicketDetailPage
          ticketId={ticketId}
          user={user}
          onNavigate={navigateTo}
        />
      );
    }

    if (currentPath === '/tickets') {
      return <TicketsPage user={user} onNavigate={navigateTo} />;
    }

    return <HomePage user={user} onNavigate={navigateTo} />;
  };

  // Render Navbar & active workspace view
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500/20 dark:selection:bg-indigo-500/30 selection:text-indigo-900 dark:selection:text-indigo-200 transition-colors duration-200">
      <Navbar user={user} currentPath={currentPath} onNavigate={navigateTo} onSignOut={handleSignOut} />
      <main className="flex-1">
        {renderMainContent()}
      </main>
    </div>
  );
}
