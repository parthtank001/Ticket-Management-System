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
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 text-center shadow-xs">
          <div className="mx-auto h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-2.5">
            <Inbox className="h-5 w-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Ticket Not Found
          </h2>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto mb-4">
            The requested ticket {activeTicketId ? `#${activeTicketId} ` : ''}could not be found, or you may not have permission to view it.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/tickets')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
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
          className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer group"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Tickets</span>
        </button>

        <div className="flex items-center space-x-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200/60">
            <Hash className="h-3 w-3 mr-0.5" />
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
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3">
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight mb-1.5">
                {ticket.subject}
              </h1>
              <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800">
                    {ticket.studentName}
                  </span>
                  <span className="text-slate-400">&bull;</span>
                  <span className="text-slate-500 truncate max-w-[160px]">{ticket.studentEmail}</span>
                </div>
                <div className="flex items-center space-x-1.5 sm:ml-auto text-[10px] text-slate-500">
                  <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                  <span>Created {formattedCreatedDate}</span>
                </div>
              </div>
            </div>

            {/* AI Summary Banner if present */}
            {ticket.summary && (
              <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg text-[11px] space-y-0.5">
                <span className="font-bold text-indigo-900 uppercase tracking-wider text-[9px]">
                  Issue Summary
                </span>
                <p className="text-indigo-950 leading-relaxed text-[11px]">{ticket.summary}</p>
              </div>
            )}
          </div>

          {/* Conversation & Reply Thread */}
          <ReplyThred messages={ticket.messages} />

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
