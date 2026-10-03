import React, { useState } from 'react';
import { AuthUser } from '../lib/auth-client';
import type { Ticket } from '../lib/types';
import { useTicket, useAgents } from '../lib/hooks/useTickets';
import {
  TicketStatusBadge,
  TicketPriorityBadge,
} from './TicketBadges';
import { formatDateMedium } from '../lib/utils';
import { TicketReplyForm } from './TicketReplyForm';
import { ReplyThred } from './ReplyThred';
import { ErrorMessage } from './ErrorMessage';
import { UpdateTicket } from './UpdateTicket';
import { TicketSummaryCard } from './TicketSummaryCard';
import { TicketDetailSkeleton } from './ui/skeleton';
import {
  ArrowLeft,
  User,
  Calendar,
  Hash,
  Inbox,
} from 'lucide-react';

export interface TicketDetailPageProps {
  ticketId?: number;
  ticket?: Ticket;
  user?: AuthUser;
  onNavigate: (path: string) => void;
}

export const TicketDetailPage: React.FC<TicketDetailPageProps> = ({
  ticketId: propTicketId,
  ticket: propTicket,
  user,
  onNavigate,
}) => {
  const [actionError, setActionError] = useState<string | null>(null);
  const activeTicketId = propTicket?.id ?? propTicketId;

  const { data: queryTicket, isLoading, error } = useTicket(activeTicketId);
  const ticket = queryTicket ?? propTicket;
  const { data: agents = [] } = useAgents();

  // Loading skeleton state (only when we have no ticket data yet)
  if (isLoading && !ticket) {
    return <TicketDetailSkeleton />;
  }

  // Not found state (when ticket is truly not available)
  if (!ticket) {
    return (
      <div className="max-w-md mx-auto py-10 px-4 font-sans">
        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-6 text-center shadow-xs">
          <div className="mx-auto h-10 w-10 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-2.5">
            <Inbox className="h-5 w-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Ticket Not Found
          </h2>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 max-w-xs mx-auto mb-4">
            The requested ticket {activeTicketId ? `#${activeTicketId} ` : ''}could not be found, or you may not have permission to view it.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/tickets')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Tickets</span>
          </button>
        </div>
      </div>
    );
  }

  const formattedCreatedDate = formatDateMedium(ticket.createdAt);

  return (
    <div className="max-w-3xl mx-auto py-4 px-3 sm:px-4 font-sans space-y-3 text-xs">
      {/* Top Navigation & Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('/tickets')}
          className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold transition-colors shadow-xs cursor-pointer group"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
          <span>Back to Tickets</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs dark:shadow-[0_0_8px_rgba(99,102,241,0.2)] font-mono">
            <Hash className="h-3 w-3 mr-0.5 text-indigo-600 dark:text-indigo-400" />
            Ticket #{ticket.id}
          </span>
          <TicketStatusBadge status={ticket.status} size="sm" />
          <TicketPriorityBadge priority={ticket.priority} size="sm" />
        </div>
      </div>

      {/* Background Network Error Warning Banner */}
      <ErrorMessage
        variant="amber"
        message={error ? `Notice: Could not sync newest live updates (${error.message || 'Server error'}). Showing cached ticket details.` : null}
      />

      {/* Action Error Banner */}
      <ErrorMessage message={actionError} />

      {/* 2-Column Split Layout (Narrowed Container) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-start">
        {/* LEFT COLUMN: Main Content & Thread */}
        <div className="md:col-span-2 space-y-3.5">
          {/* Main Ticket Subject & Sender Information Card */}
          <div className="bg-white dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-3">
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight mb-1.5">
                {ticket.subject}
              </h1>
              <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center space-x-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {ticket.studentName}
                  </span>
                  <span className="text-slate-400 dark:text-slate-600">&bull;</span>
                  <span className="text-slate-500 dark:text-slate-400 truncate max-w-[160px]">{ticket.studentEmail}</span>
                </div>
                <div className="flex items-center space-x-1.5 sm:ml-auto text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <Calendar className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>Created {formattedCreatedDate}</span>
                </div>
              </div>
            </div>

            {/* Ticket Initial Inquiry Body */}
            {ticket.body && (
              <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-50/70 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800/70 font-normal">
                {ticket.body.split(/\n\n---\s*\[/)[0]}
              </div>
            )}
          </div>

          {/* AI Issue & Conversation Summary Card */}
          <TicketSummaryCard ticket={ticket} onError={setActionError} />

          {/* Conversation & Reply Thread */}
          <ReplyThred
            messages={ticket.messages}
            ticketBody={ticket.body}
            studentEmail={ticket.studentEmail}
            createdAt={ticket.createdAt}
            ticketId={ticket.id}
          />

          {/* Form to submit new replies */}
          <TicketReplyForm
            ticket={ticket}
            showCardWrapper={true}
            showHeader={true}
          />
        </div>

        {/* RIGHT COLUMN: Status & All Drop-down Lists */}
        <div className="md:col-span-1">
          <UpdateTicket ticket={ticket} agents={agents} onError={setActionError} />
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;
