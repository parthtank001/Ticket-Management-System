import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ErrorMessageProps {
  message?: string | null;
  children?: React.ReactNode;
  className?: string;
  variant?: 'rose' | 'amber' | 'red';
  size?: 'sm' | 'md';
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  children,
  className = '',
  variant = 'rose',
  size = 'sm',
  onDismiss,
}) => {
  const content = message || children;
  if (!content) return null;

  const variantStyles = {
    rose: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300',
    red: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300',
    amber: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300',
  };

  const iconColorStyles = {
    rose: 'text-rose-600 dark:text-rose-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };

  const sizeStyles = {
    sm: 'p-2.5 rounded-lg text-[11px]',
    md: 'p-3 rounded-xl text-xs',
  };

  const iconSizeStyles = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
  };

  return (
    <div
      role="alert"
      className={cn(
        'border flex items-center justify-between space-x-2',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      <div className="flex items-center space-x-2 min-w-0">
        <AlertCircle
          className={cn('shrink-0', iconSizeStyles[size], iconColorStyles[variant])}
        />
        <span className="break-words">{content}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto text-current opacity-70 hover:opacity-100 transition-opacity p-0.5 cursor-pointer shrink-0"
          aria-label="Dismiss error"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
