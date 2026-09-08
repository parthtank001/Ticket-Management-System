import { z } from 'zod';
import { Role } from './types';

/**
 * Zod validation schemas for Helpdesk REST API request payloads
 */

// User Management Schemas
export const createUserSchema = z.object({
  name: z
    .string({ message: 'Name must be at least 3 characters long.' })
    .trim()
    .min(3, 'Name must be at least 3 characters long.'),
  email: z
    .string({ message: 'A valid email address is required.' })
    .trim()
    .email('A valid email address is required.'),
  password: z
    .string({ message: 'Password must be at least 8 characters long.' })
    .min(8, 'Password must be at least 8 characters long.'),
  role: z.nativeEnum(Role).optional().default(Role.AGENT),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters long.')
    .optional(),
  role: z
    .nativeEnum(Role, {
      message: 'Invalid role specified. Must be ADMIN or AGENT.',
    })
    .optional(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .optional(),
});

// Ticket Schemas
export const createTicketSchema = z.object({
  studentName: z.string().optional(),
  studentEmail: z
    .string({ message: 'Student email, subject, and message are required strings.' })
    .trim()
    .min(1, 'Student email, subject, and message cannot be empty.')
    .email('A valid student email address is required.'),
  subject: z
    .string({ message: 'Student email, subject, and message are required strings.' })
    .trim()
    .min(1, 'Student email, subject, and message cannot be empty.'),
  category: z
    .enum(['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST'] as const)
    .optional()
    .default('GENERAL_QUESTION'),
  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const)
    .optional()
    .default('MEDIUM'),
  message: z
    .string({ message: 'Student email, subject, and message are required strings.' })
    .trim()
    .min(1, 'Student email, subject, and message cannot be empty.'),
});

export const updateTicketSchema = z.object({
  status: z
    .enum(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_STUDENT', 'RESOLVED', 'CLOSED'] as const)
    .optional(),
  assignedAgentId: z.string().nullable().optional(),
});

// Ticket Message Schemas
export const createTicketMessageSchema = z.object({
  body: z
    .string({ message: 'Message body is required.' })
    .trim()
    .min(1, 'Message body is required.'),
  isInternalNote: z.boolean().optional().default(false),
});

// Inferred TypeScript Types
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateTicketMessageInput = z.infer<typeof createTicketMessageSchema>;
