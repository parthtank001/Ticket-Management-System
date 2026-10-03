import React, { useState } from 'react';
import {
  X,
  Brain,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useBatchClassify } from '../lib/hooks/useClassification';
import type { BatchClassifyResult } from '../lib/types';
import { ErrorMessage } from './ErrorMessage';
import { CategoryBadge, PriorityBadge } from './TicketBadges';

export interface BatchClassifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: BatchClassifyResult) => void;
}

export const BatchClassifyModal: React.FC<BatchClassifyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [statusFilter, setStatusFilter] = useState<'UNCLASSIFIED' | 'NEW' | 'OPEN' | 'ALL'>('UNCLASSIFIED');
  const [limit, setLimit] = useState<number>(25);
  const [force, setForce] = useState<boolean>(false);
  const [dryRun, setDryRun] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<BatchClassifyResult | null>(null);

  const batchMutation = useBatchClassify();

  if (!isOpen) return null;

  const handleRunBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await batchMutation.mutateAsync({
        statusFilter,
        force,
        limit,
        dryRun,
      });
      setBatchResult(res);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      // Handled via batchMutation.error
    }
  };

  const handleReset = () => {
    setBatchResult(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-classify-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xs font-sans animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0D1527]/95 backdrop-blur-xl border border-slate-200 dark:border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-200">
        {/* Top glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-70" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#080C14]/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 id="batch-classify-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Batch Ticket Classification
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Automatically categorize, prioritize, and generate drafts for pending tickets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {batchMutation.isError && (
            <ErrorMessage
              message={(batchMutation.error as Error)?.message || 'Batch classification failed'}
            />
          )}

          {!batchResult ? (
            <form id="batch-classify-form" onSubmit={handleRunBatch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target Queue Filter */}
                <div>
                  <label htmlFor="batch-status-filter" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                    Candidate Queue Filter
                  </label>
                  <select
                    id="batch-status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#080C14]/90 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 focus:outline-hidden"
                  >
                    <option value="UNCLASSIFIED">Unclassified Tickets Only</option>
                    <option value="NEW">New Status Tickets</option>
                    <option value="OPEN">Open Status Tickets</option>
                    <option value="ALL">All Status Tickets</option>
                  </select>
                </div>

                {/* Batch Limit */}
                <div>
                  <label htmlFor="batch-limit-selector" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                    Batch Limit (Tickets)
                  </label>
                  <select
                    id="batch-limit-selector"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-[#080C14]/90 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 focus:outline-hidden"
                  >
                    <option value="10">10 Tickets</option>
                    <option value="25">25 Tickets (Recommended)</option>
                    <option value="50">50 Tickets</option>
                    <option value="100">100 Tickets (Max)</option>
                  </select>
                </div>
              </div>

              {/* Force & Dry Run Options */}
              <div className="p-3.5 bg-slate-50/80 dark:bg-[#080C14]/60 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={force}
                    onChange={(e) => setForce(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#080C14] accent-purple-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Force Re-classification</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Re-evaluates and updates tickets even if they already possess a category and summary.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer border-t border-slate-200 dark:border-slate-800/80 pt-2.5">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#080C14] accent-purple-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Dry Run (Simulation Only)</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Evaluate tickets and preview category & priority assignments without saving changes to the database.
                    </p>
                  </div>
                </label>
              </div>
            </form>
          ) : (
            /* Results View */
            <div className="space-y-4">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080C14]/80 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Processed</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{batchResult.totalProcessed}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-center">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Classified</span>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{batchResult.classifiedCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 text-center">
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">Updated</span>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{batchResult.updatedCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-center">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Skipped / DryRun</span>
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                    {batchResult.skippedCount + (batchResult.dryRun ? batchResult.classifiedCount : 0)}
                  </div>
                </div>
              </div>

              {batchResult.dryRun && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Dry Run Simulation: No tickets were altered in the database.</span>
                </div>
              )}

              {/* Individual Ticket Outcomes */}
              <div className="border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#080C14]/40">
                <div className="px-3.5 py-2 bg-slate-100/80 dark:bg-[#080C14]/80 border-b border-slate-200 dark:border-slate-800/80 font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Batch Execution Outcomes</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    {batchResult.results.length} tickets
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/60">
                  {batchResult.results.map((res) => (
                    <div key={res.ticketId} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-cyan-400 shrink-0">
                          #{res.ticketId}
                        </span>
                        <CategoryBadge category={res.category} />
                        <PriorityBadge priority={res.priority} />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {Math.round(res.confidence * 100)}%
                        </span>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {res.updated ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Updated
                          </span>
                        ) : res.dryRun ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                            <Sparkles className="w-3.5 h-3.5" /> Simulated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                            Skipped
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {batchResult.results.length === 0 && (
                    <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-xs">
                      No matching tickets found for the selected filter.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#080C14]/60">
          {!batchResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="batch-classify-form"
                disabled={batchMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {batchMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Batch...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Batch Classification</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Run Another Batch</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-700 transition-colors cursor-pointer"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
