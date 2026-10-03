import React, { useState } from 'react';
import type {
  Ticket,
  TicketAgent,
  TicketStatus,
  Category,
  Priority,
} from '../lib/types';
import {
  useUpdateTicket,
  useAgents,
} from '../lib/hooks/useTickets';
import { ErrorMessage } from './ErrorMessage';
import { SlidersHorizontal } from 'lucide-react';

export interface UpdateTicketProps {
  ticket: Ticket;
  agents?: TicketAgent[];
  onError?: (error: string | null) => void;
  showErrorBanner?: boolean;
  variant?: 'white' | 'slate';
  idPrefix?: string;
  className?: string;
}

export const UpdateTicket: React.FC<UpdateTicketProps> = ({
  ticket,
  agents: propAgents,
  onError,
  showErrorBanner = false,
  variant = 'white',
  idPrefix = 'ticket',
  className = '',
}) => {
  const [localError, setLocalError] = useState<string | null>(null);

  const updateTicketMutation = useUpdateTicket();
  const { data: queryAgents = [] } = useAgents();
  const agents = propAgents ?? queryAgents;

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setLocalError(null);
    onError?.(null);
    try {
      await updateTicketMutation.mutateAsync({
        id: ticket.id,
        payload: { status: newStatus },
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update ticket status';
      setLocalError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const handleCategoryChange = async (categoryValue: string) => {
    setLocalError(null);
    onError?.(null);
    try {
      await updateTicketMutation.mutateAsync({
        id: ticket.id,
        payload: { category: categoryValue === '' ? null : (categoryValue as Category) },
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update ticket category';
      setLocalError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const handleAgentChange = async (agentId: string) => {
    setLocalError(null);
    onError?.(null);
    try {
      await updateTicketMutation.mutateAsync({
        id: ticket.id,
        payload: { assignedAgentId: agentId === '' ? null : agentId },
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update assigned agent';
      setLocalError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const handlePriorityChange = async (priorityValue: Priority) => {
    setLocalError(null);
    onError?.(null);
    try {
      await updateTicketMutation.mutateAsync({
        id: ticket.id,
        payload: { priority: priorityValue },
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update ticket priority';
      setLocalError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const isSlate = variant === 'slate';

  const cardBgClass = 'bg-white dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]';

  const selectBgClass = 'w-full bg-slate-50 hover:bg-white focus:bg-white dark:bg-slate-950/80 dark:hover:bg-slate-950 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium cursor-pointer transition-colors';

  const inactiveBtnClass = 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/60 dark:hover:bg-slate-750 dark:hover:text-white';

  const dividerClass = 'border-b border-slate-100 dark:border-slate-800/80';

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Optional internal error banner (shown when explicitly requested or when no external onError handler is provided) */}
      {(showErrorBanner || !onError) && <ErrorMessage message={localError} />}

      {/* Status Quick Action Card */}
      <div className={`${cardBgClass} space-y-2`}>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          Update Status:
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleStatusChange('OPEN')}
            disabled={ticket.status === 'OPEN' || updateTicketMutation.isPending}
            className={`w-full py-1 rounded-md text-[11px] font-bold transition-all text-center cursor-pointer ${
              ticket.status === 'OPEN'
                ? 'bg-indigo-600 text-white shadow-xs dark:shadow-[0_0_10px_rgba(99,102,241,0.3)] cursor-default'
                : inactiveBtnClass
            }`}
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange('RESOLVED')}
            disabled={ticket.status === 'RESOLVED' || updateTicketMutation.isPending}
            className={`w-full py-1 rounded-md text-[11px] font-bold transition-all text-center cursor-pointer ${
              ticket.status === 'RESOLVED'
                ? 'bg-emerald-600 text-white shadow-xs dark:shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-default'
                : inactiveBtnClass
            }`}
          >
            Resolved
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange('CLOSED')}
            disabled={ticket.status === 'CLOSED' || updateTicketMutation.isPending}
            className={`w-full py-1 rounded-md text-[11px] font-bold transition-all text-center cursor-pointer ${
              ticket.status === 'CLOSED'
                ? 'bg-slate-700 text-white shadow-xs cursor-default'
                : inactiveBtnClass
            }`}
          >
            Closed
          </button>
        </div>
      </div>

      {/* Ticket Properties Card (All Drop-down Lists) */}
      <div className={`${cardBgClass} space-y-3`}>
        <div className={`flex items-center space-x-1.5 pb-1.5 ${dividerClass}`}>
          <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Ticket Properties
          </h2>
        </div>

        {/* Category Drop-Down List */}
        <div className="space-y-1">
          <label
            htmlFor={`${idPrefix}-category-select`}
            className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300"
          >
            Category
          </label>
          <select
            id={`${idPrefix}-category-select`}
            value={ticket.category || ''}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={updateTicketMutation.isPending}
            aria-label="Category selector"
            className={selectBgClass}
          >
            <option value="" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200">Uncategorized</option>
            <option value="GENERAL_QUESTION" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200">General Question</option>
            <option value="TECHNICAL_QUESTION" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200">Technical Question</option>
            <option value="REFUND_REQUEST" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200">Refund Request</option>
          </select>
        </div>

        {/* Assignee Drop-Down List */}
        <div className="space-y-1">
          <label
            htmlFor={`${idPrefix}-assignee-select`}
            className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300"
          >
            Assignee
          </label>
          <select
            id={`${idPrefix}-assignee-select`}
            value={ticket.assignedAgentId || ''}
            onChange={(e) => handleAgentChange(e.target.value)}
            disabled={updateTicketMutation.isPending}
            aria-label="Assignee selector"
            className={selectBgClass}
          >
            <option value="" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200">Unassigned</option>
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200">
                {ag.name} ({ag.role})
              </option>
            ))}
          </select>
        </div>

        {/* Priority Drop-Down List */}
        <div className="space-y-1">
          <label
            htmlFor={`${idPrefix}-priority-select`}
            className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300"
          >
            Priority
          </label>
          <select
            id={`${idPrefix}-priority-select`}
            value={ticket.priority || 'MEDIUM'}
            onChange={(e) => handlePriorityChange(e.target.value as Priority)}
            disabled={updateTicketMutation.isPending}
            aria-label="Priority selector"
            className={selectBgClass}
          >
            <option value="LOW" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200">Low</option>
            <option value="MEDIUM" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200">Medium</option>
            <option value="HIGH" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200">High</option>
            <option value="URGENT" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200">Urgent</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default UpdateTicket;
