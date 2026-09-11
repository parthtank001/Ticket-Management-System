import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import { requireAuth } from './middleware/auth';
import { prisma, checkDatabaseConnection } from './db';
import { apiLimiter, authLimiter, ticketCreationLimiter, isProductionEnvironment } from './middleware/rate-limiter';
import usersRouter from './routes/users';
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

// Get all tickets (Authenticated support staff only)
app.get('/api/tickets', requireAuth, async (req: Request, res: Response) => {
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
    orderBy: { createdAt: 'desc' },
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
  const trimmedSubject = subject;
  const trimmedMessage = message;

  // Generate AI draft response based on category & subject
  let aiDraftResponse = `Hello ${studentName?.trim() || 'Student'},\n\nThank you for reaching out to Helpdesk Support. We have received your inquiry regarding "${trimmedSubject}". An agent will review your request shortly.\n\nBest regards,\nHelpdesk AI Support`;

  if (category === 'TECHNICAL_QUESTION') {
    aiDraftResponse = `Hello ${studentName?.trim() || 'Student'},\n\nRegarding your technical issue "${trimmedSubject}": Please try clearing your browser cache, re-authenticating, or verifying your system configuration. Our technical support team is inspecting the logs for your account.\n\nBest regards,\nHelpdesk Technical Team`;
  } else if (category === 'REFUND_REQUEST') {
    aiDraftResponse = `Hello ${studentName?.trim() || 'Student'},\n\nThank you for submitting a refund inquiry for "${trimmedSubject}". Refund requests are processed within 3-5 business days. Please verify your invoice number for speedier processing.\n\nBest regards,\nBilling Support Team`;
  }

  // Create Ticket and initial TicketMessage transaction
  const ticket = await prisma.ticket.create({
    data: {
      subject: trimmedSubject,
      studentEmail: trimmedEmail,
      studentName: studentName ? studentName.trim() : trimmedEmail.split('@')[0],
      category: category || 'GENERAL_QUESTION',
      priority: priority || 'MEDIUM',
      status: 'NEW',
      aiDraftResponse,
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
  const id = req.params.id as string;

  const validationResult = updateTicketSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const { status, assignedAgentId } = validationResult.data;

  const existingTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!existingTicket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const dataToUpdate: any = {};
  if (status) dataToUpdate.status = status;
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
  const id = req.params.id as string;

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

  // Optionally update ticket status to IN_PROGRESS or ASSIGNED if it was NEW
  if (existingTicket.status === 'NEW') {
    await prisma.ticket.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });
  }

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
