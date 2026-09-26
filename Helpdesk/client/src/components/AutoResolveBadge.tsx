import React from 'react';
import { Sparkles, ShieldAlert, CheckCircle2, Bot } from 'lucide-react';
import { cn } from '../lib/utils';

export interface AutoResolveBadgeProps {
  isAutoResolved?: boolean;
  canAutoResolve?: boolean;
  isEscalated?: boolean;
  sectionTitle?: string;
  className?: string;
  variant?: 'badge' | 'banner' | 'compact';
}

export const AutoResolveBadge: React.FC<AutoResolveBadgeProps> = ({
  isAutoResolved,
  canAutoResolve,
  isEscalated,
  sectionTitle,
  className,
  variant = 'badge',
}) => {
  if (isEscalated) {
    if (variant === 'banner') {
      return (
        <div
          role="alert"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium',
            className
          )}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Escalation Policy Triggered: Human Agent Review Required</span>
        </div>
      );
    }

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20',
          className
        )}
      >
        <ShieldAlert className="w-3 h-3 text-rose-400" />
        Escalated
      </span>
    );
  }

  if (isAutoResolved) {
    if (variant === 'banner') {
      return (
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Auto-Resolved via Knowledge Base {sectionTitle ? `(${sectionTitle})` : ''}</span>
          </div>
          <span className="text-[11px] text-emerald-400/80 uppercase tracking-wider font-semibold">100% Policy Match</span>
        </div>
      );
    }

    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          className
        )}
      >
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        Auto-Resolved
      </span>
    );
  }

  if (canAutoResolve) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
          className
        )}
      >
        <Sparkles className="w-3 h-3 text-indigo-400" />
        KB Match Eligible
      </span>
    );
  }

  return null;
};
