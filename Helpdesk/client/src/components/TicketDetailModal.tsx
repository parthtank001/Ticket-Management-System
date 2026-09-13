import React, { useState } from 'react';
import type {
  Ticket,
  TicketAgent,
  TicketMessage,
  TicketStatus,
  Priority,
  Category,
  SenderType,
} from '../lib/types';
import {
  useUpdateTicket,
  useAddTicketMessage,
  useAgents,
} from '../lib/hooks/useTickets';
import {
  TicketStatusBadge,
  TicketPriorityBadge,
  TicketCategoryBadge,
} from './TicketBadges';
import {
  X,
  User,
  Mail,
  Calendar,
  Send,
  Loader2,
  Lock,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
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
  const [replyBody, setReplyBody] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const updateTicketMutation = useUpdateTicket();
  const addMessageMutation = useAddTicketMessage();
  const { data: agents = [] } = useAgents();

  if (!isOpen || !ticket) return null;

  const handleStatusChange = async (newStatus: TicketStatus) => {
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
    if (!replyBody.trim()) return;

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

  const formattedDate = new Date(ticket.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200/60">
              <Hash className="h-3.5 w-3.5 mr-0.5" />
              Ticket #{ticket.id}
            </span>
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body & Thread Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Banner */}
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Ticket Title & Metadata */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
              {ticket.subject}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
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
                <span>Created {formattedDate}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-medium">Category:</span>
                <select
                  value={ticket.category || ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={updateTicketMutation.isPending}
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
          </div>

          {/* Status Quick Actions */}
          <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
            <span className="text-xs font-semibold text-indigo-950">
              Update Status:
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleStatusChange('OPEN')}
                disabled={ticket.status === 'OPEN' || updateTicketMutation.isPending}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  ticket.status === 'OPEN'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('RESOLVED')}
                disabled={ticket.status === 'RESOLVED' || updateTicketMutation.isPending}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  ticket.status === 'RESOLVED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Resolved
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('CLOSED')}
                disabled={ticket.status === 'CLOSED' || updateTicketMutation.isPending}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  ticket.status === 'CLOSED'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Closed
              </button>
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Conversation Thread ({ticket.messages?.length || 0})</span>
            </h3>

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
        </div>

        {/* Reply Composer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70">
          <form onSubmit={handleSendReply} className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-700 flex items-center space-x-1.5">
                <span>Add Response or Note</span>
              </label>
              <label className="inline-flex items-center space-x-1.5 cursor-pointer text-xs text-slate-600">
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
                className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!replyBody.trim() || addMessageMutation.isPending}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};
