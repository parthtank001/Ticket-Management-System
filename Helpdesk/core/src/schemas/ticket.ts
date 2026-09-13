import { z } from 'zod';
import { Role, Category, Priority, TicketStatus, SenderType } from '../enums';

export interface TicketAgent {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TicketMessage {
  id: string;
  ticketId: number;
  senderType: SenderType;
  senderEmail: string;
  body: string;
  isInternalNote: boolean;
  messageId?: string | null;
  inReplyTo?: string | null;
  createdAt: string | Date;
}

export interface Ticket {
  id: number;
  ticketNumber?: number;
  subject: string;
  studentName: string;
  studentEmail: string;
  category: Category | null;
  priority: Priority;
  status: TicketStatus;
  summary: string | null;
  aiDraftResponse: string | null;
  assignedAgentId: string | null;
  assignedAgent?: TicketAgent | null;
  messages: TicketMessage[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Zod validation schema for creating a new ticket (REST API or Manual form)
 */
export const createTicketSchema = z.object({
  studentName: z
    .string({ message: 'Sender name is required.' })
    .trim()
    .min(1, 'Sender name cannot be empty.'),
  studentEmail: z
    .string({ message: 'Student email is required.' })
    .trim()
    .min(1, 'Student email cannot be empty.')
    .email('A valid student email address is required.'),
  subject: z
    .string({ message: 'Subject is required.' })
    .trim()
    .min(1, 'Subject cannot be empty.'),
  category: z
    .enum(['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST'])
    .optional(),
  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .optional()
    .default('MEDIUM'),
  message: z
    .string({ message: 'Message body is required.' })
    .trim()
    .min(1, 'Message body cannot be empty.'),
});

/**
 * Zod validation schema for updating an existing ticket
 */
export const updateTicketSchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED', 'CLOSED']).optional(),
  category: z.enum(['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST']).nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedAgentId: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  aiDraftResponse: z.string().nullable().optional(),
});

/**
 * Zod validation schema for adding a message reply / internal note
 */
export const createTicketMessageSchema = z.object({
  body: z
    .string({ message: 'Message body is required.' })
    .trim()
    .min(1, 'Message body is required.'),
  isInternalNote: z.boolean().optional().default(false),
  messageId: z.string().optional(),
  inReplyTo: z.string().optional(),
});

/**
 * Zod validation schema for inbound email webhook payload (standard JSON format)
 */
export const inboundEmailSchema = z.object({
  from: z
    .string({ message: 'Sender "from" address is required.' })
    .trim()
    .min(1, 'Sender "from" address cannot be empty.'),
  to: z.string().trim().optional(),
  recipient: z.string().trim().optional(),
  subject: z
    .string({ message: 'Email subject is required.' })
    .trim()
    .min(1, 'Email subject cannot be empty.'),
  body: z.string().optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  messageId: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.union([z.string(), z.array(z.string())]).optional(),
  headers: z.record(z.string(), z.any()).optional(),
  autoSubmitted: z.string().optional(),
}).refine(
  (data) => Boolean((data.body && data.body.trim()) || (data.text && data.text.trim()) || (data.html && data.html.trim())),
  {
    message: 'Email body or text content is required.',
    path: ['body'],
  }
);

export type CreateTicketInput = z.input<typeof createTicketSchema>;
export type CreateTicketOutput = z.output<typeof createTicketSchema>;
export type UpdateTicketInput = z.input<typeof updateTicketSchema>;
export type UpdateTicketOutput = z.output<typeof updateTicketSchema>;
export type CreateTicketMessageInput = z.input<typeof createTicketMessageSchema>;
export type CreateTicketMessageOutput = z.output<typeof createTicketMessageSchema>;
export type InboundEmailInput = z.input<typeof inboundEmailSchema>;
export type InboundEmailOutput = z.output<typeof inboundEmailSchema>;
