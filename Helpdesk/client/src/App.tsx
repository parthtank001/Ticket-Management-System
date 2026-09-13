import React, { useState, useEffect } from 'react';
import { useSession, useSignOut } from './lib/hooks/useAuth';
import { AuthUser } from './lib/auth-client';
import type { Role } from './lib/types';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './components/HomePage';
import { UsersPage } from './components/UsersPage';
import { Ticket } from 'lucide-react';
import { Skeleton } from './components/ui/skeleton';

export default function App() {
  const { data: sessionData, isLoading: isLoadingSession } = useSession();
  const signOutMutation = useSignOut();
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);

  const user: AuthUser | null = sessionData?.user || null;

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

  // Skeleton placeholder while session status is verifying
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {/* Navbar Skeleton */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28 rounded" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        </header>

        {/* Workspace Body Skeleton */}
        <main className="flex-1 max-w-6xl mx-auto py-5 px-4 sm:px-6 w-full space-y-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-3.5 w-12 rounded" />
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-7 w-7 rounded-lg" />
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-28 rounded" />
                      <Skeleton className="h-2.5 w-36 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
              ))}
            </div>
          </div>
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
    if (currentPath === '/users') {
      const isAdmin = user?.role === 'ADMIN';
      if (!isAdmin) {
        return (
          <div className="max-w-4xl mx-auto py-16 px-4 text-center font-sans">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Ticket className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
            <p className="text-slate-600 max-w-md mx-auto mb-6 text-sm">
              The Users Directory is restricted to Admin accounts only.
            </p>
            <button
              onClick={() => navigateTo('/')}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <span>Return to Workspace</span>
            </button>
          </div>
        );
      }
      return <UsersPage user={user} />;
    }
    return <HomePage user={user} />;
  };

  // Render Navbar & active workspace view
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <Navbar user={user} currentPath={currentPath} onNavigate={navigateTo} onSignOut={handleSignOut} />
      <main className="flex-1">
        {renderMainContent()}
      </main>
    </div>
  );
}
