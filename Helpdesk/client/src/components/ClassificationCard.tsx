import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Tag,
  FileText,
  MessageSquareQuote,
} from 'lucide-react';
import type { Ticket, TicketClassificationResult } from '../lib/types';
import { useClassifyTicket, useEvaluateClassification } from '../lib/hooks/useClassification';
import { ErrorMessage } from './ErrorMessage';
import { ClassificationBadge } from './ClassificationBadge';
import { CategoryBadge, PriorityBadge } from './TicketBadges';
import { cn } from '../lib/utils';

export interface ClassificationCardProps {
  ticket: Ticket;
  className?: string;
  onClassified?: () => void;
}

export const ClassificationCard: React.FC<ClassificationCardProps> = ({
  ticket,
  className,
  onClassified,
}) => {
  const [copied, setCopied] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<TicketClassificationResult | null>(null);

  const classifyMutation = useClassifyTicket();
  const evaluateMutation = useEvaluateClassification();

  const isClassified = Boolean(ticket.category && ticket.summary);

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
      // Handled via evaluateMutation.error
    }
  };

  const handleClassify = async (force: boolean = false) => {
    try {
      await classifyMutation.mutateAsync({
        ticketId: ticket.id,
        options: { force },
      });
      setEvaluationResult(null);
      if (onClassified) {
        onClassified();
      }
    } catch (err) {
      // Handled via classifyMutation.error
    }
  };

  const handleCopyDraft = (textToCopy?: string) => {
    const text = textToCopy || ticket.aiDraftResponse || evaluationResult?.aiDraftResponse;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm transition-all',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">AI Ticket Classification</h4>
            <p className="text-[11px] text-slate-400">
              Automated category, priority, and draft generation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            gpt-5-nano
          </span>
          {isClassified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Classified
            </span>
          )}
        </div>
      </div>

      {/* Error Banners */}
      {classifyMutation.isError && (
        <ErrorMessage
          message={
            classifyMutation.error instanceof Error
              ? classifyMutation.error.message
              : 'Failed to classify ticket'
          }
          className="mb-4"
        />
      )}
      {evaluateMutation.isError && (
        <ErrorMessage
          message={
            evaluateMutation.error instanceof Error
              ? evaluateMutation.error.message
              : 'Failed to evaluate classification'
          }
          className="mb-4"
        />
      )}

      {/* Classified State Display */}
      {isClassified && (
        <div className="space-y-4">
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-slate-950/40 border border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Category:</span>
              <CategoryBadge category={ticket.category!} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Priority:</span>
              <PriorityBadge priority={ticket.priority} />
            </div>
          </div>

          {/* AI Draft Response Section */}
          {ticket.aiDraftResponse && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-indigo-400" />
                  AI Draft Reply
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyDraft(ticket.aiDraftResponse)}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Draft</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
                {ticket.aiDraftResponse}
              </div>
            </div>
          )}

          {/* Re-Classify Action */}
          <div className="pt-1 flex items-center justify-end">
            <button
              type="button"
              onClick={() => handleClassify(true)}
              disabled={classifyMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              {classifyMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Re-Classifying...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Re-Classify Ticket</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Unclassified State / Evaluation View */}
      {!isClassified && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Ticket is unclassified</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Run AI classification to automatically categorize, assign priority, and generate a draft response.
              </p>
            </div>
          </div>

          {/* Evaluation Result Preview */}
          {evaluationResult && (
            <div className="space-y-3 p-3.5 rounded-lg bg-slate-950/60 border border-indigo-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Predicted Classification ({Math.round(evaluationResult.confidence * 100)}% Confidence)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={evaluationResult.category} />
                <PriorityBadge priority={evaluationResult.priority} />
                {evaluationResult.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700"
                  >
                    <Tag className="w-2.5 h-2.5 text-slate-500" />
                    {tag}
                  </span>
                ))}
              </div>

              {evaluationResult.reasoning && (
                <p className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800">
                  {evaluationResult.reasoning}
                </p>
              )}

              {evaluationResult.aiDraftResponse && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Draft Preview:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyDraft(evaluationResult.aiDraftResponse)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800 line-clamp-3">
                    {evaluationResult.aiDraftResponse}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={evaluateMutation.isPending || classifyMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              {evaluateMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Live Preview</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleClassify(false)}
              disabled={classifyMutation.isPending || evaluateMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-900/30 transition-colors disabled:opacity-50"
            >
              {classifyMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Classifying Ticket...</span>
                </>
              ) : (
                <>
                  <Brain className="w-3.5 h-3.5" />
                  <span>Classify Ticket</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
