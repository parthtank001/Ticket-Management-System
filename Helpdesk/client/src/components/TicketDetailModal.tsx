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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200/80 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200/60">
              <Hash className="h-3 w-3 mr-0.5" />
              Ticket #{ticket.id}
            </span>
            <TicketStatusBadge status={ticket.status} size="sm" />
            <TicketPriorityBadge priority={ticket.priority} size="sm" />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: 2-Column Split Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Error Banner */}
          <ErrorMessage message={actionError} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-start">
            {/* LEFT COLUMN: Main Subject, Info & Conversation */}
            <div className="md:col-span-2 space-y-3.5">
              {/* Ticket Title & Metadata */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  {ticket.subject}
                </h2>
                <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
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
                    <span>Created {formattedDate}</span>
                  </div>
                </div>

                {/* Ticket Initial Inquiry Body */}
                {ticket.body && (
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-100/90 font-normal">
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
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/70">
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

