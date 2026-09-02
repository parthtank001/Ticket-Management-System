import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import { requireAuth, requireRole } from './middleware/auth';
import { Role } from './types';
import { prisma, checkDatabaseConnection } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

// Mount Better Auth router before standard body parsing middleware
app.all('/api/auth/*', toNodeHandler(auth));

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

// List all users for Admin directory (Admin only)
app.get('/api/users', requireAuth, requireRole(Role.ADMIN), async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error: any) {
    console.error('Error fetching users list:', error);
    res.status(500).json({ error: 'Failed to fetch users directory' });
  }
});

// List Active Agents for ticket assignment (Authenticated agents & admins)
app.get('/api/agents', requireAuth, async (req: Request, res: Response) => {
  try {
    const agents = await prisma.user.findMany({
      where: {
        isActive: true,
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
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch agents list' });
  }
});

// Get all tickets (Authenticated support staff only)
app.get('/api/tickets', requireAuth, async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Create a new ticket (Inbound student inquiry)
app.post('/api/tickets', async (req: Request, res: Response) => {
  try {
    const { studentName, studentEmail, subject, category, priority, message } = req.body;

    if (!studentEmail || typeof studentEmail !== 'string' || !subject || typeof subject !== 'string' || !message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Student email, subject, and message are required strings.' });
    }

    const trimmedEmail = studentEmail.trim().toLowerCase();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedEmail || !trimmedSubject || !trimmedMessage) {
      return res.status(400).json({ error: 'Student email, subject, and message cannot be empty.' });
    }

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
        studentName: studentName ? String(studentName).trim() : trimmedEmail.split('@')[0],
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
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Update ticket status or assigned agent (Authenticated support staff only)
app.patch('/api/tickets/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assignedAgentId } = req.body;

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
  } catch (error: any) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Add message reply to ticket (Authenticated support staff only - identity derived from session)
app.post('/api/tickets/:id/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { body, isInternalNote } = req.body;

    if (!body || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: 'Message body is required.' });
    }

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
        body: body.trim(),
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
  } catch (error: any) {
    console.error('Error creating ticket message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Express server running at http://localhost:${PORT}`);
});
