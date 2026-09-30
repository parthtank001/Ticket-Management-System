import { Router, Request, Response } from 'express';
import multer from 'multer';
import { ingestInboundEmail } from '../services/email-ingestion';
import { sendOutboundEmail } from '../services/email-sender';
import { enqueueEmailSend, enqueueInboundEmail, isQueueReady } from '../services/queue';
import { verifyWebhookSecret } from '../middleware/webhook-auth';
import { requireAuth, requireRole } from '../middleware/auth';
import { sendEmailSchema } from '@helpdesk/core';
import type { Role } from '@helpdesk/core';
import { prisma } from '../db';

const emailsRouter = Router();

// Configure multer for Mailgun / SendGrid multipart/form-data payloads & attachments
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
});

/**
 * GET /api/emails/support-address (or /api/webhooks/support-address)
 * Returns configured system support address information and Mailgun webhook instructions
 */
emailsRouter.get('/support-address', (req: Request, res: Response) => {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com';
  const apiBaseUrl = process.env.API_BASE_URL || process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
  res.json({
    supportEmail,
    apiBaseUrl,
    inboundWebhookUrl: '/api/webhooks/email',
    mailgunWebhookUrl: '/api/webhooks/mailgun',
    inboundDirectUrl: '/api/emails/inbound',
    fullInboundWebhookUrl: `${apiBaseUrl}/api/webhooks/email`,
    fullMailgunWebhookUrl: `${apiBaseUrl}/api/webhooks/mailgun`,
    fullInboundDirectUrl: `${apiBaseUrl}/api/emails/inbound`,
    provider: 'Mailgun',
    threadingFormat: '[Ticket #XXXX]',
    antiLoopProtection: 'enabled',
    secretAuthRequired: Boolean(process.env.WEBHOOK_SECRET && process.env.WEBHOOK_SECRET.trim().length > 0),
    mailgunSignatureConfigured: Boolean(process.env.MAILGUN_SIGNING_KEY || process.env.MAILGUN_API_KEY),
  });
});

/**
 * GET /api/webhooks/logs (or /api/emails/logs)
 * Retrieve recent webhook audit logs (Admin only)
 */
emailsRouter.get('/logs', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  const logs = await prisma.webhookLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(logs);
});

async function handleInboundEmail(req: Request, res: Response) {
  // Combine req.body with req.files metadata if multipart
  const payload = {
    ...req.body,
    uploadedFiles: Array.isArray(req.files)
      ? req.files.map((file) => ({
          filename: file.originalname,
          contentType: file.mimetype,
          size: file.size,
        }))
      : undefined,
  };

  // If async processing is requested or high-throughput webhook mode is active
  if (req.query.async === 'true' || (req.body as any)?.async === true) {
    const jobId = await enqueueInboundEmail({
      payload,
      receivedAt: Date.now(),
    });

    return res.status(202).json({
      status: 'queued',
      jobId,
      message: 'Inbound email enqueued to pg-boss background worker for processing.',
    });
  }

  const result = await ingestInboundEmail(payload);

  if (result.status === 'created') {
    return res.status(201).json({
      status: 'created',
      message: 'Inbound email converted into a new support ticket.',
      ticket: result.ticket,
      ticketNumber: result.ticketNumber,
    });
  }

  if (result.status === 'appended') {
    return res.status(200).json({
      status: 'appended',
      info: `Inbound email reply appended to Ticket #${result.ticketNumber}.`,
      ticketId: result.ticketId,
      ticketNumber: result.ticketNumber,
      message: result.message,
    });
  }

  if (result.status === 'ignored') {
    return res.status(200).json({
      status: 'ignored',
      message: result.reason || 'Auto-submitted email ignored to prevent reply loops.',
    });
  }

  if (result.status === 'duplicate') {
    return res.status(200).json({
      status: 'duplicate',
      message: 'Email with this Message-ID has already been processed.',
      ticketId: result.ticketId,
      ticketNumber: result.ticketNumber,
    });
  }

  res.status(200).json(result);
}

/**
 * POST /api/emails/send
 * Authenticated endpoint for support agents & admins to dispatch outbound emails via Mailgun
 */
emailsRouter.post('/send', requireAuth, async (req: Request, res: Response) => {
  const validationResult = sendEmailSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const { ticketId, to, toName, subject, text, html, statusUpdate } = validationResult.data;

  // If background queue processing is requested
  if (req.query.async === 'true' || (req.body as any)?.async === true) {
    const jobId = await enqueueEmailSend({
      options: { to, toName, subject, text, html, ticketId },
      ticketId,
      statusUpdate,
      userEmail: req.user?.email,
      userName: req.user?.name,
    });

    return res.status(202).json({
      success: true,
      status: 'queued',
      jobId,
      message: 'Outbound email enqueued to pg-boss background worker for dispatch.',
    });
  }

  // 1. Dispatch outbound email via Mailgun service synchronously
  const sendResult = await sendOutboundEmail({
    to,
    toName,
    subject,
    text,
    html,
    ticketId,
  });

  if (!sendResult.success) {
    return res.status(502).json({
      error: 'Failed to send outbound email via Mailgun',
      details: sendResult.error,
      provider: sendResult.provider,
    });
  }

  // 2. If associated with a ticket, record message in ticket thread and update status
  let updatedTicket = null;
  if (ticketId) {
    const existingTicket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (existingTicket) {
      const senderEmail = req.user?.email || 'agent@example.com';
      const senderName = req.user?.name || 'Agent';
      const replyBlock = `\n\n--- [Outbound Email to ${to} (${senderEmail})] ---\n${text}`;
      const newBody = existingTicket.body ? `${existingTicket.body}${replyBlock}` : text;

      const updateData: any = { body: newBody };
      if (statusUpdate) {
        updateData.status = statusUpdate;
      }

      updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      // Audit log in webhook_log table
      await prisma.webhookLog.create({
        data: {
          source: 'mailgun_outbound',
          payload: JSON.stringify({
            to,
            toName,
            subject,
            messageId: sendResult.messageId,
            senderEmail,
            senderName,
          }),
          status: 'sent',
          ticketId,
        },
      });
    }
  }

  res.status(200).json({
    success: true,
    messageId: sendResult.messageId,
    provider: sendResult.provider,
    ticket: updatedTicket,
  });
});

/**
 * Inbound email & webhook endpoints
 * Handles POST /api/emails/inbound, POST /api/webhooks/mailgun, POST /api/webhooks/email, etc.
 */
emailsRouter.post('/mailgun', upload.any(), verifyWebhookSecret, handleInboundEmail);
emailsRouter.post('/inbound', upload.any(), verifyWebhookSecret, handleInboundEmail);
emailsRouter.post('/email', upload.any(), verifyWebhookSecret, handleInboundEmail);
emailsRouter.post('/webhook', upload.any(), verifyWebhookSecret, handleInboundEmail);
emailsRouter.post('/', upload.any(), verifyWebhookSecret, handleInboundEmail);

export default emailsRouter;

