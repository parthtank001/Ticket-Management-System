import React from 'react';
import type { TicketMessage } from '../lib/types';
import { TicketSenderBadge } from './TicketBadges';
import { formatDateShort, cn, sanitizeHtml } from '../lib/utils';
import { MessageSquare } from 'lucide-react';

export interface ReplyThredProps {
  messages?: TicketMessage[];
  ticketBody?: string | null;
  studentEmail?: string;
  createdAt?: string | Date;
  ticketId?: number;
  showHeader?: boolean;
  className?: string;
  emptyMessage?: string;
}

const getMessageVariantClass = (isNote?: boolean, isStudent?: boolean): string => {
  if (isNote) return 'thread-message-note';
  if (isStudent) return 'thread-message-student';
  return 'thread-message-agent';
};

export function parseBodyToMessages(
  body?: string | null,
  studentEmail?: string,
  fallbackDate?: string | Date
): TicketMessage[] {
  if (!body || !body.trim()) return [];

  const delimiterRegex = /\n*---\s*\[(.*?)\]\s*(?:\((.*?)\))?\s*---\n*/g;
  const matches = [...body.matchAll(delimiterRegex)];

  if (matches.length === 0) {
    return [
      {
        id: 'initial-msg',
        ticketId: 0,
        senderType: 'STUDENT',
        senderEmail: studentEmail || 'student@example.com',
        body: body.trim(),
        isInternalNote: false,
        createdAt: fallbackDate ? new Date(fallbackDate).toISOString() : new Date().toISOString(),
      },
    ];
  }

  const messages: TicketMessage[] = [];
  const baseDate = fallbackDate ? new Date(fallbackDate).getTime() : Date.now();

  const firstMatchIndex = matches[0].index ?? 0;
  const initialText = body.slice(0, firstMatchIndex).trim();
  if (initialText) {
    messages.push({
      id: 'msg-0',
      ticketId: 0,
      senderType: 'STUDENT',
      senderEmail: studentEmail || 'student@example.com',
      body: initialText,
      isInternalNote: false,
      createdAt: new Date(baseDate).toISOString(),
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const headerType = match[1] || '';
    const email = match[2] || '';
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd = i + 1 < matches.length ? (matches[i + 1].index ?? body.length) : body.length;
    const content = body.slice(contentStart, contentEnd).trim();

    const isInternalNote = headerType.toUpperCase().includes('INTERNAL NOTE') || headerType.toUpperCase().includes('NOTE');
    const isStudent = headerType.toUpperCase().includes('STUDENT') || headerType.toUpperCase().includes('CUSTOMER');
    const senderType = isStudent ? 'STUDENT' : 'AGENT';
    const senderEmail = email || (isStudent ? (studentEmail || 'student@example.com') : 'agent@example.com');
    const turnDate = new Date(baseDate + (i + 1) * 35 * 60 * 1000).toISOString();

    messages.push({
      id: `msg-${i + 1}`,
      ticketId: 0,
      senderType,
      senderEmail,
      body: content,
      isInternalNote,
      createdAt: turnDate,
    });
  }

  return messages;
}

export const ReplyThred: React.FC<ReplyThredProps> = ({
  messages = [],
  ticketBody,
  studentEmail,
  createdAt,
  ticketId: _ticketId,
  showHeader = true,
  className = '',
  emptyMessage = 'No messages in thread yet.',
}) => {
  const parsedFromParsedBody = !messages || messages.length === 0 ? parseBodyToMessages(ticketBody, studentEmail, createdAt) : [];
  const messageList = (messages && messages.length > 0) ? messages : parsedFromParsedBody;
  const messageCount = messageList.length;

  return (
    <div className={cn('thread-container', className)}>
      {showHeader && (
        <div className="thread-header">
          <h2 className="thread-header-title">
            <MessageSquare className="h-3 w-3" />
            <span>Conversation Thread ({messageCount})</span>
          </h2>
          {messageCount > 0 && (
            <span className="thread-header-count">
              {messageCount} {messageCount === 1 ? 'message' : 'messages'}
            </span>
          )}
        </div>
      )}

      <div className="space-y-2.5">
        {messageCount > 0 ? (
          messageList.map((msg: TicketMessage, idx: number) => {
            const isStudent = msg.senderType === 'STUDENT';
            const isNote = msg.isInternalNote;
            const msgDate = formatDateShort(msg.createdAt);

            return (
              <div
                key={msg.id || idx}
                className={cn('thread-message-item', getMessageVariantClass(isNote, isStudent))}
              >
                <div className="thread-meta-header">
                  <div className="flex items-center space-x-1.5">
                    <TicketSenderBadge
                      senderType={msg.senderType}
                      isInternalNote={msg.isInternalNote}
                      size="sm"
                    />
                    <span className="thread-meta-email">
                      {msg.senderEmail}
                    </span>
                  </div>
                  <span className="thread-meta-date">{msgDate}</span>
                </div>
                <div className="thread-message-body">
                  {msg.bodyHtml ? (
                    <div
                      data-testid="message-body-html"
                      className="prose prose-sm max-w-none text-slate-800 break-words"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.bodyHtml) }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.body}</div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="thread-empty-state">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export { ReplyThred as ReplyThread };
export default ReplyThred;

