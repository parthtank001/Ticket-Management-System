import React, { useState, useEffect } from 'react';
import { authClient, AuthUser } from './lib/auth-client';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { HomePage } from './components/HomePage';
import { Ticket, Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

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
  };

  // Fullscreen loading spinner while session status is verifying
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-xl shadow-indigo-500/20 animate-pulse">
            <Ticket className="h-7 w-7 text-white" />
          </div>
          <div className="flex items-center space-x-2 text-slate-400 font-medium text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is not logged in, show Login Page
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // If user is logged in, show Navbar & HomePage dashboard
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar user={user} onSignOut={handleSignOut} />
      <main className="flex-1">
        <HomePage user={user} />
      </main>
    </div>
  );
}
