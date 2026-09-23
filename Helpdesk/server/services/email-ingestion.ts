import { prisma } from '../db';
import { Category, Priority, TicketStatus, SenderType } from '@helpdesk/core';
import { parseInboundEmail, ParsedEmail } from './email-parser';
import { scheduleTicketClassification } from './ai';

export interface EmailIngestionResult {
  status: 'created' | 'appended' | 'ignored' | 'duplicate';
  isThreadReply: boolean;
  ticketId?: number;
  ticketNumber?: number;
  messageId?: string;
  reason?: string;
  ticket?: any;
  message?: any;
}

/**
 * Ingests and processes an incoming email payload (webhook or direct ingestion),
 * applying anti-loop protection, conversation threading, AI classification,
 * and converting it into a new Ticket or appending a message to an existing Ticket thread.
 */
export async function ingestInboundEmail(rawPayload: any): Promise<EmailIngestionResult> {
  const parsed: ParsedEmail = parseInboundEmail(rawPayload);

  // Validate sender email
  if (!parsed.senderEmail || !parsed.senderEmail.includes('@')) {
    const error: any = new Error('A valid sender email address is required to create or update a ticket.');
    error.statusCode = 400;
    throw error;
  }

  // Validate sender name
  if (!parsed.senderName || parsed.senderName.trim().length === 0) {
    const error: any = new Error('Sender name is required.');
    error.statusCode = 400;
    throw error;
  }

  // Validate body content
  if (!parsed.body || parsed.body.trim().length === 0) {
    const error: any = new Error('Email body content cannot be empty.');
    error.statusCode = 400;
    throw error;
  }

  // Anti-Loop Protection: Ignore auto-submitted/auto-responder emails
  if (parsed.isAutoSubmitted) {
    console.info(`[Anti-Loop] Ignored auto-submitted email from ${parsed.senderEmail}: ${parsed.autoSubmittedReason}`);
    try {
      await prisma.webhookLog.create({
        data: {
          source: 'inbound_email',
          payload: JSON.stringify(rawPayload),
          status: 'ignored',
          reason: parsed.autoSubmittedReason || 'Auto-submitted loop protection',
        },
      });
    } catch (logErr) {
      console.error('Failed to write webhook log:', logErr);
    }
    return {
      status: 'ignored',
      isThreadReply: false,
      reason: parsed.autoSubmittedReason || 'Auto-submitted email ignored to prevent infinite loops',
    };
  }

  // Check for duplicate Message-ID via webhook logs
  if (parsed.messageId) {
    const existingLog = await prisma.webhookLog.findFirst({
      where: {
        payload: {
          contains: parsed.messageId,
        },
      },
    });

    if (existingLog && existingLog.ticketId) {
      return {
        status: 'duplicate',
        isThreadReply: true,
        ticketId: existingLog.ticketId,
        ticketNumber: existingLog.ticketId,
        reason: 'Message with this Message-ID has already been ingested',
      };
    }
  }

  // Thread Matching:
  // 1. Check ticket number tag in subject (e.g., "[Ticket #1005]")
  let existingTicket: any = null;

  if (parsed.ticketNumberFromSubject) {
    const ticketById = await prisma.ticket.findUnique({
      where: { id: parsed.ticketNumberFromSubject },
      include: {
        assignedAgent: true,
      },
    });

    if (ticketById) {
      existingTicket = ticketById;
    }
  }

  // Case A: Existing ticket matched -> Append student reply to ticket body
  if (existingTicket) {
    const updatedBody = existingTicket.body
      ? `${existingTicket.body}\n\n--- [Reply from ${parsed.senderName} (${parsed.senderEmail})] ---\n${parsed.body}`
      : parsed.body;

    // Determine if ticket status should be reopened or updated
    const shouldReopen = [
      'RESOLVED',
      'CLOSED',
    ].includes(existingTicket.status as TicketStatus);

    let nextStatus = existingTicket.status;
    if (shouldReopen) {
      nextStatus = 'OPEN';
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: existingTicket.id },
      data: {
        body: updatedBody,
        status: nextStatus,
      },
      include: {
        assignedAgent: true,
      },
    });

    try {
      await prisma.webhookLog.create({
        data: {
          source: 'inbound_email',
          payload: JSON.stringify(rawPayload),
          status: 'appended',
          ticketId: existingTicket.id,
          reason: `Appended message to Ticket #${existingTicket.id}`,
        },
      });
    } catch (logErr) {
      console.error('Failed to write webhook log:', logErr);
    }

    return {
      status: 'appended',
      isThreadReply: true,
      ticketId: existingTicket.id,
      ticketNumber: existingTicket.id,
      ticket: updatedTicket,
    };
  }

  // Case B: No matching ticket -> Create a new Ticket and trigger non-blocking GPT classification
  const subjectToUse = parsed.cleanSubject || parsed.subject || 'Support Inquiry';

  const newTicket = await prisma.ticket.create({
    data: {
      subject: subjectToUse,
      studentEmail: parsed.senderEmail,
      studentName: parsed.senderName.trim(),
      body: parsed.body,
      category: null,
      priority: 'MEDIUM',
      status: 'OPEN',
      summary: null,
      aiDraftResponse: null,
    },
    include: {
      assignedAgent: true,
    },
  });

  // Non-blocking automatic GPT classification for inbound email ticket
  scheduleTicketClassification(newTicket.id);

  try {
    await prisma.webhookLog.create({
      data: {
        source: 'inbound_email',
        payload: JSON.stringify(rawPayload),
        status: 'created',
        ticketId: newTicket.id,
        reason: `Created Ticket #${newTicket.id}`,
      },
    });
  } catch (logErr) {
    console.error('Failed to write webhook log:', logErr);
  }

  return {
    status: 'created',
    isThreadReply: false,
    ticketId: newTicket.id,
    ticketNumber: newTicket.id,
    ticket: newTicket,
  };
}
