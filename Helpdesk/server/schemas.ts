import { z } from 'zod';
import {
  createUserSchema,
  updateUserSchema,
  CreateUserInput,
  CreateUserOutput,
  UpdateUserInput,
  UpdateUserOutput,
} from '@helpdesk/core';

export {
  createUserSchema,
  updateUserSchema,
  CreateUserInput,
  CreateUserOutput,
  UpdateUserInput,
  UpdateUserOutput,
};

/**
 * Zod validation schemas for Helpdesk REST API request payloads
 */

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
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateTicketMessageInput = z.infer<typeof createTicketMessageSchema>;
