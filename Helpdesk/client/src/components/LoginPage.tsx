import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, Ticket, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { authClient, AuthUser } from '../lib/auth-client';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await authClient.signIn(email.trim(), password);

      if (!result.success) {
        setErrorMessage(result.error || 'Invalid credentials. Please verify your email and password.');
        return;
      }

      const sessionData = await authClient.getSession();
      if (sessionData.user) {
        onLoginSuccess(sessionData.user);
      } else if (result.user) {
        onLoginSuccess(result.user);
      } else {
        onLoginSuccess({
          id: 'user-id',
          name: email.split('@')[0],
          email,
          role: 'ADMIN',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection error while contacting authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center p-4 font-sans">
      
      {/* Centered White Compact Login Box */}
      <div className="w-full max-w-xs bg-white border border-slate-200 rounded-2xl p-5 shadow-lg shadow-slate-200/50 space-y-4">
        
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 mb-1">
            <Ticket className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Helpdesk Platform</h1>
          <p className="text-slate-500 text-xs">
            Sign in to access your workspace
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center space-x-2.5 text-red-700 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Work Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-medium transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-3.5 w-3.5" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-medium transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 flex items-center justify-center space-x-1.5 disabled:opacity-60 active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In to Workspace</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Select */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Demo Quick Select
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@example.com', 'password123')}
              className="p-2 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-lg text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">Admin</span>
                <ShieldCheck className="h-3 w-3 text-indigo-600" />
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">admin@example.com</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('agent@example.com', 'password123')}
              className="p-2 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-lg text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-600">Agent</span>
                <UserCheck className="h-3 w-3 text-emerald-600" />
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">agent@example.com</p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
