import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  Send,
  HelpCircle,
} from 'lucide-react';
import type { Ticket } from '../lib/types';
import { useAutoResolveTicket, useEvaluateAutoResolve } from '../lib/hooks/useAutoResolve';
import { ErrorMessage } from './ErrorMessage';
import { AutoResolveBadge } from './AutoResolveBadge';
import { cn } from '../lib/utils';

export interface AutoResolveCardProps {
  ticket: Ticket;
  className?: string;
  onResolved?: () => void;
}

export const AutoResolveCard: React.FC<AutoResolveCardProps> = ({
  ticket,
  className,
  onResolved,
}) => {
  const [copied, setCopied] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);

  const autoResolveMutation = useAutoResolveTicket();
  const evaluateMutation = useEvaluateAutoResolve();

  const isAlreadyResolved = ticket.status === 'RESOLVED';
  const hasAutoResolveMarker =
    (ticket.body && ticket.body.includes('[Auto-Resolution Reply from Code with Mosh Support')) ||
    (ticket.summary && ticket.summary.toLowerCase().includes('automated resolution provided'));

  const handleEvaluate = async () => {
    try {
      const res = await evaluateMutation.mutateAsync({
        subject: ticket.subject,
        body: ticket.body,
        studentName: ticket.studentName,
        studentEmail: ticket.studentEmail,
      });
      setEvaluationResult(res);
    } catch (err) {
      // Error handled by evaluateMutation.error
    }
  };

  const handleAutoResolve = async () => {
    try {
      await autoResolveMutation.mutateAsync({
        ticketId: ticket.id,
        options: {
          sendReply: true,
          dryRun: false,
        },
      });
      if (onResolved) {
        onResolved();
      }
    } catch (err) {
      // Error handled by autoResolveMutation.error
    }
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 sm:p-5 backdrop-blur-sm shadow-xs space-y-4',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
              Knowledge Base Auto-Resolution
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluates student inquiry against official Code with Mosh policies
            </p>
          </div>
        </div>

        {hasAutoResolveMarker && (
          <AutoResolveBadge isAutoResolved={true} />
        )}
      </div>

      {/* Auto-Resolve Banner if resolved */}
      {hasAutoResolveMarker && (
        <AutoResolveBadge
          isAutoResolved={true}
          variant="banner"
          sectionTitle="Official Support Policy"
        />
      )}

      {/* Error displays */}
      {(evaluateMutation.isError || autoResolveMutation.isError) && (
        <ErrorMessage
          message={
            (autoResolveMutation.error as Error)?.message ||
            (evaluateMutation.error as Error)?.message ||
            'Failed to execute auto-resolution action'
          }
        />
      )}

      {/* Evaluation Result Display */}
      {evaluationResult && (
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Evaluation Status:</span>
            {evaluationResult.isEscalated ? (
              <AutoResolveBadge isEscalated={true} />
            ) : evaluationResult.canAutoResolve ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Eligible for Auto-Resolution
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <HelpCircle className="w-3.5 h-3.5" /> Requires Human Agent Review
              </span>
            )}
          </div>

          <div className="text-xs text-slate-700 dark:text-slate-300">
            <span className="text-slate-500 block mb-0.5">Policy / Reason:</span>
            <p className="font-medium text-slate-900 dark:text-slate-200">{evaluationResult.autoResolveReason}</p>
          </div>

          {evaluationResult.resolutionAnswer && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Generated Resolution Reply:
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(evaluationResult.resolutionAnswer)}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Answer</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 whitespace-pre-line font-mono max-h-48 overflow-y-auto">
                {evaluationResult.resolutionAnswer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <button
          type="button"
          onClick={handleEvaluate}
          disabled={evaluateMutation.isPending || autoResolveMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {evaluateMutation.isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Evaluating Policy...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Check KB Match</span>
            </>
          )}
        </button>

        {!isAlreadyResolved && (
          <button
            type="button"
            onClick={handleAutoResolve}
            disabled={
              autoResolveMutation.isPending ||
              evaluateMutation.isPending ||
              (evaluationResult && !evaluationResult.canAutoResolve)
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {autoResolveMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Auto-Resolving...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Auto-Resolve & Reply</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
