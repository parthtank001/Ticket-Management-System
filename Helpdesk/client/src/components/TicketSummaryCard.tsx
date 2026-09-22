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
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer select-none active:scale-[0.98]',
            isPending && 'opacity-80 cursor-not-allowed bg-slate-50'
          )}
          title="Summarize ticket and conversation history with AI"
          aria-label="Summarize Ticket"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-700" />
              <span>Summarizing...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-slate-700" />
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
          className="bg-white border border-indigo-100/90 rounded-xl p-3.5 shadow-xs space-y-2 transition-all"
          data-testid="ticket-summary-context"
        >
          {/* Header */}
          <div className="flex items-center space-x-1.5 pb-2 border-b border-indigo-50/80">
            <div className="p-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-bold text-slate-900 text-xs">
              AI Summary & Conversation History
            </h3>
          </div>

          {/* Body */}
          {isPending ? (
            <div
              className="p-3 bg-indigo-50/40 rounded-lg border border-indigo-100 flex items-center space-x-2.5 text-[11px] text-indigo-900 animate-pulse"
              data-testid="summary-loading-state"
            >
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600 shrink-0" />
              <span>Analyzing ticket details and full conversation history with AI...</span>
            </div>
          ) : hasSummary ? (
            <div
              className="p-3 bg-indigo-50/50 border border-indigo-100/90 rounded-lg text-[11px]"
              data-testid="ticket-summary-content"
            >
              <div className="text-indigo-950 font-normal leading-relaxed whitespace-pre-line">
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
