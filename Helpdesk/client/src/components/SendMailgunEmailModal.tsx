import React, { useState, useEffect } from 'react';
import type { Ticket, TicketStatus } from '../lib/types';
import { useSendMailgunEmail, usePolishReply } from '../lib/hooks/useTickets';
import { ErrorMessage } from './ErrorMessage';
import {
  Mail,
  Send,
  Loader2,
  Sparkles,
  Check,
  X,
  FileText,
  User,
  AtSign,
  Tag,
  CheckCircle2,
} from 'lucide-react';

export interface SendMailgunEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket?: Ticket | null;
  defaultTo?: string;
  defaultToName?: string;
  defaultSubject?: string;
  defaultBody?: string;
  onSuccess?: (result: { messageId?: string; provider?: string }) => void;
  onError?: (error: string | null) => void;
}

const EMAIL_TEMPLATES = [
  {
    id: 'certificate',
    title: 'Certificate of Completion',
    subject: 'Regarding your Course Certificate of Completion',
    body: 'Hello,\n\nThank you for reaching out to Support.\n\nA Certificate of Completion is automatically generated once you complete 100% of the lessons in a course. You can view and download your certificates directly in your student dashboard under "My Certificates".\n\nPlease let us know if you need any further assistance!\n\nBest regards,\nCode with Mosh Support',
  },
  {
    id: 'account_reset',
    title: 'Account & Login Assistance',
    subject: 'Account access & password reset instructions',
    body: 'Hello,\n\nThank you for contacting Support.\n\nTo reset your account password, please visit our password recovery page and enter the email address linked to your enrollment. You will receive a secure reset link within 2-3 minutes.\n\nIf you continue experiencing login issues, please let us know!\n\nBest regards,\nCode with Mosh Support',
  },
  {
    id: 'issue_resolved',
    title: 'Issue Resolved Confirmation',
    subject: 'Your support inquiry has been resolved',
    body: 'Hello,\n\nWe are pleased to inform you that the issue you reported has been resolved. Please refresh your browser or log back in to confirm that everything is working as expected.\n\nIf you have any other questions, feel free to reply directly to this email.\n\nBest regards,\nCode with Mosh Support',
  },
  {
    id: 'more_info',
    title: 'Request Additional Information',
    subject: 'Need more details regarding your inquiry',
    body: 'Hello,\n\nThank you for contacting Support.\n\nTo help us investigate this issue further, could you please provide:\n1. The exact error message or a screenshot\n2. The browser and operating system you are using\n3. The specific lesson or module URL where this occurs\n\nOnce we receive this information, we will resolve this for you as quickly as possible.\n\nBest regards,\nCode with Mosh Support',
  },
];

export const SendMailgunEmailModal: React.FC<SendMailgunEmailModalProps> = ({
  isOpen,
  onClose,
  ticket,
  defaultTo = '',
  defaultToName = '',
  defaultSubject = '',
  defaultBody = '',
  onSuccess,
  onError,
}) => {
  const [toEmail, setToEmail] = useState('');
  const [toName, setToName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [statusUpdate, setStatusUpdate] = useState<TicketStatus | ''>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ messageId?: string } | null>(null);
  const [isPolished, setIsPolished] = useState(false);

  const sendEmailMutation = useSendMailgunEmail();
  const polishReplyMutation = usePolishReply();

  // Pre-populate fields whenever modal opens or ticket changes
  useEffect(() => {
    if (isOpen) {
      const recipientEmail = ticket?.studentEmail || defaultTo;
      const recipientName = ticket?.studentName || defaultToName;
      let initialSubject = defaultSubject;

      if (!initialSubject && ticket) {
        initialSubject = ticket.subject.startsWith('[Ticket #')
          ? `Re: ${ticket.subject}`
          : `[Ticket #${ticket.id}] Re: ${ticket.subject}`;
      }

      setToEmail(recipientEmail);
      setToName(recipientName);
      setSubject(initialSubject || '');
      setBody(defaultBody || '');
      setStatusUpdate(ticket?.status === 'OPEN' || ticket?.status === 'NEW' ? 'RESOLVED' : '');
      setFormError(null);
      setSuccessInfo(null);
      setIsPolished(false);
    }
  }, [isOpen, ticket, defaultTo, defaultToName, defaultSubject, defaultBody]);

  if (!isOpen) return null;

  const handlePolishWithAi = async () => {
    if (!body.trim()) {
      setFormError('Please enter email content before polishing with AI.');
      return;
    }

    setFormError(null);
    try {
      const result = await polishReplyMutation.mutateAsync({
        text: body.trim(),
        studentName: toName || ticket?.studentName,
        category: ticket?.category || undefined,
      });

      if (result.polishedReply) {
        setBody(result.polishedReply);
        setIsPolished(true);
        setTimeout(() => setIsPolished(false), 3500);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to polish email with AI');
    }
  };

  const handleInsertAiDraft = () => {
    if (ticket?.aiDraftResponse) {
      setBody(ticket.aiDraftResponse);
      setFormError(null);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    const selected = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (selected) {
      setBody(selected.body);
      if (!subject || subject.startsWith('[Ticket #')) {
        const prefix = ticket ? `[Ticket #${ticket.id}] ` : '';
        setSubject(`${prefix}${selected.subject}`);
      }
      setFormError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!toEmail.trim()) {
      setFormError('Recipient email is required.');
      return;
    }
    if (!subject.trim()) {
      setFormError('Email subject is required.');
      return;
    }
    if (!body.trim()) {
      setFormError('Email body cannot be empty.');
      return;
    }

    setFormError(null);
    try {
      const result = await sendEmailMutation.mutateAsync({
        ticketId: ticket?.id,
        to: toEmail.trim(),
        toName: toName.trim() || undefined,
        subject: subject.trim(),
        text: body.trim(),
        statusUpdate: statusUpdate ? (statusUpdate as TicketStatus) : undefined,
      });

      setSuccessInfo({ messageId: result.messageId });
      onSuccess?.({ messageId: result.messageId, provider: result.provider });

      // Automatically close modal after brief success confirmation
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      const msg = err.message || 'Failed to dispatch outbound email via Mailgun.';
      setFormError(msg);
      onError?.(msg);
    }
  };

  const isBusy = sendEmailMutation.isPending || polishReplyMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-email-modal-title"
    >
      <div className="bg-white dark:bg-[#0D1527]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-cyan-500/20 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-200">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-70" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-linear-to-r dark:from-[#080C14] dark:via-[#0D1527] dark:to-cyan-950/20">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-xs">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 id="send-email-modal-title" className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Send Email via Mailgun
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                  Mailgun Sandbox
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {ticket
                  ? `Replying to Ticket #${ticket.id} (${ticket.studentName})`
                  : 'Compose and dispatch an outbound email'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Success Banner */}
          {successInfo && (
            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 animate-in zoom-in-95 duration-150">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px]">Email successfully delivered via Mailgun!</p>
                {successInfo.messageId && (
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5 truncate max-w-lg">
                    Message-ID: {successInfo.messageId}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error Banner */}
          <ErrorMessage message={formError} />

          {/* Recipient & Subject Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* To Email */}
            <div>
              <label htmlFor="recipient-email" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                <AtSign className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                <span>To (Recipient Email) *</span>
              </label>
              <input
                id="recipient-email"
                type="email"
                required
                value={toEmail}
                onChange={(e) => {
                  setToEmail(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="student@example.com"
                disabled={isBusy}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700/80 px-3 py-2 bg-white dark:bg-[#080C14]/90 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-cyan-500/30 focus:border-indigo-600 dark:focus:border-cyan-500 transition-all font-sans"
              />
            </div>

            {/* Recipient Name */}
            <div>
              <label htmlFor="recipient-name" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
                <User className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                <span>Recipient Name</span>
              </label>
              <input
                id="recipient-name"
                type="text"
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder="Student / Customer Name"
                disabled={isBusy}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700/80 px-3 py-2 bg-white dark:bg-[#080C14]/90 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-cyan-500/30 focus:border-indigo-600 dark:focus:border-cyan-500 transition-all font-sans"
              />
            </div>
          </div>

          {/* Subject Field */}
          <div>
            <label htmlFor="email-subject" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
              <Tag className="h-3 w-3 text-slate-400 dark:text-slate-500" />
              <span>Subject *</span>
            </label>
            <input
              id="email-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="[Ticket #123] Regarding your support inquiry"
              disabled={isBusy}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700/80 px-3 py-2 bg-white dark:bg-[#080C14]/90 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-cyan-500/30 focus:border-indigo-600 dark:focus:border-cyan-500 transition-all font-sans"
            />
          </div>

          {/* AI Assistance & Quick Templates Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Quick Template Selector */}
              <div className="relative inline-block">
                <select
                  aria-label="Insert quick response template"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectTemplate(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  disabled={isBusy}
                  className="text-[10px] font-semibold bg-slate-100 dark:bg-[#080C14] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-cyan-500 cursor-pointer transition-colors"
                >
                  <option value="">Insert Template...</option>
                  {EMAIL_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id} className="bg-white dark:bg-[#0D1527] text-slate-900 dark:text-slate-200">
                      {tmpl.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Insert AI Draft (if present on ticket) */}
              {ticket?.aiDraftResponse && (
                <button
                  type="button"
                  onClick={handleInsertAiDraft}
                  disabled={isBusy}
                  className="inline-flex items-center space-x-1 text-[10px] font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
                >
                  <FileText className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  <span>Insert AI Draft</span>
                </button>
              )}
            </div>

            {/* Polish with AI Button */}
            <div className="flex items-center space-x-2">
              {isPolished && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 px-2 py-0.5 rounded-full animate-in fade-in">
                  <Check className="h-2.5 w-2.5 text-purple-600 dark:text-purple-400" />
                  <span>Polished with AI</span>
                </span>
              )}
              <button
                type="button"
                onClick={handlePolishWithAi}
                disabled={isBusy || !body.trim()}
                className="inline-flex items-center space-x-1 text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed border border-purple-200 dark:border-purple-500/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                {polishReplyMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin text-purple-600 dark:text-purple-400" />
                ) : (
                  <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                )}
                <span>Polish with AI</span>
              </button>
            </div>
          </div>

          {/* Email Body Textarea */}
          <div>
            <textarea
              id="email-body"
              required
              rows={7}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (formError) setFormError(null);
                if (isPolished) setIsPolished(false);
              }}
              placeholder="Write your email message to the student here..."
              disabled={isBusy}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700/80 p-3 bg-white dark:bg-[#080C14]/90 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-cyan-500/30 focus:border-indigo-600 dark:focus:border-cyan-500 transition-all font-sans resize-y leading-relaxed"
            />
          </div>

          {/* Optional Ticket Status Transition */}
          {ticket && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#080C14]/60 border border-slate-200 dark:border-slate-800/80">
              <div>
                <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Update Ticket Status on Send</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Optionally change the ticket status once the email is dispatched.
                </p>
              </div>
              <select
                aria-label="Update ticket status after email dispatch"
                value={statusUpdate}
                onChange={(e) => setStatusUpdate(e.target.value as TicketStatus | '')}
                disabled={isBusy}
                className="text-[11px] font-semibold bg-white dark:bg-[#0D1527] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-cyan-500 cursor-pointer"
              >
                <option value="">Keep current ({ticket.status})</option>
                <option value="RESOLVED">Mark as RESOLVED</option>
                <option value="CLOSED">Mark as CLOSED</option>
                <option value="OPEN">Mark as OPEN</option>
              </select>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#080C14]/60">
          <p className="text-[10px] text-slate-500 hidden sm:block">
            Dispatches directly via Mailgun REST API.
          </p>
          <div className="flex items-center space-x-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isBusy || Boolean(successInfo)}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
            >
              {sendEmailMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Sending via Mailgun...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Email</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendMailgunEmailModal;
