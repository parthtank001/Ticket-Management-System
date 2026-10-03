import React, { useState } from 'react';
import type {
  Ticket,
} from '../lib/types';
import { useAgents } from '../lib/hooks/useTickets';
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
import {
  X,
  User,
  Calendar,
  Hash,
} from 'lucide-react';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  isOpen,
  onClose,
}) => {
  const [actionError, setActionError] = useState<string | null>(null);
  const { data: agents = [] } = useAgents();

  if (!isOpen || !ticket) return null;

  const formattedDate = formatDateMedium(ticket.createdAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150 font-sans">
      <div
        className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-xs text-slate-800 dark:text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] border border-indigo-200/80 dark:border-indigo-800/60 font-mono">
              <Hash className="h-3 w-3 mr-0.5 text-indigo-600 dark:text-indigo-400" />
              Ticket #{ticket.id}
            </span>
            <TicketStatusBadge status={ticket.status} size="sm" />
            <TicketPriorityBadge priority={ticket.priority} size="sm" />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: 2-Column Split Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Error Banner */}
          <ErrorMessage message={actionError} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {/* LEFT COLUMN: Main Subject, Info & Conversation */}
            <div className="md:col-span-2 space-y-3.5">
              {/* Ticket Title & Metadata */}
              <div className="bg-slate-50/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 space-y-3">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {ticket.subject}
                </h2>
                <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-950/90 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/60">
                  <div className="flex items-center space-x-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
                      {ticket.studentName}
                    </span>
                    <span className="text-slate-400 dark:text-slate-600">&bull;</span>
                    <span className="text-slate-500 dark:text-slate-400 truncate max-w-[160px]">{ticket.studentEmail}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 sm:ml-auto text-[10px] text-slate-500 font-mono">
                    <Calendar className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Created {formattedDate}</span>
                  </div>
                </div>

                {/* Ticket Initial Inquiry Body */}
                {ticket.body && (
                  <div className="text-xs text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-white/80 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800/50 font-normal">
                    {ticket.body.split(/\n\n---\s*\[/)[0]}
                  </div>
                )}
              </div>

              {/* AI Issue & Conversation Summary Card */}
              <TicketSummaryCard ticket={ticket} onError={setActionError} />

              {/* Conversation Thread */}
              <ReplyThred
                messages={ticket.messages}
                ticketBody={ticket.body}
                studentEmail={ticket.studentEmail}
                createdAt={ticket.createdAt}
                ticketId={ticket.id}
                className="p-3.5"
              />
            </div>

            {/* RIGHT COLUMN: Status & All Drop-down Lists */}
            <div className="md:col-span-1">
              <UpdateTicket
                ticket={ticket}
                agents={agents}
                variant="slate"
                idPrefix="modal"
                onError={setActionError}
              />
            </div>
          </div>
        </div>

        {/* Reply Composer Footer */}
        <div className="p-3.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/60">
          <TicketReplyForm
            ticket={ticket}
            showHeader={false}
            showCardWrapper={false}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

