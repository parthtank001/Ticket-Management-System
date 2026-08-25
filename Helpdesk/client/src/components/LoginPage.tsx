import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, Ticket, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { authClient, AuthUser } from '../lib/auth-client';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await authClient.signIn(data.email.trim(), data.password);

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
          name: data.email.split('@')[0],
          email: data.email,
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
    setValue('email', fillEmail, { shouldValidate: true });
    setValue('password', fillPass, { shouldValidate: true });
    clearErrors();
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Work Email
            </label>
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${
                errors.email ? 'text-red-500' : 'text-slate-400'
              }`}>
                <Mail className="h-3.5 w-3.5" />
              </div>
              <input
                id="email"
                type="email"
                {...register('email')}
                placeholder="admin@example.com"
                className={`w-full pl-9 pr-3 py-2 rounded-lg text-slate-900 placeholder-slate-400 text-xs font-medium transition-all focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'bg-red-50/30 border border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'bg-slate-50 border border-slate-300 focus:ring-indigo-500 focus:bg-white'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-[10px] mt-1 font-medium flex items-center space-x-1">
                <span>{errors.email.message}</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${
                errors.password ? 'text-red-500' : 'text-slate-400'
              }`}>
                <Lock className="h-3.5 w-3.5" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••••••"
                className={`w-full pl-9 pr-9 py-2 rounded-lg text-slate-900 placeholder-slate-400 text-xs font-medium transition-all focus:outline-none focus:ring-2 ${
                  errors.password
                    ? 'bg-red-50/30 border border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'bg-slate-50 border border-slate-300 focus:ring-indigo-500 focus:bg-white'
                }`}
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
            {errors.password && (
              <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.password.message}</p>
            )}
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
