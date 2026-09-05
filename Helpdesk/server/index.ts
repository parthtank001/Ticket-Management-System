import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { hashPassword } from 'better-auth/crypto';
import { auth } from './auth';
import { requireAuth, requireRole } from './middleware/auth';
import { Role } from './types';
import { prisma, checkDatabaseConnection } from './db';
import { apiLimiter, authLimiter, ticketCreationLimiter, isProductionEnvironment } from './middleware/rate-limiter';

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
app.all('/api/auth/*', authLimiter, toNodeHandler(auth));

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

// List all users for Admin directory with optional search & filter (Admin only)
app.get('/api/users', requireAuth, requireRole(Role.ADMIN), async (req: Request, res: Response) => {
  try {
    const { search, role, status } = req.query;

    const where: any = {};

    if (search && typeof search === 'string' && search.trim()) {
      const query = search.trim();
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (role && (role === 'ADMIN' || role === 'AGENT')) {
      where.role = role as Role;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error: any) {
    console.error('Error fetching users list:', error);
    res.status(500).json({ error: 'Failed to fetch users directory' });
  }
});

// Create new user (Admin only)
app.post('/api/users', requireAuth, requireRole(Role.ADMIN), async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, isActive } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long.' });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const assignedRole = role === 'ADMIN' ? Role.ADMIN : Role.AGENT;
    const accountActive = isActive !== undefined ? Boolean(isActive) : true;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email address already exists.' });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          role: assignedRole,
          emailVerified: true,
          isActive: accountActive,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              tickets: true,
            },
          },
        },
      });

      await tx.account.create({
        data: {
          userId: createdUser.id,
          accountId: createdUser.id,
          providerId: 'credential',
          password: hashedPassword,
          issuer: 'local:credential',
        },
      });

      return createdUser;
    });

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

// Update user details, role, status or password (Admin only)
app.patch('/api/users/:id', requireAuth, requireRole(Role.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, isActive, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Safety checks: Prevent admin from deactivating or demoting themselves
    if (req.user?.id === id) {
      if (isActive === false) {
        return res.status(400).json({ error: 'You cannot deactivate your own administrator account.' });
      }
      if (role && role !== Role.ADMIN) {
        return res.status(400).json({ error: 'You cannot revoke your own administrator privileges.' });
      }
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters long.' });
      }
    }

    if (role !== undefined && role !== Role.ADMIN && role !== Role.AGENT) {
      return res.status(400).json({ error: 'Invalid role specified. Must be ADMIN or AGENT.' });
    }

    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }
      const hashedPassword = await hashPassword(password);
      const existingAccount = await prisma.account.findFirst({
        where: { userId: id, providerId: 'credential' },
      });

      if (existingAccount) {
        await prisma.account.update({
          where: { id: existingAccount.id },
          data: { password: hashedPassword, updatedAt: new Date() },
        });
      } else {
        await prisma.account.create({
          data: {
            userId: id,
            accountId: id,
            providerId: 'credential',
            password: hashedPassword,
            issuer: 'local:credential',
          },
        });
      }
    }

    // If deactivated, revoke active sessions immediately
    if (isActive === false) {
      await prisma.session.deleteMany({
        where: { userId: id },
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(role !== undefined ? { role: role as Role } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user account' });
  }
});

// Delete user (Admin only)
app.delete('/api/users/:id', requireAuth, requireRole(Role.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own administrator account.' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Unassign tickets assigned to this agent before deletion
    await prisma.ticket.updateMany({
      where: { assignedAgentId: id },
      data: { assignedAgentId: null },
    });

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user account' });
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
app.post('/api/tickets', ticketCreationLimiter, async (req: Request, res: Response) => {
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
