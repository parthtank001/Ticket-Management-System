import React, { useState } from 'react';
import {
  X,
  Brain,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
  CheckCheck,
  RotateCcw,
  Tag,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 id="batch-classify-title" className="text-sm sm:text-base font-bold text-slate-900">
                Batch Ticket Classification
              </h2>
              <p className="text-[11px] text-slate-500">
                Automatically categorize, prioritize, and generate drafts for pending tickets
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
              message={(batchMutation.error as Error)?.message || 'Batch classification failed'}
            />
          )}

          {!batchResult ? (
            <form id="batch-classify-form" onSubmit={handleRunBatch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target Queue Filter */}
                <div>
                  <label htmlFor="batch-status-filter" className="block font-semibold text-slate-700 mb-1">
                    Candidate Queue Filter
                  </label>
                  <select
                    id="batch-status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="UNCLASSIFIED">Unclassified Tickets Only</option>
                    <option value="NEW">New Status Tickets</option>
                    <option value="OPEN">Open Status Tickets</option>
                    <option value="ALL">All Status Tickets</option>
                  </select>
                </div>

                {/* Batch Limit */}
                <div>
                  <label htmlFor="batch-limit-selector" className="block font-semibold text-slate-700 mb-1">
                    Batch Limit (Tickets)
                  </label>
                  <select
                    id="batch-limit-selector"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="10">10 Tickets</option>
                    <option value="25">25 Tickets (Recommended)</option>
                    <option value="50">50 Tickets</option>
                    <option value="100">100 Tickets (Max)</option>
                  </select>
                </div>
              </div>

              {/* Force & Dry Run Options */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={force}
                    onChange={(e) => setForce(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">Force Re-classification</span>
                    <p className="text-[11px] text-slate-500">
                      Re-evaluates and updates tickets even if they already possess a category and summary.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer border-t border-slate-200 pt-2.5">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">Dry Run (Simulation Only)</span>
                    <p className="text-[11px] text-slate-500">
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
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 font-medium">Processed</span>
                  <div className="text-lg font-bold text-slate-800">{batchResult.totalProcessed}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[10px] text-emerald-600 font-medium">Classified</span>
                  <div className="text-lg font-bold text-emerald-700">{batchResult.classifiedCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
                  <span className="text-[10px] text-indigo-600 font-medium">Updated</span>
                  <div className="text-lg font-bold text-indigo-700">{batchResult.updatedCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <span className="text-[10px] text-amber-600 font-medium">Skipped / DryRun</span>
                  <div className="text-lg font-bold text-amber-700">
                    {batchResult.skippedCount + (batchResult.dryRun ? batchResult.classifiedCount : 0)}
                  </div>
                </div>
              </div>

              {batchResult.dryRun && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Dry Run Simulation: No tickets were altered in the database.</span>
                </div>
              )}

              {/* Individual Ticket Outcomes */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex items-center justify-between">
                  <span>Batch Execution Outcomes</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {batchResult.results.length} tickets
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {batchResult.results.map((res) => (
                    <div key={res.ticketId} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-slate-700 shrink-0">
                          #{res.ticketId}
                        </span>
                        <CategoryBadge category={res.category} />
                        <PriorityBadge priority={res.priority} />
                        <span className="text-[10px] text-slate-400 font-mono">
                          {Math.round(res.confidence * 100)}%
                        </span>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {res.updated ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Updated
                          </span>
                        ) : res.dryRun ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-medium">
                            <Sparkles className="w-3.5 h-3.5" /> Simulated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            Skipped
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {batchResult.results.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No matching tickets found for the selected filter.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          {!batchResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="batch-classify-form"
                disabled={batchMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
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
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Run Another Batch</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
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
