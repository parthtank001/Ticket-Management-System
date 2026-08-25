import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import { requireAuth } from './middleware/auth';
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

// List Agents for ticket assignment
app.get('/api/agents', async (req: Request, res: Response) => {
  try {
    const agents = await prisma.user.findMany({
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

// Get all tickets
app.get('/api/tickets', async (req: Request, res: Response) => {
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

// Create a new ticket
app.post('/api/tickets', async (req: Request, res: Response) => {
  try {
    const { studentName, studentEmail, subject, category, priority, message } = req.body;

    if (!studentEmail || !subject || !message) {
      return res.status(400).json({ error: 'Student email, subject, and initial message are required.' });
    }

    // Generate AI draft response based on category & subject
    let aiDraftResponse = `Hello ${studentName || 'Student'},\n\nThank you for reaching out to Helpdesk Support. We have received your inquiry regarding "${subject}". An agent will review your request shortly.\n\nBest regards,\nHelpdesk AI Support`;
    
    if (category === 'TECHNICAL_QUESTION') {
      aiDraftResponse = `Hello ${studentName || 'Student'},\n\nRegarding your technical issue "${subject}": Please try clearing your browser cache, re-authenticating, or verifying your system configuration. Our technical support team is inspecting the logs for your account.\n\nBest regards,\nHelpdesk Technical Team`;
    } else if (category === 'REFUND_REQUEST') {
      aiDraftResponse = `Hello ${studentName || 'Student'},\n\nThank you for submitting a refund inquiry for "${subject}". Refund requests are processed within 3-5 business days. Please verify your invoice number for speedier processing.\n\nBest regards,\nBilling Support Team`;
    }

    // Create Ticket and initial TicketMessage transaction
    const ticket = await prisma.ticket.create({
      data: {
        subject,
        studentEmail,
        studentName: studentName || studentEmail.split('@')[0],
        category: category || 'GENERAL_QUESTION',
        priority: priority || 'MEDIUM',
        status: 'NEW',
        aiDraftResponse,
        messages: {
          create: {
            senderType: 'STUDENT',
            senderEmail: studentEmail,
            body: message,
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

// Update ticket status or assigned agent
app.patch('/api/tickets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assignedAgentId } = req.body;

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

// Add message reply to ticket
app.post('/api/tickets/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { body, senderType, senderEmail, isInternalNote } = req.body;

    if (!body || !senderEmail) {
      return res.status(400).json({ error: 'Message body and sender email are required.' });
    }

    const newMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderType: senderType || 'AGENT',
        senderEmail,
        body,
        isInternalNote: !!isInternalNote,
      },
    });

    // Optionally update ticket status to IN_PROGRESS or ASSIGNED if it was NEW
    const currentTicket = await prisma.ticket.findUnique({ where: { id } });
    if (currentTicket && currentTicket.status === 'NEW') {
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
