import React, { useState, useEffect } from 'react';
import { authClient, AuthUser } from './lib/auth-client';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './components/HomePage';
import { UsersPage } from './components/UsersPage';
import { Ticket, Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);

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

  // Check active authentication session on initial load
  const checkSession = async () => {
    setIsLoadingSession(true);
    try {
      const sessionData = await authClient.getSession();
      if (sessionData && sessionData.user) {
        setUser(sessionData.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Session check failed:', err);
      setUser(null);
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLoginSuccess = (loggedInUser: AuthUser) => {
    setUser(loggedInUser);
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    setUser(null);
    navigateTo('/');
  };

  // Fullscreen loading spinner while session status is verifying
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse">
            <Ticket className="h-6 w-6 text-white" />
          </div>
          <div className="flex items-center space-x-2 text-slate-500 font-medium text-xs">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span>Verifying workspace session...</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is not logged in, show Login Page
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Determine active view component based on route
  const renderMainContent = () => {
    if (currentPath === '/users') {

      const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
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
