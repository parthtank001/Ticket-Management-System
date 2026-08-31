import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, Ticket, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { authClient, AuthUser } from '../lib/auth-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
        setErrorMessage(result.error || 'failed to fetch');
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
      setErrorMessage(err.message || 'failed to fetch');
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      
      {/* Centered shadcn Card */}
      <Card className="w-full max-w-sm shadow-xl border-slate-200 bg-white">
        
        {/* Card Header */}
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
            <Ticket className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
              Helpdesk Platform
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs mt-1">
              Sign in to access your workspace
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Alert */}
          {errorMessage && (
            <Alert variant="destructive" className="py-2.5 px-3 text-xs bg-red-50 text-red-800 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <AlertDescription className="font-medium ml-2">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Work Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="admin@example.com"
                  className={`pl-9 h-9 text-xs transition-colors ${
                    errors.email ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/20' : 'bg-slate-50/50'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-[11px] font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••••••"
                  className={`pl-9 pr-9 h-9 text-xs transition-colors ${
                    errors.password ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/20' : 'bg-slate-50/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-[11px] font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 mt-1 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-sm transition-all active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-3.5 w-3.5 mr-1.5" />
                  <span>Sign In to Workspace</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>

        {/* Quick Demo Footer */}
        <CardFooter className="flex flex-col pt-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Demo Quick Select
            </span>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-slate-500">
              Demo Credentials
            </Badge>
          </div>

          <div className="w-full grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@example.com', 'password123')}
              className="p-2 bg-white hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-300 rounded-lg text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600">Admin</span>
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">admin@example.com</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('agent@example.com', 'password123')}
              className="p-2 bg-white hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-300 rounded-lg text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-600">Agent</span>
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">agent@example.com</p>
            </button>
          </div>
        </CardFooter>

      </Card>
    </div>
  );
};
