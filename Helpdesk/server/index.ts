import './instrument';
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Sentry, isSentryEnabled, flushSentry } from './instrument';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import { requireAuth } from './middleware/auth';
import { prisma, checkDatabaseConnection } from './db';
import { apiLimiter, authLimiter, ticketCreationLimiter, isProductionEnvironment } from './middleware/rate-limiter';
import usersRouter from './routes/users';
import emailsRouter from './routes/emails';
import autoResolveRouter from './routes/auto-resolve';
import classificationRouter from './routes/classification';
import dashboardRouter from './routes/dashboard';
import path from 'path';
import fs from 'fs';
import { seedDatabase } from '../prisma/seed';
import { seedTickets } from '../scripts/seed-100-tickets';
import type { Category, Priority, TicketStatus, SenderType } from '@helpdesk/core';
import {
  createTicketSchema,
  updateTicketSchema,
  createTicketMessageSchema,
  polishReplySchema,
  autoResolveTicketSchema,
} from './schemas';
import {
  aiPolishReply,
  polishReplyWithAi,
  summarizeTicketAndHistory,
  classifyAndDraftInquiry,
  scheduleTicketClassification,
  getAiAgentUser,
} from './services/ai';
import {
  autoResolveSingleTicket,
} from './services/auto-resolve';
import { sendOutboundEmail } from './services/email-sender';
import { initQueue, stopQueue, isQueueReady, scheduleTicketAutoResolve, enqueueEmailSend } from './services/queue';
import { deployStoredFunctions } from './db/stored-procedures';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy in production (e.g. Render, Nginx, Load Balancers) for accurate client IP identification
if (isProductionEnvironment()) {
  app.set('trust proxy', 1);
}

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  ...(process.env.RENDER_EXTERNAL_URL ? [process.env.RENDER_EXTERNAL_URL.trim()] : []),
  ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL.trim()] : []),
  ...(process.env.TRUSTED_ORIGIN ? process.env.TRUSTED_ORIGIN.split(',').map((o) => o.trim()) : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl, mobile, server-side tests) or trusted origins
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('CORS request blocked'));
      }
    },
    credentials: true,
  })
);

// Apply rate limiting (enforced only in production environment)
app.use('/api/', apiLimiter);

// Mount Better Auth router before standard body parsing middleware (with auth rate limiting)
app.all('/api/auth/*splat', authLimiter, toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck API endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();

  res.json({
    status: 'online',
    message: 'Express Helpdesk API is operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      database: dbStatus.connected ? 'connected' : `disconnected (${dbStatus.message})`,
      jobQueue: isQueueReady() ? 'connected (pg-boss)' : 'fallback (event-loop)',
      aiEngine: 'ready',
    }
  });
});

// Authenticated user profile
app.get('/api/me', requireAuth, (req: Request, res: Response) => {
  res.json({
    message: 'Authenticated user profile retrieved',
    user: req.user,
    session: req.session,
  });
});

// Mount User Management Routes
app.use('/api/users', usersRouter);

// Mount Inbound Email & Webhook Routes
app.use('/api/emails', emailsRouter);
app.use('/api/webhooks', emailsRouter);

// Mount Auto-Resolution Routes
app.use('/api/auto-resolve', autoResolveRouter);

// Mount Classification Routes
app.use('/api/classify', classificationRouter);
app.use('/api/classification', classificationRouter);

// Mount Dashboard Analytics & Metrics Routes
app.use('/api/dashboard', dashboardRouter);

app.get(['/debug-sentry', '/api/debug-sentry'], async (req: Request, res: Response) => {
  const error = new Error('Sentry error for testing purposes');
  console.error('[Debug Sentry] Triggered test exception:', error.message);

  let eventId = 'sentry-not-configured';
  if (isSentryEnabled) {
    eventId = Sentry.captureException(error, {
      tags: { testEvent: 'true', platform: 'express' },
      extra: { path: req.path, timestamp: new Date().toISOString() },
    });
    console.log(`[Debug Sentry] Captured Event ID: ${eventId}`);
    await flushSentry(2000);
  }

  res.status(500).json({
    error: error.message,
    eventId,
    sentryEnabled: isSentryEnabled,
    instructions: isSentryEnabled
      ? 'Event was dispatched and flushed to Sentry.io. Search for this Event ID in your Sentry Issues.'
      : 'Sentry DSN is not configured or disabled. Check SENTRY_DSN in .env',
  });
});


// List Active Agents for ticket assignment (Authenticated agents & admins)
app.get('/api/agents', requireAuth, async (req: Request, res: Response) => {
  const agents = await prisma.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: 'asc' },
  });
  res.json(agents);
});

// Seed Sample Tickets Endpoint (Authenticated admin/agent)
app.post('/api/tickets/seed', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('🌱 Triggered manual ticket seeding via API...');
    await seedTickets(prisma);
    const count = await prisma.ticket.count();
    res.json({ message: 'Successfully seeded 100 realistic tickets', totalTickets: count });
  } catch (err: any) {
    console.error('Error seeding tickets via API:', err);
    res.status(500).json({ error: err.message || 'Failed to seed tickets' });
  }
});

// Get all tickets with server-side sorting, filtering & optional pagination (Authenticated support staff only)
app.get('/api/tickets', requireAuth, async (req: Request, res: Response) => {
  const { sortBy, sortOrder, search, status, category, priority, assignedAgentId, assignedToId, page, limit, pageSize } = req.query;

  const where: any = {};

  if (status && typeof status === 'string' && status !== 'ALL') {
    where.status = status;
  } else {
    // Hide tickets currently being processed or resolved by AI (NEW, PROCESSING) from the human agent ticket list
    where.status = { notIn: ['NEW', 'PROCESSING'] };
  }

  if (category && typeof category === 'string' && category !== 'ALL') {
    if (category === 'UNCATEGORIZED' || category === 'NONE') {
      where.category = null;
    } else {
      where.category = category;
    }
  }

  if (priority && typeof priority === 'string' && priority !== 'ALL') {
    where.priority = priority;
  }

  const filterAssignedId = (assignedAgentId as string) || (assignedToId as string);
  if (filterAssignedId && typeof filterAssignedId === 'string' && filterAssignedId !== 'ALL') {
    if (filterAssignedId === 'UNASSIGNED' || filterAssignedId === 'NONE') {
      where.assignedAgentId = null;
    } else {
      where.assignedAgentId = filterAssignedId;
    }
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    const searchTerm = search.trim();
    const cleanId = searchTerm.replace(/^#/, '');
    const numericId = parseInt(cleanId, 10);

    where.OR = [
      { subject: { contains: searchTerm, mode: 'insensitive' } },
      { studentName: { contains: searchTerm, mode: 'insensitive' } },
      { studentEmail: { contains: searchTerm, mode: 'insensitive' } },
      ...(!isNaN(numericId) && numericId > 0 && String(numericId) === cleanId ? [{ id: numericId }] : []),
    ];
  }

  let orderBy: any = { createdAt: 'desc' };

  if (sortBy && typeof sortBy === 'string') {
    const rawField = sortBy.trim();
    const order: 'asc' | 'desc' =
      typeof sortOrder === 'string' && sortOrder.toLowerCase() === 'asc'
        ? 'asc'
        : 'desc';

    switch (rawField) {
      case 'id':
      case 'ticket':
        orderBy = { id: order };
        break;
      case 'subject':
        orderBy = { subject: order };
        break;
      case 'studentName':
      case 'sender':
        orderBy = { studentName: order };
        break;
      case 'studentEmail':
        orderBy = { studentEmail: order };
        break;
      case 'category':
        orderBy = { category: order };
        break;
      case 'priority':
        orderBy = { priority: order };
        break;
      case 'status':
        orderBy = { status: order };
        break;
      case 'assignedAgent':
      case 'assignee':
        orderBy = { assignedAgent: { name: order } };
        break;
      case 'createdAt':
      case 'created':
        orderBy = { createdAt: order };
        break;
      case 'updatedAt':
        orderBy = { updatedAt: order };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }
  }

  const isPaginationRequested = page !== undefined || limit !== undefined || pageSize !== undefined;

  if (isPaginationRequested) {
    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const takeNum = Math.max(1, Math.min(100, parseInt(String(pageSize || limit || '15'), 10) || 15));
    const skipNum = (pageNum - 1) * takeNum;

    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: {
          assignedAgent: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy,
        skip: skipNum,
        take: takeNum,
      }),
    ]);

    const totalPages = Math.ceil(total / takeNum) || 1;

    res.setHeader('X-Total-Count', total.toString());
    res.setHeader('X-Page', pageNum.toString());
    res.setHeader('X-Total-Pages', totalPages.toString());

    return res.json({
      tickets,
      total,
      page: pageNum,
      pageSize: takeNum,
      totalPages,
    });
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      assignedAgent: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy,
  });
  res.json(tickets);
});

// Create a new ticket (Inbound student inquiry)
app.post('/api/tickets', ticketCreationLimiter, async (req: Request, res: Response) => {
  const validationResult = createTicketSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const { studentName, studentEmail, subject, category, priority, message, assignedAgentId, assignedToId } = validationResult.data;

  const trimmedEmail = studentEmail.toLowerCase();
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();
  const trimmedName = studentName.trim();

  const selectedCategory = category !== undefined ? category : null;
  const selectedPriority = priority || 'MEDIUM';

  const rawAssignedId = assignedAgentId !== undefined ? assignedAgentId : assignedToId;
  let finalAssignedAgentId: string | null = null;

  if (rawAssignedId !== undefined && rawAssignedId !== null && rawAssignedId !== '') {
    const assignedUser = await prisma.user.findFirst({
      where: {
        id: rawAssignedId,
        deletedAt: null,
      },
    });

    if (!assignedUser) {
      return res.status(400).json({ error: 'Assigned user does not exist or is invalid.' });
    }

    finalAssignedAgentId = assignedUser.id;
  } else {
    // Automatically assign newly arriving tickets to AI Agent for auto-resolution
    const aiAgent = await getAiAgentUser();
    if (aiAgent) {
      finalAssignedAgentId = aiAgent.id;
    }
  }

  // Create Ticket with body directly on Ticket table
  const ticket = await prisma.ticket.create({
    data: {
      subject: trimmedSubject,
      studentEmail: trimmedEmail,
      studentName: trimmedName,
      body: trimmedMessage,
      category: selectedCategory,
      priority: selectedPriority,
      status: 'NEW',
      summary: null,
      aiDraftResponse: null,
      assignedAgentId: finalAssignedAgentId,
    },
    include: {
      assignedAgent: true,
    },
  });

  // Non-blocking automatic GPT classification
  scheduleTicketClassification(ticket.id, {
    preserveCategoryIfSet: Boolean(selectedCategory),
    preservePriorityIfSet: Boolean(category !== undefined && priority !== undefined),
  });

  res.status(201).json(ticket);
});

// Get a single ticket by ID with assigned agent (Authenticated support staff only)
app.get('/api/tickets/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignedAgent: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  res.json(ticket);
});

// Update ticket status or assigned agent (Authenticated support staff only)
app.patch('/api/tickets/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  const validationResult = updateTicketSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const { body, status, category, priority, assignedAgentId, assignedToId } = validationResult.data;

  const existingTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!existingTicket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const dataToUpdate: any = {};
  if (body !== undefined) dataToUpdate.body = body;
  if (status) dataToUpdate.status = status;
  if (category !== undefined) dataToUpdate.category = category;
  if (priority !== undefined) dataToUpdate.priority = priority;

  const rawAssignedId = assignedAgentId !== undefined ? assignedAgentId : assignedToId;
  if (rawAssignedId !== undefined) {
    if (rawAssignedId === null || rawAssignedId === '') {
      dataToUpdate.assignedAgentId = null;
    } else {
      const assignedUser = await prisma.user.findFirst({
        where: {
          id: rawAssignedId,
          deletedAt: null,
        },
      });

      if (!assignedUser) {
        return res.status(400).json({ error: 'Assigned user does not exist or is invalid.' });
      }

      dataToUpdate.assignedAgentId = assignedUser.id;
    }
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: dataToUpdate,
    include: {
      assignedAgent: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  res.json(updatedTicket);
});

// Add message reply / append note to ticket
app.post('/api/tickets/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  const validationResult = createTicketMessageSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const {
    body,
    bodyHtml,
    isInternalNote,
    senderType,
    senderEmail: customSenderEmail,
    sendEmail = true,
    statusUpdate,
  } = validationResult.data;

  const existingTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!existingTicket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  // Derive senderType and senderEmail
  const finalSenderType = senderType || 'AGENT';
  let finalSenderEmail: string;

  if (finalSenderType === 'STUDENT') {
    finalSenderEmail = customSenderEmail || existingTicket.studentEmail;
  } else {
    finalSenderEmail = customSenderEmail || req.user?.email || 'agent@example.com';
  }

  const replyPrefix = isInternalNote ? '[INTERNAL NOTE]' : `[Reply from ${finalSenderType}]`;
  const appendedBody = existingTicket.body
    ? `${existingTicket.body}\n\n--- ${replyPrefix} (${finalSenderEmail}) ---\n${body}`
    : body;

  const ticketUpdateData: any = { body: appendedBody };
  if (statusUpdate) {
    ticketUpdateData.status = statusUpdate;
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: ticketUpdateData,
  });

  // If this is an agent reply (and NOT an internal note), send an email to the student via Mailgun / pg-boss queue
  let emailDispatched = false;
  let emailMessageId: string | null = null;
  let emailError: string | null = null;

  if (finalSenderType === 'AGENT' && !isInternalNote && existingTicket.studentEmail && sendEmail !== false) {
    const emailSubject = `[Ticket #${existingTicket.id}] Re: ${existingTicket.subject}`;
    try {
      if (req.query.async === 'true') {
        await enqueueEmailSend({
          options: {
            to: existingTicket.studentEmail,
            toName: existingTicket.studentName || undefined,
            subject: emailSubject,
            text: body,
            html: bodyHtml || undefined,
          },
          ticketId: existingTicket.id,
          userEmail: finalSenderEmail,
          userName: req.user?.name || 'Support Agent',
          skipBodyUpdate: true,
        });
        emailDispatched = true;
        console.info(`[Messages] Enqueued email reply for Ticket #${existingTicket.id} to ${existingTicket.studentEmail}`);
      } else {
        const sendResult = await sendOutboundEmail({
          to: existingTicket.studentEmail,
          toName: existingTicket.studentName || undefined,
          subject: emailSubject,
          text: body,
          html: bodyHtml || undefined,
          ticketId: existingTicket.id,
        });

        if (sendResult.success) {
          emailDispatched = true;
          emailMessageId = sendResult.messageId || null;

          await prisma.webhookLog.create({
            data: {
              source: 'mailgun_outbound',
              payload: JSON.stringify({
                to: existingTicket.studentEmail,
                toName: existingTicket.studentName,
                subject: emailSubject,
                messageId: sendResult.messageId,
                senderEmail: finalSenderEmail,
                senderName: req.user?.name || 'Support Agent',
              }),
              status: 'sent',
              ticketId: existingTicket.id,
            },
          });
          console.info(`[Messages] Sent outbound email reply for Ticket #${existingTicket.id} to ${existingTicket.studentEmail} (Message-ID: ${sendResult.messageId})`);
        } else {
          emailError = sendResult.error || 'Failed to dispatch outbound email';
          console.warn(`[Messages Warning] Could not dispatch email reply for Ticket #${existingTicket.id}:`, emailError);
        }
      }
    } catch (sendErr: any) {
      emailError = sendErr?.message || 'Failed to dispatch outbound email';
      console.warn(`[Messages Warning] Could not dispatch email reply for Ticket #${existingTicket.id}:`, emailError);
    }
  }

  const newMessage = {
    id: `msg-${Date.now()}`,
    ticketId: id,
    senderType: finalSenderType,
    senderEmail: finalSenderEmail,
    body,
    bodyHtml: bodyHtml ?? null,
    isInternalNote: finalSenderType === 'AGENT' ? Boolean(isInternalNote) : false,
    emailDispatched,
    emailMessageId,
    emailError,
    recipientEmail: existingTicket.studentEmail,
    ticket: updatedTicket,
    createdAt: new Date().toISOString(),
  };

  res.status(201).json(newMessage);
});

// Polish draft reply using Vercel AI SDK and gpt-5-nano (Authenticated support staff only)
app.post('/api/tickets/polish-reply', requireAuth, async (req: Request, res: Response) => {
  const validationResult = polishReplySchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const { text, studentName, category } = validationResult.data;

  try {
    const polishedReply = await aiPolishReply(
      text,
      studentName,
      category
    );

    res.json({
      polishedReply,
      originalText: text,
    });
  } catch (err: any) {
    console.error('Error polishing reply with AI:', err);
    res.status(500).json({ error: err.message || 'Failed to polish reply' });
  }
});

// Summarize ticket details and body using AI (Authenticated support staff only)
app.post('/api/tickets/:id/summarize', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  const existingTicket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignedAgent: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!existingTicket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const summary = await summarizeTicketAndHistory({
    id: existingTicket.id,
    subject: existingTicket.subject,
    studentName: existingTicket.studentName,
    studentEmail: existingTicket.studentEmail,
    category: existingTicket.category,
    priority: existingTicket.priority,
    status: existingTicket.status,
    createdAt: existingTicket.createdAt,
    body: existingTicket.body,
  });

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: { summary },
    include: {
      assignedAgent: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  res.json({
    summary,
    ticket: updatedTicket,
  });
});

// Classify ticket and generate draft response using GPT (Authenticated support staff only)
app.post('/api/tickets/:id/classify', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  const isAsync = req.query.async === 'true' || req.body?.async === true;

  if (isAsync) {
    scheduleTicketClassification(id);
    return res.json({
      message: 'Ticket classification queued in background',
      ticketId: id,
    });
  }

  const existingTicket = await prisma.ticket.findUnique({
    where: { id },
  });

  if (!existingTicket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const classification = await classifyAndDraftInquiry(
    existingTicket.subject,
    existingTicket.body,
    existingTicket.studentName
  );

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: {
      category: classification.category,
      priority: classification.priority,
      summary: classification.summary,
      aiDraftResponse: classification.aiDraftResponse,
    },
    include: {
      assignedAgent: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  res.json({
    classification,
    ticket: updatedTicket,
  });
});

// Auto-resolve ticket using Knowledge Base policies (Authenticated support staff only)
app.post('/api/tickets/:id/auto-resolve', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  const validationResult = autoResolveTicketSchema.safeParse(req.body || {});
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const isAsync = req.query.async === 'true' || req.body?.async === true;
  if (isAsync) {
    scheduleTicketAutoResolve(id, validationResult.data);
    return res.json({
      message: 'Ticket auto-resolution queued in background',
      ticketId: id,
    });
  }

  const result = await autoResolveSingleTicket(id, validationResult.data);
  if (!result.success && result.reason.includes('does not exist')) {
    return res.status(404).json({ error: result.reason });
  }

  res.json(result);
});

// Live Sentry Verification Endpoint
app.get('/api/test-sentry-error', async (req: Request, res: Response) => {
  try {
    throw new Error(`[Sentry Live Test] Server exception triggered at ${new Date().toISOString()}`);
  } catch (err: any) {
    const eventId = isSentryEnabled
      ? Sentry.captureException(err, {
          tags: { testEvent: 'true', platform: 'express-server' },
          extra: { triggerUrl: req.originalUrl, timestamp: new Date().toISOString() },
        })
      : 'sentry-not-configured';

    await flushSentry(2000);

    res.json({
      message: isSentryEnabled
        ? 'Live test error captured and dispatched to Sentry.io'
        : 'Sentry DSN is not configured. Set SENTRY_DSN in .env to stream errors to sentry.io.',
      eventId,
      sentryEnabled: isSentryEnabled,
      timestamp: new Date().toISOString(),
      instructions: isSentryEnabled
        ? 'Check your Sentry.io dashboard under Issues or search for this Event ID.'
        : 'Add your SENTRY_DSN to .env and restart the server to see live errors on sentry.io.',
    });
  }
});

// Locate and serve static client assets (production SPA build)
const possibleClientDistPaths = [
  path.resolve(__dirname, '../client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'Helpdesk/client/dist'),
];
const clientDistPath = possibleClientDistPaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  console.log(`📦 Serving static frontend assets from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // Single Page Application (SPA) fallback for client-side routing
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      const indexPath = path.join(clientDistPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    next();
  });
}

// Explicit 404 handler for unmatched API routes
app.all('/api/*splat', (req: Request, res: Response) => {
  res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
});

// Mount Sentry error handler before custom error middleware
Sentry.setupExpressErrorHandler(app);

// Centralized Error Handling Middleware (Express 5 automatically forwards async promise rejections here)
app.use(async (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  let eventId: string | undefined;
  if (status >= 500 && isSentryEnabled) {
    try {
      eventId = Sentry.captureException(err, {
        extra: { path: req.path, method: req.method },
      });
      await flushSentry(2000);
    } catch (sentryErr) {
      console.warn('Sentry error flush failed:', sentryErr);
    }
  }

  res.status(status).json({
    error: message,
    ...(eventId ? { sentryEventId: eventId } : {}),
  });
});

const server = app.listen(PORT, async () => {
  console.log(`🚀 Express server running at http://localhost:${PORT}`);
  await deployStoredFunctions();
  await initQueue();

  // Ensure default Admin, Agent, and AI Agent credentials are fully synced on startup
  try {
    await seedDatabase(prisma);
  } catch (seedErr: any) {
    console.warn('⚠️ Auto-seed credentials sync notice (continuing):', seedErr?.message || seedErr);
  }

  // Auto-seed demo tickets if database has 0 tickets
  try {
    const ticketCount = await prisma.ticket.count();
    if (ticketCount === 0) {
      console.log('🌱 No tickets found in database. Auto-seeding 100 demo tickets...');
      await seedTickets(prisma);
    }
  } catch (ticketSeedErr: any) {
    console.warn('⚠️ Auto-seed tickets notice (continuing):', ticketSeedErr?.message || ticketSeedErr);
  }
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  await stopQueue();
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

