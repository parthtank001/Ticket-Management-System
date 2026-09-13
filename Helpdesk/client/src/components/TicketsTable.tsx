import React from 'react';
import {
  Ticket,
  TicketStatus,
  Category,
  Priority,
  Role,
} from '../lib/types';
import {
  TicketStatusBadge,
  TicketPriorityBadge,
  TicketCategoryBadge,
} from './TicketBadges';
import { Skeleton } from './ui/skeleton';
import {
  MessageSquare,
  User,
  Clock,
  ChevronRight,
  Inbox,
  AlertCircle,
} from 'lucide-react';

interface TicketsTableProps {
  tickets: Ticket[];
  isLoading: boolean;
  onSelectTicket: (ticket: Ticket) => void;
}

export const TicketsTable: React.FC<TicketsTableProps> = ({
  tickets,
  isLoading,
  onSelectTicket,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-3 w-1/3">
                <Skeleton className="h-6 w-12 rounded-md" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-48 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-md" />
              </div>
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <Inbox className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">No Tickets Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No tickets match your search filters, or no support inquiries have been submitted yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4">Ticket</th>
              <th className="py-3.5 px-4">Sender</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Priority</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Assignee</th>
              <th className="py-3.5 px-4 text-right">Created</th>
              <th className="py-3.5 px-3 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {tickets.map((ticket) => {
              const formattedDate = new Date(ticket.createdAt).toLocaleString(
                undefined,
                {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              );

              return (
                <tr
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  {/* Ticket # and Subject */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-start space-x-2.5">
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px] border border-indigo-100/80 shrink-0">
                        #{ticket.id}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {ticket.subject}
                        </span>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="flex items-center space-x-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{ticket.messages?.length || 0}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Sender Info */}
                  <td className="py-3.5 px-4">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {ticket.studentName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {ticket.studentEmail}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4">
                    <TicketCategoryBadge category={ticket.category} size="sm" />
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4">
                    <TicketPriorityBadge priority={ticket.priority} size="sm" />
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <TicketStatusBadge status={ticket.status} size="sm" />
                  </td>

                  {/* Assignee */}
                  <td className="py-3.5 px-4">
                    {ticket.assignedAgent ? (
                      <span className="inline-flex items-center space-x-1.5 text-xs text-slate-700 font-medium">
                        <span className="h-5 w-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                          {ticket.assignedAgent.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate max-w-[120px]">
                          {ticket.assignedAgent.name}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">
                        Unassigned
                      </span>
                    )}
                  </td>

                  {/* Created Date */}
                  <td className="py-3.5 px-4 text-right text-[11px] text-slate-400 whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Arrow action */}
                  <td className="py-3.5 px-3 text-center">
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors inline-block" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
