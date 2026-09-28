import { Router, Request, Response } from 'express';
import multer from 'multer';
import { ingestInboundEmail } from '../services/email-ingestion';
import { verifyWebhookSecret } from '../middleware/webhook-auth';
import { requireAuth, requireRole } from '../middleware/auth';
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
 * Inbound email & webhook endpoints
 * Handles POST /api/emails/inbound, POST /api/webhooks/mailgun, POST /api/webhooks/email, etc.
 */
emailsRouter.post('/mailgun', upload.any(), verifyWebhookSecret, handleInboundEmail);
emailsRouter.post('/inbound', upload.any(), verifyWebhookSecret, handleInboundEmail);
emailsRouter.post('/email', upload.any(), verifyWebhookSecret, handleInboundEmail);
emailsRouter.post('/webhook', upload.any(), verifyWebhookSecret, handleInboundEmail);
emailsRouter.post('/', upload.any(), verifyWebhookSecret, handleInboundEmail);

export default emailsRouter;
