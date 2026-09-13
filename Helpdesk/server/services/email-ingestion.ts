import { prisma } from '../db';
import { Category, Priority, TicketStatus, SenderType } from '@helpdesk/core';
import { parseInboundEmail, ParsedEmail } from './email-parser';

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

  // Check for duplicate Message-ID across existing messages
  if (parsed.messageId) {
    const existingMessage = await prisma.ticketMessage.findUnique({
      where: { messageId: parsed.messageId },
      include: { ticket: true },
    });

    if (existingMessage) {
      try {
        await prisma.webhookLog.create({
          data: {
            source: 'inbound_email',
            payload: JSON.stringify(rawPayload),
            status: 'duplicate',
            ticketId: existingMessage.ticketId,
            reason: 'Message with this Message-ID has already been ingested',
          },
        });
      } catch (logErr) {
        console.error('Failed to write webhook log:', logErr);
      }
      return {
        status: 'duplicate',
        isThreadReply: true,
        ticketId: existingMessage.ticketId,
        ticketNumber: existingMessage.ticket.id,
        messageId: existingMessage.id,
        reason: 'Message with this Message-ID has already been ingested',
        ticket: existingMessage.ticket,
      };
    }
  }

  // Thread Matching:
  // 1. Check References & In-Reply-To headers against existing TicketMessages
  let existingTicket: any = null;

  if (parsed.references.length > 0) {
    const matchedMessage = await prisma.ticketMessage.findFirst({
      where: {
        messageId: {
          in: parsed.references,
        },
      },
      include: {
        ticket: {
          include: {
            assignedAgent: true,
            messages: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (matchedMessage?.ticket) {
      existingTicket = matchedMessage.ticket;
    }
  }

  // 2. Check ticket number tag in subject (e.g., "[Ticket #1005]") if not matched by headers
  if (!existingTicket && parsed.ticketNumberFromSubject) {
    const ticketById = await prisma.ticket.findUnique({
      where: { id: parsed.ticketNumberFromSubject },
      include: {
        assignedAgent: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (ticketById) {
      existingTicket = ticketById;
    }
  }

  // Case A: Existing ticket matched -> Append student reply to thread
  if (existingTicket) {
    const newMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: existingTicket.id,
        senderType: 'STUDENT',
        senderEmail: parsed.senderEmail,
        body: parsed.body,
        messageId: parsed.messageId,
        inReplyTo: parsed.inReplyTo,
        isInternalNote: false,
      },
    });

    // Determine if ticket status should be reopened or updated
    const shouldReopen = [
      'RESOLVED',
      'CLOSED',
    ].includes(existingTicket.status as TicketStatus);

    let nextStatus = existingTicket.status;
    if (shouldReopen) {
      nextStatus = 'OPEN';
      await prisma.ticket.update({
        where: { id: existingTicket.id },
        data: { status: nextStatus },
      });
    }

    const updatedTicket = await prisma.ticket.findUnique({
      where: { id: existingTicket.id },
      include: {
        assignedAgent: true,
        messages: { orderBy: { createdAt: 'asc' } },
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
      messageId: newMessage.id,
      ticket: updatedTicket,
      message: newMessage,
    };
  }

  // Case B: No matching ticket -> Create a new plain Ticket (no AI processing)
  const subjectToUse = parsed.cleanSubject || parsed.subject || 'Support Inquiry';

  const newTicket = await prisma.ticket.create({
    data: {
      subject: subjectToUse,
      studentEmail: parsed.senderEmail,
      studentName: parsed.senderName.trim(),
      category: null,
      priority: 'MEDIUM',
      status: 'OPEN',
      summary: null,
      aiDraftResponse: null,
      messages: {
        create: {
          senderType: 'STUDENT',
          senderEmail: parsed.senderEmail,
          body: parsed.body,
          messageId: parsed.messageId,
          inReplyTo: parsed.inReplyTo,
          isInternalNote: false,
        },
      },
    },
    include: {
      assignedAgent: true,
      messages: true,
    },
  });

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
    message: newTicket.messages[0],
  };
}
