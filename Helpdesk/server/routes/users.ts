import { Router, Request, Response } from 'express';
import { hashPassword } from 'better-auth/crypto';
import { requireAuth, requireRole } from '../middleware/auth';
import type { Role } from '../types';
import { prisma } from '../db';
import { createUserSchema, updateUserSchema } from '../schemas';

const router = Router();

const userSelect = {
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
} as const;

/**
 * GET /api/users
 * List all users for Admin directory with optional search, role, and status filters (Admin only)
 */
router.get('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  const { search, role, status } = req.query;

  const where: any = {
    deletedAt: null,
  };

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
    select: userSelect,
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

/**
 * POST /api/users
 * Create a new user account (Admin only)
 */
router.post('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  const validationResult = createUserSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const { name, email, password, role, isActive } = validationResult.data;
  const normalizedEmail = email.toLowerCase();

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
        name,
        email: normalizedEmail,
        role,
        emailVerified: true,
        isActive,
      },
      select: userSelect,
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
});

/**
 * PATCH /api/users/:id
 * Update user details, role, status, or password (Admin only)
 */
router.patch('/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const validationResult = updateUserSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: validationResult.error.issues[0].message });
  }

  const { name, email, role, isActive, password } = validationResult.data;

  const existingUser = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existingUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Check email uniqueness if email is updated
  if (email !== undefined) {
    const normalizedEmail = email.toLowerCase();
    if (normalizedEmail !== existingUser.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (emailConflict && emailConflict.id !== id) {
        return res.status(409).json({ error: 'A user with this email address already exists.' });
      }
    }
  }

  // Safety checks: Prevent admin from deactivating or demoting themselves
  if (req.user?.id === id) {
    if (isActive === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own administrator account.' });
    }
    if (role && role !== 'ADMIN') {
      return res.status(400).json({ error: 'You cannot revoke your own administrator privileges.' });
    }
  }

  if (password !== undefined) {
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
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email: email.toLowerCase() } : {}),
      ...(role !== undefined ? { role: role as Role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    select: userSelect,
  });

  res.json(updatedUser);
});

/**
 * DELETE /api/users/:id
 * Delete user account with soft deletion (Admin only)
 */
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (req.user?.id === id) {
    return res.status(400).json({ error: 'You cannot delete your own administrator account.' });
  }

  const existingUser = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existingUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Administrator accounts cannot be deleted
  if (existingUser.role === 'ADMIN') {
    return res.status(400).json({ error: 'Administrator accounts cannot be deleted.' });
  }

  // Execute atomically in a transaction:
  // 1. Unassign tickets assigned to this agent before deletion
  // 2. Revoke all active sessions for this user immediately
  // 3. Soft delete user record by updating deletedAt timestamp and setting isActive to false
  await prisma.$transaction(async (tx) => {
    await tx.ticket.updateMany({
      where: { assignedAgentId: id },
      data: { assignedAgentId: null },
    });

    await tx.session.deleteMany({
      where: { userId: id },
    });

    await tx.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  });

  res.json({ message: 'User deleted successfully', id });
});

export default router;
