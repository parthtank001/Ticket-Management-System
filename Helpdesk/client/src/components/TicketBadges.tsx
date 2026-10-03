import React from 'react';
import {
  STATUS_LABELS,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  SENDER_TYPE_LABELS,
  type TicketStatus,
  type Priority,
  type Category,
  type SenderType,
} from '../lib/types';
import {
  CheckCircle2,
  Archive,
  AlertCircle,
  HelpCircle,
  Laptop,
  CreditCard,
  Tag,
  User,
  Shield,
  Lock,
  Bot,
} from 'lucide-react';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
}

export const TicketStatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  const label = STATUS_LABELS[status] || status;

  switch (status) {
    case 'NEW':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-700/60 shadow-xs dark:shadow-[0_0_8px_rgba(99,102,241,0.2)] ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse shadow-[0_0_6px_rgba(99,102,241,0.8)]" />
          <span>{label}</span>
        </span>
      );
    case 'PROCESSING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-700/60 shadow-xs dark:shadow-[0_0_8px_rgba(168,85,247,0.2)] ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
          <span>{label}</span>
        </span>
      );
    case 'OPEN':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-cyan-950/70 dark:text-cyan-300 dark:border-cyan-700/60 shadow-xs dark:shadow-[0_0_8px_rgba(6,182,212,0.2)] ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
          <span>{label}</span>
        </span>
      );
    case 'RESOLVED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700/60 shadow-xs dark:shadow-[0_0_8px_rgba(16,185,129,0.2)] ${sizeClasses}`}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span>{label}</span>
        </span>
      );
    case 'CLOSED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700/60 ${sizeClasses}`}
        >
          <Archive className="h-3 w-3 text-slate-400 dark:text-slate-500" />
          <span>{label}</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${sizeClasses}`}>
          <span>{label}</span>
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
  const label = PRIORITY_LABELS[priority] || priority;

  switch (priority) {
    case 'URGENT':
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700/70 shadow-xs dark:shadow-[0_0_8px_rgba(244,63,94,0.25)] ${sizeClasses}`}
        >
          <AlertCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
          <span>{label}</span>
        </span>
      );
    case 'HIGH':
      return (
        <span
          className={`inline-flex items-center gap-1 font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/70 ${sizeClasses}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
          <span>{label}</span>
        </span>
      );
    case 'MEDIUM':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-700/70 ${sizeClasses}`}
        >
          <span>{label}</span>
        </span>
      );
    case 'LOW':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700/60 ${sizeClasses}`}
        >
          <span>{label}</span>
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
  const label = category ? CATEGORY_LABELS[category] || category : 'Uncategorized';

  switch (category) {
    case 'GENERAL_QUESTION':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60 ${sizeClasses}`}
        >
          <HelpCircle className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
          <span>{label}</span>
        </span>
      );
    case 'TECHNICAL_QUESTION':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-md bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60 ${sizeClasses}`}
        >
          <Laptop className="h-3 w-3 text-sky-600 dark:text-cyan-400" />
          <span>{label}</span>
        </span>
      );
    case 'REFUND_REQUEST':
      return (
        <span
          className={`inline-flex items-center gap-1 font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 ${sizeClasses}`}
        >
          <CreditCard className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span>{label}</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-normal rounded-md bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700/50 italic ${sizeClasses}`}
        >
          <Tag className="h-3 w-3 text-slate-400 dark:text-slate-500" />
          <span>{label}</span>
        </span>
      );
  }
};

interface SenderBadgeProps {
  senderType: SenderType;
  isInternalNote?: boolean;
  size?: 'sm' | 'md';
}

export const TicketSenderBadge: React.FC<SenderBadgeProps> = ({
  senderType,
  isInternalNote = false,
  size = 'sm',
}) => {
  const isSm = size === 'sm';
  const sizeClasses = isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';

  if (isInternalNote) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-bold rounded bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/90 dark:text-amber-200 dark:border-amber-700/80 shadow-xs dark:shadow-[0_0_8px_rgba(245,158,11,0.25)] ${sizeClasses}`}
      >
        <Lock className="h-2.5 w-2.5 text-amber-700 dark:text-amber-300" />
        <span>Internal Note</span>
      </span>
    );
  }

  switch (senderType) {
    case 'STUDENT':
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 ${sizeClasses}`}
        >
          <User className="h-2.5 w-2.5 text-slate-500 dark:text-slate-400" />
          <span>Student</span>
        </span>
      );
    case 'AGENT':
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800/80 shadow-xs dark:shadow-[0_0_8px_rgba(99,102,241,0.15)] ${sizeClasses}`}
        >
          <Shield className="h-2.5 w-2.5 text-indigo-600 dark:text-indigo-400" />
          <span>Support Agent</span>
        </span>
      );
    case 'SYSTEM':
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800/80 shadow-xs dark:shadow-[0_0_8px_rgba(168,85,247,0.15)] ${sizeClasses}`}
        >
          <Bot className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
          <span>System</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-bold rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 ${sizeClasses}`}
        >
          <span>{senderType}</span>
        </span>
      );
  }
};

// Aliases for flexible imports
export const CategoryBadge = TicketCategoryBadge;
export const PriorityBadge = TicketPriorityBadge;
export const StatusBadge = TicketStatusBadge;
export const SenderBadge = TicketSenderBadge;

