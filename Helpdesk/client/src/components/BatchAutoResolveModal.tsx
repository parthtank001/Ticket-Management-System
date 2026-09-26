import React, { useState } from 'react';
import {
  X,
  Bot,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  HelpCircle,
  Loader2,
  Play,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import { useBatchAutoResolve } from '../lib/hooks/useAutoResolve';
import type { Category, BatchAutoResolveResult } from '../lib/types';
import { ErrorMessage } from './ErrorMessage';
import { CATEGORY_LABELS } from '../lib/types';

export interface BatchAutoResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: BatchAutoResolveResult) => void;
}

export const BatchAutoResolveModal: React.FC<BatchAutoResolveModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [statusFilter, setStatusFilter] = useState<'NEW' | 'OPEN' | 'ALL'>('NEW');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [limit, setLimit] = useState<number>(25);
  const [dryRun, setDryRun] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<BatchAutoResolveResult | null>(null);

  const batchMutation = useBatchAutoResolve();

  if (!isOpen) return null;

  const handleRunBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await batchMutation.mutateAsync({
        statusFilter,
        category: categoryFilter !== 'ALL' ? (categoryFilter as Category) : undefined,
        limit,
        dryRun,
      });
      setBatchResult(res);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      // Error handled by batchMutation.error
    }
  };

  const handleReset = () => {
    setBatchResult(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-autoresolve-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 id="batch-autoresolve-title" className="text-sm sm:text-base font-bold text-slate-900">
                Batch Auto-Resolve Tickets
              </h2>
              <p className="text-[11px] text-slate-500">
                Evaluate and resolve matching support tickets using official Knowledge Base policies
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {batchMutation.isError && (
            <ErrorMessage
              message={(batchMutation.error as Error)?.message || 'Batch auto-resolution failed'}
            />
          )}

          {!batchResult ? (
            <form onSubmit={handleRunBatch} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-900 text-xs space-y-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Knowledge Base Policy Matching
                </span>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  Inquiries matching standard FAQ policies (Password Reset, Lifetime Access, Standard Refunds, Course Transfers, Certificates, Video Streaming) will receive automated replies and transition to <strong>RESOLVED</strong>. Tickets triggering legal or security guardrails will be kept for human review.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Status Filter */}
                <div className="space-y-1">
                  <label htmlFor="batch-status" className="block text-[11px] font-bold text-slate-700">
                    Queue Status Filter
                  </label>
                  <select
                    id="batch-status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="NEW">New Tickets Only</option>
                    <option value="OPEN">Open Tickets</option>
                    <option value="ALL">All Unresolved (New + Open)</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div className="space-y-1">
                  <label htmlFor="batch-category" className="block text-[11px] font-bold text-slate-700">
                    Category Filter
                  </label>
                  <select
                    id="batch-category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="GENERAL_QUESTION">{CATEGORY_LABELS.GENERAL_QUESTION}</option>
                    <option value="TECHNICAL_QUESTION">{CATEGORY_LABELS.TECHNICAL_QUESTION}</option>
                    <option value="REFUND_REQUEST">{CATEGORY_LABELS.REFUND_REQUEST}</option>
                  </select>
                </div>

                {/* Batch Limit */}
                <div className="space-y-1">
                  <label htmlFor="batch-limit" className="block text-[11px] font-bold text-slate-700">
                    Max Tickets to Process
                  </label>
                  <select
                    id="batch-limit"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value={10}>10 Tickets</option>
                    <option value={25}>25 Tickets</option>
                    <option value={50}>50 Tickets</option>
                    <option value={100}>100 Tickets</option>
                  </select>
                </div>

                {/* Dry Run Toggle */}
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={dryRun}
                      onChange={(e) => setDryRun(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">
                      Dry Run (Preview without modifying tickets)
                    </span>
                  </label>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {batchMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing Batch...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Run Batch Auto-Resolve</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Results Display */
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2.5 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                    Processed
                  </span>
                  <span className="text-base font-extrabold text-slate-800">
                    {batchResult.totalProcessed}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 block">
                    Resolved
                  </span>
                  <span className="text-base font-extrabold text-emerald-700">
                    {batchResult.autoResolvedCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-600 block">
                    Escalated
                  </span>
                  <span className="text-base font-extrabold text-rose-700">
                    {batchResult.escalatedCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 block">
                    Human Review
                  </span>
                  <span className="text-base font-extrabold text-amber-700">
                    {batchResult.skippedCount}
                  </span>
                </div>
              </div>

              {batchResult.dryRun && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <span className="font-semibold">Dry Run Complete:</span> No database records were modified.
                </div>
              )}

              {/* Results List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                    <tr>
                      <th className="p-2">Ticket</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Policy / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {batchResult.results.map((r) => (
                      <tr key={r.ticketId} className="hover:bg-slate-50/60">
                        <td className="p-2 font-bold text-indigo-600">#{r.ticketId}</td>
                        <td className="p-2">
                          {r.autoResolved ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> Resolved
                            </span>
                          ) : r.reason.toLowerCase().includes('escalat') ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                              <ShieldAlert className="w-3 h-3" /> Escalated
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 font-medium text-[11px]">
                              <HelpCircle className="w-3 h-3" /> Staff Review
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-slate-600 truncate max-w-xs">{r.reason}</td>
                      </tr>
                    ))}
                    {batchResult.results.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-slate-400">
                          No matching tickets found to evaluate.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Reset / Close Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Run Another Batch</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
