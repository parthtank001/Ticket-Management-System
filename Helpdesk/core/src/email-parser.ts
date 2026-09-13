/**
 * Email Parser & Header Processing Utility
 * Pure TypeScript module for extracting sender details, message IDs, thread references, ticket tags,
 * and detecting auto-responders.
 */

export interface ParsedEmail {
  senderEmail: string;
  senderName: string;
  recipientEmail?: string;
  subject: string;
  cleanSubject: string;
  body: string;
  messageId?: string;
  inReplyTo?: string;
  references: string[];
  isAutoSubmitted: boolean;
  autoSubmittedReason?: string;
  ticketNumberFromSubject?: number;
  headers: Record<string, string>;
  rawPayload: any;
}

/**
 * Extracts display name and clean email address from a From header/string.
 * Handles formats like:
 * - "John Doe" <john.doe@example.com>
 * - John Doe <john.doe@example.com>
 * - <john.doe@example.com>
 * - john.doe@example.com
 */
export function parseEmailAddress(rawFrom: string): { name: string; email: string } {
  if (!rawFrom || typeof rawFrom !== 'string') {
    return { name: '', email: '' };
  }

  const trimmed = rawFrom.trim();

  // Match "Display Name" <email@domain.com> or Display Name <email@domain.com>
  const angleBracketMatch = trimmed.match(/^(?:"?([^"<>]*)"?\s*)?<([^<>]+)>$/);
  if (angleBracketMatch) {
    const namePart = (angleBracketMatch[1] || '').trim();
    const emailPart = (angleBracketMatch[2] || '').trim().toLowerCase();
    const name = namePart || (emailPart.includes('@') ? emailPart.split('@')[0] : emailPart);
    return { name, email: emailPart };
  }

  // Plain email without angle brackets
  const cleanEmail = trimmed.replace(/[<>]/g, '').trim().toLowerCase();
  const name = cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail;
  return { name, email: cleanEmail };
}

/**
 * Strips HTML tags and collapses whitespace to extract clean plain text.
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts ticket number from subject if present (e.g. "[Ticket #1005] Issue" -> 1005)
 */
export function extractTicketNumberFromSubject(subject: string): { ticketNumber?: number; cleanSubject: string } {
  if (!subject) return { cleanSubject: '' };

  const trimmed = subject.trim();
  const ticketRegex = /\[Ticket\s*#?(\d+)\]|Ticket\s*#(\d+)|\[#(\d+)\]/i;
  const match = trimmed.match(ticketRegex);

  if (match) {
    const numberStr = match[1] || match[2] || match[3];
    const ticketNumber = parseInt(numberStr, 10);
    // Strip ticket tag for clean subject display
    const cleanSubject = trimmed.replace(ticketRegex, '').replace(/\s{2,}/g, ' ').trim();
    return { ticketNumber, cleanSubject: cleanSubject || trimmed };
  }

  return { cleanSubject: trimmed };
}

/**
 * Cleans RFC Message-ID / In-Reply-To strings by removing surrounding angle brackets.
 */
export function cleanMessageId(id?: string | null): string | undefined {
  if (!id || typeof id !== 'string') return undefined;
  const cleaned = id.replace(/[<>]/g, '').trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Extracts list of message IDs from References header/string/array.
 */
export function parseReferences(references?: string | string[] | null): string[] {
  if (!references) return [];

  if (Array.isArray(references)) {
    return references
      .map((ref) => cleanMessageId(ref))
      .filter((ref): ref is string => Boolean(ref));
  }

  if (typeof references === 'string') {
    const matches = references.match(/<[^>]+>|[^,\s]+/g);
    if (!matches) return [];
    return matches
      .map((ref) => cleanMessageId(ref))
      .filter((ref): ref is string => Boolean(ref));
  }

  return [];
}

/**
 * Normalizes email headers into a lowercase key-value dictionary.
 */
export function normalizeHeaders(rawHeaders: any): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!rawHeaders) return headers;

  if (typeof rawHeaders === 'string') {
    const lines = rawHeaders.split(/\r?\n/);
    let currentKey = '';
    for (const line of lines) {
      if (/^\s+/.test(line) && currentKey) {
        headers[currentKey] += ' ' + line.trim();
      } else {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          currentKey = line.substring(0, colonIndex).trim().toLowerCase();
          const val = line.substring(colonIndex + 1).trim();
          headers[currentKey] = val;
        }
      }
    }
    return headers;
  }

  if (typeof rawHeaders === 'object') {
    for (const [key, value] of Object.entries(rawHeaders)) {
      if (typeof value === 'string') {
        headers[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        headers[key.toLowerCase()] = value.join(', ');
      } else if (value != null) {
        headers[key.toLowerCase()] = String(value);
      }
    }
  }

  return headers;
}

/**
 * Anti-Loop Protection: Detects auto-submitted or auto-responder emails to prevent infinite loops.
 */
export function detectAutoSubmitted(
  headers: Record<string, string>,
  subject: string,
  rawPayload: any
): { isAutoSubmitted: boolean; reason?: string } {
  // 1. Check RFC 3834 Auto-Submitted header
  const autoSubmitted = (
    headers['auto-submitted'] ||
    rawPayload?.autoSubmitted ||
    rawPayload?.['Auto-Submitted'] ||
    ''
  ).toLowerCase().trim();

  if (autoSubmitted && autoSubmitted !== 'no') {
    return {
      isAutoSubmitted: true,
      reason: `Auto-Submitted header present: "${autoSubmitted}"`,
    };
  }

  // 2. Check X-Autoreply or X-Autorespond headers
  if (headers['x-autoreply'] && headers['x-autoreply'].toLowerCase() !== 'no') {
    return { isAutoSubmitted: true, reason: 'X-Autoreply header detected' };
  }
  if (headers['x-autorespond'] && headers['x-autorespond'].toLowerCase() !== 'no') {
    return { isAutoSubmitted: true, reason: 'X-Autorespond header detected' };
  }
  if (headers['x-auto-response-suppress']) {
    return { isAutoSubmitted: true, reason: `X-Auto-Response-Suppress: "${headers['x-auto-response-suppress']}"` };
  }

  // 3. Check Precedence header
  const precedence = (headers['precedence'] || '').toLowerCase().trim();
  if (['bulk', 'junk', 'auto_reply', 'list'].includes(precedence)) {
    return { isAutoSubmitted: true, reason: `Precedence header: "${precedence}"` };
  }

  // 4. Check Subject line patterns for typical vacation/out-of-office/bounce auto-responders
  const lowerSubject = (subject || '').toLowerCase().trim();
  const autoSubjectPatterns = [
    /^automatic reply:/i,
    /^auto:/i,
    /^out of office:/i,
    /^out of the office:/i,
    /^undelivered mail returned to sender/i,
    /^delivery status notification \(failure\)/i,
    /^mail delivery failed/i,
    /^auto-reply:/i,
  ];

  for (const pattern of autoSubjectPatterns) {
    if (pattern.test(lowerSubject)) {
      return { isAutoSubmitted: true, reason: `Auto-responder subject pattern detected: "${subject}"` };
    }
  }

  return { isAutoSubmitted: false };
}

/**
 * Main parser function to normalize any inbound email webhook payload
 * (Standard JSON, SendGrid Inbound Parse, Mailgun Inbound Parse, form-urlencoded).
 */
export function parseInboundEmail(payload: any): ParsedEmail {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid email payload: expected a JSON object or form payload.');
  }

  // Extract raw fields across different provider conventions
  const rawFrom =
    payload.from ||
    payload.sender ||
    payload.From ||
    payload.Sender ||
    payload.envelope?.from ||
    payload['from[address]'] ||
    '';

  const rawTo =
    payload.to ||
    payload.recipient ||
    payload.To ||
    payload.Recipient ||
    payload.envelope?.to?.[0] ||
    '';

  const rawSubject = payload.subject || payload.Subject || '(No Subject)';

  // Extract body content (prefer text/plain, fallback to stripped html)
  let rawBody =
    payload.text ||
    payload.body ||
    payload['body-plain'] ||
    payload['stripped-text'] ||
    payload.Body ||
    payload.Text ||
    '';

  const rawHtml =
    payload.html ||
    payload['body-html'] ||
    payload['stripped-html'] ||
    payload.Html ||
    '';

  if (!rawBody && rawHtml) {
    rawBody = stripHtml(rawHtml);
  }

  const { name: senderName, email: senderEmail } = parseEmailAddress(rawFrom);
  const { email: recipientEmail } = parseEmailAddress(rawTo);

  // Normalize headers
  let rawHeaders = payload.headers || payload['message-headers'] || payload.Headers;
  if (typeof rawHeaders === 'string') {
    try {
      rawHeaders = JSON.parse(rawHeaders);
    } catch {
      // Keep as string for MIME parser
    }
  }
  const headers = normalizeHeaders(rawHeaders);

  // Extract Message-ID, In-Reply-To, References
  const messageId = cleanMessageId(
    payload.messageId ||
    payload['Message-Id'] ||
    payload['message-id'] ||
    payload.message_id ||
    headers['message-id'] ||
    headers['message_id']
  );

  const inReplyTo = cleanMessageId(
    payload.inReplyTo ||
    payload['In-Reply-To'] ||
    payload['in-reply-to'] ||
    payload.in_reply_to ||
    headers['in-reply-to'] ||
    headers['in_reply_to']
  );

  const rawReferences =
    payload.references ||
    payload.References ||
    headers['references'];

  const references = parseReferences(rawReferences);
  if (inReplyTo && !references.includes(inReplyTo)) {
    references.unshift(inReplyTo);
  }

  // Extract ticket number from subject if tagged
  const { ticketNumber: ticketNumberFromSubject, cleanSubject } = extractTicketNumberFromSubject(rawSubject);

  // Detect auto-submitted / auto-responders
  const { isAutoSubmitted, reason: autoSubmittedReason } = detectAutoSubmitted(headers, rawSubject, payload);

  const explicitSenderName = payload.studentName || payload.name || payload.senderName;
  const resolvedSenderName = (explicitSenderName || senderName || (senderEmail ? senderEmail.split('@')[0] : '')).trim();

  return {
    senderEmail,
    senderName: resolvedSenderName,
    recipientEmail,
    subject: rawSubject.trim(),
    cleanSubject,
    body: rawBody.trim(),
    messageId,
    inReplyTo,
    references,
    isAutoSubmitted,
    autoSubmittedReason,
    ticketNumberFromSubject,
    headers,
    rawPayload: payload,
  };
}