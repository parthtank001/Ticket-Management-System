import React from 'react';
import type { TicketMessage } from '../lib/types';
import { TicketSenderBadge } from './TicketBadges';
import { formatDateShort, cn, sanitizeHtml } from '../lib/utils';
import { MessageSquare } from 'lucide-react';

export interface ReplyThredProps {
  messages?: TicketMessage[];
  showHeader?: boolean;
  className?: string;
  emptyMessage?: string;
}

const getMessageVariantClass = (isNote?: boolean, isStudent?: boolean): string => {
  if (isNote) return 'thread-message-note';
  if (isStudent) return 'thread-message-student';
  return 'thread-message-agent';
};

export const ReplyThred: React.FC<ReplyThredProps> = ({
  messages = [],
  showHeader = true,
  className = '',
  emptyMessage = 'No messages in thread yet.',
}) => {
  const messageList = messages || [];
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
                    <div className="whitespace-pre-wrap">{msg.body}</div>
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

