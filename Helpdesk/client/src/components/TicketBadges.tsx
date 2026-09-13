import React from 'react';
import type { TicketStatus, Priority, Category } from '../lib/types';
import { Clock, CheckCircle2, Archive, AlertCircle, HelpCircle, Laptop, CreditCard, Tag } from 'lucide-react';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
}

export const TicketStatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case 'OPEN':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
          <span>Open</span>
        </span>
      );
    case 'RESOLVED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${sizeClasses}`}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span>Resolved</span>
        </span>
      );
    case 'CLOSED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}
        >
          <Archive className="h-3 w-3 text-slate-400" />
          <span>Closed</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          <span>{status}</span>
        </span>
      );
  }
};

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

export const TicketPriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';

  switch (priority) {
    case 'URGENT':
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200/80 ${sizeClasses}`}
        >
          <AlertCircle className="h-3 w-3 text-rose-600" />
          <span>Urgent</span>
        </span>
      );
    case 'HIGH':
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span>High</span>
        </span>
      );
    case 'MEDIUM':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 ${sizeClasses}`}
        >
          <span>Medium</span>
        </span>
      );
    case 'LOW':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-md bg-slate-50 text-slate-600 border border-slate-200 ${sizeClasses}`}
        >
          <span>Low</span>
        </span>
      );
  }
};

interface CategoryBadgeProps {
  category?: Category | null;
  size?: 'sm' | 'md';
}

export const TicketCategoryBadge: React.FC<CategoryBadgeProps> = ({ category, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';

  switch (category) {
    case 'GENERAL_QUESTION':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 ${sizeClasses}`}
        >
          <HelpCircle className="h-3 w-3 text-indigo-500" />
          <span>General Question</span>
        </span>
      );
    case 'TECHNICAL_QUESTION':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-md bg-violet-50 text-violet-700 border border-violet-200/60 ${sizeClasses}`}
        >
          <Laptop className="h-3 w-3 text-violet-500" />
          <span>Technical Question</span>
        </span>
      );
    case 'REFUND_REQUEST':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 ${sizeClasses}`}
        >
          <CreditCard className="h-3 w-3 text-emerald-500" />
          <span>Refund Request</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-normal rounded-md bg-slate-50 text-slate-500 border border-slate-200/70 italic ${sizeClasses}`}
        >
          <Tag className="h-3 w-3 text-slate-400" />
          <span>Uncategorized</span>
        </span>
      );
  }
};
