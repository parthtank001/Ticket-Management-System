import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, Ticket, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { AuthUser } from '../lib/auth-client';
import { useSignIn } from '../lib/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '../lib/utils';

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
  onLoginSuccess: (user?: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const signInMutation = useSignIn();

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

    try {
      const result = await signInMutation.mutateAsync({
        email: data.email.trim(),
        password: data.password,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Invalid credentials or network error.');
        return;
      }

      onLoginSuccess(result.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to the authentication service.');
    }
  };

  const isLoading = signInMutation.isPending;

  const handleQuickFill = (fillEmail: string, fillPass: string) => {
    setValue('email', fillEmail, { shouldValidate: true });
    setValue('password', fillPass, { shouldValidate: true });
    clearErrors();
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080C14] flex items-center justify-center p-4 font-sans selection:bg-indigo-500/20 selection:text-indigo-900 dark:selection:text-indigo-200">
      
      {/* Centered Modern Glass Card */}
      <Card className="w-full max-w-sm shadow-xl dark:shadow-[0_0_40px_rgba(0,0,0,0.8)] border-slate-200/80 dark:border-slate-800/90 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl overflow-hidden">
        
        {/* Card Header */}
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
            <Ticket className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <span>Helpdesk Platform</span>
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Sign in to access your workspace
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Alert */}
          {errorMessage && (
            <Alert variant="destructive" className="py-2.5 px-3 text-xs bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 shadow-xs">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <AlertDescription className="font-medium ml-2">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Work Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  aria-invalid={errors.email ? 'true' : 'false'}
                  {...register('email')}
                  placeholder="admin@example.com"
                  className={cn(
                    'pl-9 h-9 text-xs transition-colors bg-white dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-600',
                    errors.email
                      ? 'border-rose-500 focus-visible:ring-rose-500/30 focus-visible:border-rose-500 bg-rose-50 dark:bg-rose-950/20'
                      : ''
                  )}
                />
              </div>
              {errors.email && (
                <p className="text-rose-600 dark:text-rose-400 text-[11px] font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  {...register('password')}
                  placeholder="••••••••••••"
                  className={cn(
                    'pl-9 pr-9 h-9 text-xs transition-colors bg-white dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-600',
                    errors.password
                      ? 'border-rose-500 focus-visible:ring-rose-500/30 focus-visible:border-rose-500 bg-rose-50 dark:bg-rose-950/20'
                      : ''
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-600 dark:text-rose-400 text-[11px] font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.99] cursor-pointer rounded-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-3.5 w-3.5 mr-1.5 text-white" />
                  <span>Sign In to Workspace</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>

        {/* Quick Demo Footer */}
        <CardFooter className="flex flex-col pt-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 rounded-b-2xl">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Demo Quick Select
            </span>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40">
              Demo Credentials
            </Badge>
          </div>

          <div className="w-full grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@example.com', 'password123')}
              className="p-2 bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-xl text-left transition-all group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Admin</span>
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 truncate">admin@example.com</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('agent@example.com', 'password123')}
              className="p-2 bg-white dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50 rounded-xl text-left transition-all group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Agent</span>
                <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 truncate">agent@example.com</p>
            </button>
          </div>
        </CardFooter>

      </Card>
    </div>
  );
};
