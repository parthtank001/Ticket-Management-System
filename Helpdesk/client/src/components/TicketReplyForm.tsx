import React, { useState } from 'react';
import { useAddTicketMessage } from '../lib/hooks/useTickets';
import {
  Send,
  Loader2,
  Reply,
} from 'lucide-react';
import { ErrorMessage } from './ErrorMessage';

export interface TicketReplyFormProps {
  ticketId: number;
  showHeader?: boolean;
  showCardWrapper?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  className?: string;
}

export const TicketReplyForm: React.FC<TicketReplyFormProps> = ({
  ticketId,
  showHeader = true,
  showCardWrapper = false,
  onSuccess,
  onError,
  onClose,
  className = '',
}) => {
  const [replyBody, setReplyBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const addMessageMutation = useAddTicketMessage();

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) {
      setFormError('Please enter a reply message.');
      return;
    }

    setFormError(null);
    try {
      await addMessageMutation.mutateAsync({
        ticketId,
        payload: {
          body: replyBody.trim(),
          senderType: 'AGENT',
          isInternalNote: false,
        },
      });
      setReplyBody('');
      onSuccess?.();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to post message reply';
      setFormError(errorMsg);
      onError?.(err);
    }
  };

  const formContent = (
    <div className={`space-y-3 ${className}`}>
      {/* Error Banner */}
      <ErrorMessage message={formError} />

      {/* Header bar */}
      {showHeader && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <Reply className="h-3.5 w-3.5 text-indigo-600" />
            <span>Submit a Reply</span>
          </h2>
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
            }}
            placeholder="Write a reply to the student..."
            rows={3}
            className="w-full text-[11px] rounded-lg border border-slate-200 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none font-sans"
          />
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <p className="text-[10px] text-slate-400">
            Replies will be sent to the student and recorded in the ticket thread.
          </p>
          <div className="flex items-center space-x-2">
            {replyBody && (
              <button
                type="button"
                onClick={() => {
                  setReplyBody('');
                  setFormError(null);
                }}
                disabled={addMessageMutation.isPending}
                className="text-[10px] text-slate-500 hover:text-slate-700 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Close
              </button>
            )}
            <button
              type="submit"
              disabled={addMessageMutation.isPending}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {addMessageMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
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
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
        {formContent}
      </div>
    );
  }

  return formContent;
};

export default TicketReplyForm;
