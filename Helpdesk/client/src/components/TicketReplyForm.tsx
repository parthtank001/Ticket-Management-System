import React, { useState } from 'react';
import type { Ticket } from '../lib/types';
import { useAddTicketMessage, usePolishReply, useTicket } from '../lib/hooks/useTickets';
import {
  Send,
  Loader2,
  Reply,
  Sparkles,
  Check,
} from 'lucide-react';
import { ErrorMessage } from './ErrorMessage';

export interface TicketReplyFormProps {
  ticketId?: number;
  ticket?: Ticket;
  showHeader?: boolean;
  showCardWrapper?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  className?: string;
}

export const TicketReplyForm: React.FC<TicketReplyFormProps> = ({
  ticketId: propTicketId,
  ticket: propTicket,
  showHeader = true,
  showCardWrapper = false,
  onSuccess,
  onError,
  onClose,
  className = '',
}) => {
  const [replyBody, setReplyBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isPolished, setIsPolished] = useState(false);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const activeTicketId = propTicket?.id ?? propTicketId;
  const { data: fetchedTicket } = useTicket(propTicket ? undefined : activeTicketId);
  const activeTicket = propTicket || fetchedTicket;
  const recipientName = activeTicket?.studentName;
  const addMessageMutation = useAddTicketMessage();
  const polishReplyMutation = usePolishReply();

  const handlePolishReply = async () => {
    if (!replyBody.trim()) {
      setFormError('Please enter a draft reply before polishing.');
      return;
    }

    setFormError(null);
    try {
      const result = await polishReplyMutation.mutateAsync({
        text: replyBody.trim(),
        studentName: recipientName,
        category: activeTicket?.category || undefined,
      });

      if (result.polishedReply) {
        setReplyBody(result.polishedReply);
        setIsPolished(true);
        setTimeout(() => setIsPolished(false), 3000);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to polish reply with AI';
      setFormError(errorMsg);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) {
      return;
    }

    if (!activeTicketId) {
      setFormError('No valid ticket ID provided.');
      return;
    }

    setFormError(null);
    setSuccessInfo(null);
    try {
      const res: any = await addMessageMutation.mutateAsync({
        ticketId: activeTicketId,
        payload: {
          body: replyBody.trim(),
          senderType: 'AGENT',
          isInternalNote: false,
          sendEmail: true,
        },
      });

      setReplyBody('');
      setIsPolished(false);

      if (res?.emailDispatched) {
        const msgIdNotice = res?.emailMessageId ? ` (Message ID: ${res.emailMessageId})` : '';
        setSuccessInfo(`✓ Reply recorded and email dispatched to student${msgIdNotice}`);
      } else if (res?.emailError) {
        setFormError(`⚠️ Reply saved to ticket, but Mailgun email dispatch failed: ${res.emailError}`);
      } else {
        setSuccessInfo(`✓ Reply saved to ticket.`);
      }
      setTimeout(() => setSuccessInfo(null), 6000);

      onSuccess?.();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to post message reply';
      setFormError(errorMsg);
      onError?.(err);
    }
  };

  const isBusy = addMessageMutation.isPending || polishReplyMutation.isPending;

  const formContent = (
    <div className={`space-y-3 ${className}`}>
      {/* Success Notification Banner */}
      {successInfo && (
        <div className="flex items-center gap-1.5 p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] rounded-lg animate-in fade-in duration-200 font-medium shadow-xs dark:shadow-[0_0_10px_rgba(16,185,129,0.15)]">
          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successInfo}</span>
        </div>
      )}

      {/* Error Banner */}
      <ErrorMessage message={formError} />

      {/* Header bar */}
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-2">
          <h2 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Reply className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Submit a Reply</span>
          </h2>

          <div className="flex items-center space-x-1.5 ml-auto">
            {isPolished && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 dark:bg-purple-950/60 dark:border-purple-800/60 dark:text-purple-300 px-2 py-0.5 rounded-full transition-all">
                <Check className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
                <span>Polished with AI</span>
              </span>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSendReply} noValidate className="space-y-2.5">
        <div className="relative">
          <textarea
            id="reply-textarea"
            value={replyBody}
            onChange={(e) => {
              setReplyBody(e.target.value);
              if (formError) setFormError(null);
              if (isPolished) setIsPolished(false);
            }}
            placeholder="Write a reply to the student..."
            rows={3}
            className="w-full text-[11px] rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 bg-slate-50 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none font-sans"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center space-x-1.5">
            {!showHeader && isPolished && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 dark:bg-purple-950/60 dark:border-purple-800/60 dark:text-purple-300 px-2 py-0.5 rounded-full transition-all">
                <Check className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
                <span>Polished with AI</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 sm:ml-auto">
            {replyBody && (
              <button
                type="button"
                onClick={() => {
                  setReplyBody('');
                  setFormError(null);
                  setIsPolished(false);
                }}
                disabled={isBusy}
                className="text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            )}
            <button
              type="button"
              onClick={handlePolishReply}
              disabled={isBusy || !replyBody.trim()}
              title="Polish draft reply with AI"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 dark:text-purple-300 dark:border-purple-800/60 rounded-lg text-[11px] font-bold transition-all shadow-xs dark:shadow-[0_0_10px_rgba(168,85,247,0.15)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {polishReplyMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin text-purple-600 dark:text-purple-400" />
              ) : (
                <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
              )}
              <span>{polishReplyMutation.isPending ? 'Polishing...' : 'Polish'}</span>
            </button>
            <button
              type="submit"
              disabled={isBusy || !replyBody.trim()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs dark:shadow-[0_0_12px_rgba(99,102,241,0.25)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {addMessageMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin text-white" />
              ) : (
                <Send className="h-3 w-3 text-white" />
              )}
              <span>Send Reply</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  if (showCardWrapper) {
    return (
      <div className="bg-white border border-slate-200/80 dark:bg-slate-900/80 dark:border-slate-800/80 rounded-xl p-3.5 shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        {formContent}
      </div>
    );
  }

  return formContent;
};

export default TicketReplyForm;
