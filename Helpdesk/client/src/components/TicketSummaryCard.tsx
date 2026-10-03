import React, { useState } from 'react';
import type { Ticket } from '../lib/types';
import { useSummarizeTicket } from '../lib/hooks/useTickets';
import { ErrorMessage } from './ErrorMessage';
import { cn } from '../lib/utils';
import { Sparkles, Loader2 } from 'lucide-react';

export interface TicketSummaryCardProps {
  ticket: Ticket;
  className?: string;
  defaultOpen?: boolean;
  onError?: (errorMessage: string | null) => void;
}

export const TicketSummaryCard: React.FC<TicketSummaryCardProps> = ({
  ticket,
  className,
  defaultOpen = false,
  onError,
}) => {
  const [showSummary, setShowSummary] = useState<boolean>(
    Boolean(defaultOpen || (ticket.summary && ticket.summary.trim().length > 0))
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const summarizeMutation = useSummarizeTicket();

  const handleSummarize = async () => {
    setLocalError(null);
    onError?.(null);
    setShowSummary(true);

    try {
      await summarizeMutation.mutateAsync(ticket.id);
    } catch (err: any) {
      const msg = err?.message || 'Failed to summarize ticket and conversation history';
      setLocalError(msg);
      onError?.(msg);
    }
  };

  const hasSummary = Boolean(ticket.summary && ticket.summary.trim().length > 0);
  const isPending = summarizeMutation.isPending;

  return (
    <div className={cn('space-y-2.5', className)} data-testid="ticket-summary-card">
      {/* Top Action Button matching reference UI */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleSummarize}
          disabled={isPending}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-xs hover:bg-purple-100 hover:border-purple-300 dark:bg-purple-950/60 dark:border-purple-800/60 dark:text-purple-300 dark:shadow-[0_0_10px_rgba(168,85,247,0.15)] dark:hover:bg-purple-900/60 dark:hover:border-purple-700 dark:hover:text-purple-200 transition-all cursor-pointer select-none active:scale-[0.98]',
            isPending && 'opacity-80 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
          )}
          title="Summarize ticket and conversation history with AI"
          aria-label="Summarize Ticket"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600 dark:text-purple-400" />
              <span>Summarizing...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Summarize</span>
            </>
          )}
        </button>
      </div>

      {/* Error alert */}
      <ErrorMessage message={localError} />

      {/* Summary Content Card (Shown when clicked / summary available) */}
      {(showSummary || hasSummary || isPending) && (
        <div
          className="bg-purple-50/50 dark:bg-slate-900/90 backdrop-blur-md border border-purple-200 dark:border-purple-800/60 rounded-xl p-3.5 shadow-xs dark:shadow-[0_0_20px_rgba(168,85,247,0.12)] space-y-2 transition-all"
          data-testid="ticket-summary-context"
        >
          {/* Header */}
          <div className="flex items-center space-x-1.5 pb-2 border-b border-purple-200/80 dark:border-purple-900/60">
            <div className="p-1 rounded-md bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/80 dark:text-purple-400 dark:border-purple-800/70 shadow-xs dark:shadow-[0_0_8px_rgba(168,85,247,0.2)]">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-xs">
              AI Summary & Conversation History
            </h3>
          </div>

          {/* Body */}
          {isPending ? (
            <div
              className="p-3 bg-purple-100/50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800/50 flex items-center space-x-2.5 text-[11px] text-purple-900 dark:text-purple-200 animate-pulse"
              data-testid="summary-loading-state"
            >
              <Loader2 className="h-4 w-4 animate-spin text-purple-600 dark:text-purple-400 shrink-0" />
              <span>Analyzing ticket details and full conversation history with AI...</span>
            </div>
          ) : hasSummary ? (
            <div
              className="p-3 bg-white/80 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-lg text-[11px]"
              data-testid="ticket-summary-content"
            >
              <div className="text-slate-800 dark:text-slate-200 font-normal leading-relaxed whitespace-pre-line">
                {ticket.summary}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default TicketSummaryCard;
