import { Router, Request, Response } from 'express';
import { ingestInboundEmail } from '../services/email-ingestion';
import { verifyWebhookSecret } from '../middleware/webhook-auth';
import { requireAuth, requireRole } from '../middleware/auth';
import type { Role } from '@helpdesk/core';
import { prisma } from '../db';

const emailsRouter = Router();

/**
 * GET /api/emails/support-address (or /api/webhooks/support-address)
 * Returns configured system support address information
 */
emailsRouter.get('/support-address', (req: Request, res: Response) => {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com';
  const apiBaseUrl = process.env.API_BASE_URL || process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
  res.json({
    supportEmail,
    apiBaseUrl,
    inboundWebhookUrl: '/api/webhooks/email',
    inboundDirectUrl: '/api/emails/inbound',
    fullInboundWebhookUrl: `${apiBaseUrl}/api/webhooks/email`,
    fullInboundDirectUrl: `${apiBaseUrl}/api/emails/inbound`,
    threadingFormat: '[Ticket #XXXX]',
    antiLoopProtection: 'enabled',
    secretAuthRequired: Boolean(process.env.WEBHOOK_SECRET && process.env.WEBHOOK_SECRET.trim().length > 0),
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
  const result = await ingestInboundEmail(req.body);

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
 * Handles POST /api/emails/inbound, POST /api/webhooks/email, etc.
 */
emailsRouter.post('/inbound', verifyWebhookSecret, handleInboundEmail);
emailsRouter.post('/email', verifyWebhookSecret, handleInboundEmail);
emailsRouter.post('/webhook', verifyWebhookSecret, handleInboundEmail);
emailsRouter.post('/', verifyWebhookSecret, handleInboundEmail);

export default emailsRouter;
