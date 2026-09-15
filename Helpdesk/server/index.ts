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
} from './schemas';

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

// Get all tickets with server-side sorting (Authenticated support staff only)
app.get('/api/tickets', requireAuth, async (req: Request, res: Response) => {
  const { sortBy, sortOrder } = req.query;

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

  const tickets = await prisma.ticket.findMany({
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

  const { studentName, studentEmail, subject, category, priority, message } = validationResult.data;

  const trimmedEmail = studentEmail.toLowerCase();
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();
  const trimmedName = studentName.trim();

  const selectedCategory = category !== undefined ? category : null;
  const selectedPriority = priority || 'MEDIUM';

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

  const { status, category, priority, assignedAgentId } = validationResult.data;

  const existingTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!existingTicket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const dataToUpdate: any = {};
  if (status) dataToUpdate.status = status;
  if (category !== undefined) dataToUpdate.category = category;
  if (priority !== undefined) dataToUpdate.priority = priority;
  if (assignedAgentId !== undefined) dataToUpdate.assignedAgentId = assignedAgentId || null;

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

  const { body, isInternalNote } = validationResult.data;

  const existingTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!existingTicket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  // Securely derive sender email and role from verified authenticated session
  const senderEmail = req.user?.email || 'agent@example.com';
  const senderType = 'AGENT';

  const newMessage = await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      senderType,
      senderEmail,
      body,
      isInternalNote: Boolean(isInternalNote),
    },
  });

  res.status(201).json(newMessage);
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
