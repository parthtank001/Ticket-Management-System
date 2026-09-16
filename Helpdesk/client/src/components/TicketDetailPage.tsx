import React, { useState } from 'react';
import { AuthUser } from '../lib/auth-client';
import type {
  TicketStatus,
  Category,
  TicketMessage,
} from '../lib/types';
import {
  useTicket,
  useUpdateTicket,
  useAddTicketMessage,
  useAgents,
} from '../lib/hooks/useTickets';
import {
  TicketStatusBadge,
  TicketPriorityBadge,
} from './TicketBadges';
import { Skeleton } from './ui/skeleton';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Send,
  Loader2,
  Lock,
  MessageSquare,
  AlertCircle,
  Hash,
  Clock,
  Inbox,
} from 'lucide-react';

interface TicketDetailPageProps {
  ticketId: number;
  user?: AuthUser;
  onNavigate: (path: string) => void;
}

export const TicketDetailPage: React.FC<TicketDetailPageProps> = ({
  ticketId,
  user,
  onNavigate,
}) => {
  const [replyBody, setReplyBody] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: ticket, isLoading, error } = useTicket(ticketId);
  const updateTicketMutation = useUpdateTicket();
  const addMessageMutation = useAddTicketMessage();
  const { data: agents = [] } = useAgents();

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    setActionError(null);
    try {
      await updateTicketMutation.mutateAsync({
        id: ticket.id,
        payload: { status: newStatus },
      });
    } catch (err: any) {
      setActionError(err.message || 'Failed to update ticket status');
    }
  };

  const handleAgentChange = async (agentId: string) => {
    if (!ticket) return;
    setActionError(null);
    try {
      await updateTicketMutation.mutateAsync({
        id: ticket.id,
        payload: { assignedAgentId: agentId === '' ? null : agentId },
      });
    } catch (err: any) {
      setActionError(err.message || 'Failed to update assigned agent');
    }
  };

  const handleCategoryChange = async (categoryValue: string) => {
    if (!ticket) return;
    setActionError(null);
    try {
      await updateTicketMutation.mutateAsync({
        id: ticket.id,
        payload: { category: categoryValue === '' ? null : (categoryValue as Category) },
      });
    } catch (err: any) {
      setActionError(err.message || 'Failed to update ticket category');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !replyBody.trim()) return;

    setActionError(null);
    try {
      await addMessageMutation.mutateAsync({
        ticketId: ticket.id,
        payload: {
          body: replyBody.trim(),
          isInternalNote,
        },
      });
      setReplyBody('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to post message reply');
    }
  };

  // Loading skeleton state (only when we have no ticket data yet)
  if (isLoading && !ticket) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 font-sans space-y-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36 rounded-md" />
            <div className="flex space-x-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-7 w-3/4 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  // Not found state (when ticket is truly not available)
  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 font-sans">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-xs">
          <div className="mx-auto h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-3">
            <Inbox className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Ticket Not Found
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            The requested ticket #{ticketId} could not be found, or you may not have permission to view it.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/tickets')}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Tickets</span>
          </button>
        </div>
      </div>
    );
  }

  const formattedCreatedDate = new Date(ticket.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 font-sans space-y-4">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('/tickets')}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Tickets</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200/60">
            <Hash className="h-3.5 w-3.5 mr-0.5" />
            Ticket #{ticket.id}
          </span>
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>
      </div>

      {/* Main Ticket Details Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
        {/* Background Network Error Warning Banner */}
        {error && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Notice: Could not sync newest live updates ({error.message || 'Server error'}). Showing cached ticket details.</span>
          </div>
        )}

        {/* Action Error Banner */}
        {actionError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Ticket Subject Heading */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {ticket.subject}
          </h1>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800">
              {ticket.studentName}
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-500 truncate">{ticket.studentEmail}</span>
          </div>
          <div className="flex items-center space-x-2 sm:justify-end">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
            <span>Created {formattedCreatedDate}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Category:</span>
            <select
              value={ticket.category || ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
              disabled={updateTicketMutation.isPending}
              aria-label="Category selector"
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium cursor-pointer"
            >
              <option value="">Uncategorized</option>
              <option value="GENERAL_QUESTION">General Question</option>
              <option value="TECHNICAL_QUESTION">Technical Question</option>
              <option value="REFUND_REQUEST">Refund Request</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 sm:justify-end">
            <span className="text-slate-500 font-medium">Assignee:</span>
            <select
              value={ticket.assignedAgentId || ''}
              onChange={(e) => handleAgentChange(e.target.value)}
              disabled={updateTicketMutation.isPending}
              aria-label="Assignee selector"
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium cursor-pointer"
            >
              <option value="">Unassigned</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Status Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
          <span className="text-xs font-semibold text-indigo-950">
            Update Status:
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleStatusChange('OPEN')}
              disabled={ticket.status === 'OPEN' || updateTicketMutation.isPending}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ticket.status === 'OPEN'
                  ? 'bg-sky-600 text-white shadow-xs cursor-default'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('RESOLVED')}
              disabled={ticket.status === 'RESOLVED' || updateTicketMutation.isPending}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ticket.status === 'RESOLVED'
                  ? 'bg-emerald-600 text-white shadow-xs cursor-default'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Resolved
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('CLOSED')}
              disabled={ticket.status === 'CLOSED' || updateTicketMutation.isPending}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ticket.status === 'CLOSED'
                  ? 'bg-slate-700 text-white shadow-xs cursor-default'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Closed
            </button>
          </div>
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Conversation Thread ({ticket.messages?.length || 0})</span>
        </h2>

        <div className="space-y-3">
          {ticket.messages && ticket.messages.length > 0 ? (
            ticket.messages.map((msg: TicketMessage, idx: number) => {
              const isStudent = msg.senderType === 'STUDENT';
              const isNote = msg.isInternalNote;
              const msgDate = new Date(msg.createdAt).toLocaleString(undefined, {
                dateStyle: 'short',
                timeStyle: 'short',
              });

              return (
                <div
                  key={msg.id || idx}
                  className={`p-4 rounded-xl border transition-all ${
                    isNote
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : isStudent
                      ? 'bg-slate-50 border-slate-200 text-slate-900'
                      : 'bg-indigo-50/60 border-indigo-200 text-indigo-950'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          isNote
                            ? 'bg-amber-200/80 text-amber-900'
                            : isStudent
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-indigo-200/80 text-indigo-900'
                        }`}
                      >
                        {isNote ? 'Internal Note' : isStudent ? 'Student' : 'Support Agent'}
                      </span>
                      <span className="text-slate-500 font-medium">
                        {msg.senderEmail}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px]">{msgDate}</span>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.body}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">
              No messages in thread yet.
            </div>
          )}
        </div>
      </div>

      {/* Response / Internal Note Composer Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <form onSubmit={handleSendReply} className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-700 flex items-center space-x-1.5">
              <span>Add Response or Note</span>
            </label>
            <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs text-slate-600 select-none">
              <input
                type="checkbox"
                checked={isInternalNote}
                onChange={(e) => setIsInternalNote(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
              />
              <span className="flex items-center space-x-1 text-[11px] font-medium">
                <Lock className="h-3 w-3 text-amber-600" />
                <span>Internal Note Only</span>
              </span>
            </label>
          </div>

          <div className="relative">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={
                isInternalNote
                  ? 'Write a private note visible only to support staff...'
                  : 'Write a reply to the student...'
              }
              rows={3}
              required
              className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none font-sans"
            />
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={!replyBody.trim() || addMessageMutation.isPending}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {addMessageMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>{isInternalNote ? 'Save Note' : 'Send Reply'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketDetailPage;
