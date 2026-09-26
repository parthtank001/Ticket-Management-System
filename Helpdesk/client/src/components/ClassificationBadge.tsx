import React from 'react';
import { Sparkles, Brain, ShieldAlert, Tag, CheckCircle2 } from 'lucide-react';
import type { Category, Priority } from '../lib/types';
import { cn } from '../lib/utils';
import { CategoryBadge, PriorityBadge } from './TicketBadges';

export interface ClassificationBadgeProps {
  category?: Category | null;
  priority?: Priority | null;
  confidence?: number;
  reasoning?: string;
  isEscalated?: boolean;
  tags?: string[];
  className?: string;
  variant?: 'badge' | 'banner' | 'compact';
}

export const ClassificationBadge: React.FC<ClassificationBadgeProps> = ({
  category,
  priority,
  confidence,
  reasoning,
  isEscalated,
  tags,
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
          <span>Escalation Rule Triggered: Routed to Senior Support</span>
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

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            AI Classified: {category ? category.replace('_', ' ') : 'Pending'}{' '}
            {confidence ? `(${Math.round(confidence * 100)}% Confidence)` : ''}
          </span>
        </div>
        {reasoning && <span className="text-slate-400 text-[11px] truncate max-w-xs">{reasoning}</span>}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
          className
        )}
      >
        <Sparkles className="w-3 h-3 text-indigo-400" />
        {confidence ? `${Math.round(confidence * 100)}%` : 'AI'}
      </span>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-2 flex-wrap', className)}>
      {category && <CategoryBadge category={category} />}
      {priority && <PriorityBadge priority={priority} />}
      {confidence !== undefined && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          {Math.round(confidence * 100)}% Confidence
        </span>
      )}
      {tags && tags.length > 0 && (
        <div className="flex items-center gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-normal bg-slate-800 text-slate-400 border border-slate-700"
            >
              <Tag className="w-2.5 h-2.5 text-slate-500" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
