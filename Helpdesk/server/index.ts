import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import { requireAuth } from './middleware/auth';
import { prisma, checkDatabaseConnection } from './db';
import { apiLimiter, authLimiter, ticketCreationLimiter, isProductionEnvironment } from './middleware/rate-limiter';
import usersRouter from './routes/users';
import emailsRouter from './routes/emails';
import type { Category, Priority, TicketStatus, SenderType } from '@helpdesk/core';
import {
  createTicketSchema,
  updateTicketSchema,
  createTicketMessageSchema,
  polishReplySchema,
} from './schemas';
import { polishReplyWithAi } from './services/ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy in production (e.g. Nginx, Load Balancers) for accurate client IP identification
if (isProductionEnvironment()) {
  app.set('trust proxy', 1);
}

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

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

// Get all tickets with server-side sorting, filtering & optional pagination (Authenticated support staff only)
app.get('/api/tickets', requireAuth, async (req: Request, res: Response) => {
  const { sortBy, sortOrder, search, status, category, priority, assignedAgentId, assignedToId, page, limit, pageSize } = req.query;

  const where: any = {};

  if (status && typeof status === 'string' && status !== 'ALL') {
    where.status = status;
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
          messages: {
            orderBy: { createdAt: 'asc' },
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
      messages: {
        orderBy: { createdAt: 'asc' },
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
  }

  // Create Ticket and initial TicketMessage transaction (plain ticket without AI processing)
  const ticket = await prisma.ticket.create({
    data: {
      subject: trimmedSubject,
      studentEmail: trimmedEmail,
      studentName: trimmedName,
      category: selectedCategory,
      priority: selectedPriority,
      status: 'OPEN',
      summary: null,
      aiDraftResponse: null,
      assignedAgentId: finalAssignedAgentId,
      messages: {
        create: {
          senderType: 'STUDENT',
          senderEmail: trimmedEmail,
          body: trimmedMessage,
        },
      },
    },
    include: {
      assignedAgent: true,
      messages: true,
    },
  });

  res.status(201).json(ticket);
});

// Get a single ticket by ID with messages and assigned agent (Authenticated support staff only)
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
      messages: {
        orderBy: { createdAt: 'asc' },
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

  const { status, category, priority, assignedAgentId, assignedToId } = validationResult.data;

  const existingTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!existingTicket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const dataToUpdate: any = {};
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
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  res.json(updatedTicket);
});

// Add message reply to ticket (Authenticated support staff only - identity derived from session)
app.post('/api/tickets/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  const validationResult = createTicketMessageSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const { body, bodyHtml, isInternalNote, senderType, senderEmail: customSenderEmail } = validationResult.data;

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

  const newMessage = await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      senderType: finalSenderType,
      senderEmail: finalSenderEmail,
      body,
      bodyHtml: bodyHtml ?? null,
      isInternalNote: finalSenderType === 'AGENT' ? Boolean(isInternalNote) : false,
    },
  });

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
    const polishedReply = await polishReplyWithAi({
      replyText: text,
      studentName,
      category,
    });

    res.json({
      polishedReply,
      originalText: text,
    });
  } catch (err: any) {
    console.error('Error polishing reply with AI:', err);
    res.status(500).json({ error: err.message || 'Failed to polish reply' });
  }
});

// Centralized Error Handling Middleware (Express 5 automatically forwards async promise rejections here)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`🚀 Express server running at http://localhost:${PORT}`);
});
