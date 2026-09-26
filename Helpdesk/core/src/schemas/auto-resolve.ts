import { z } from 'zod';
import { Category, Priority, TicketStatus } from '../enums';

/**
 * Zod validation schema for evaluating a single inquiry against auto-resolution rules
 */
export const evaluateInquirySchema = z.object({
  subject: z
    .string({ message: 'Subject is required.' })
    .trim()
    .min(1, 'Subject cannot be empty.')
    .max(255, 'Subject cannot exceed 255 characters.'),
  body: z
    .string({ message: 'Message body is required.' })
    .trim()
    .min(1, 'Message body cannot be empty.')
    .max(10000, 'Message body cannot exceed 10000 characters.'),
  studentName: z.string().trim().max(100).optional(),
  studentEmail: z.string().trim().email('Valid student email is required.').optional(),
});

export type EvaluateInquiryInput = z.input<typeof evaluateInquirySchema>;
export type EvaluateInquiryOutput = z.output<typeof evaluateInquirySchema>;

/**
 * Zod validation schema for triggering auto-resolve on a specific ticket
 */
export const autoResolveTicketSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  force: z.boolean().optional().default(false),
  sendReply: z.boolean().optional().default(true),
  customAnswer: z.string().trim().max(10000).optional(),
});

export type AutoResolveTicketInput = z.input<typeof autoResolveTicketSchema>;
export type AutoResolveTicketOutput = z.output<typeof autoResolveTicketSchema>;

/**
 * Zod validation schema for batch auto-resolving multiple tickets
 */
export const batchAutoResolveSchema = z.object({
  ticketIds: z.array(z.number().int().positive()).optional(),
  statusFilter: z.enum(['NEW', 'OPEN', 'ALL']).optional().default('NEW'),
  category: z.enum(['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST']).optional(),
  dryRun: z.boolean().optional().default(false),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

export type BatchAutoResolveInput = z.input<typeof batchAutoResolveSchema>;
export type BatchAutoResolveOutput = z.output<typeof batchAutoResolveSchema>;

/**
 * Result structure of evaluating an inquiry for auto-resolution
 */
export interface AutoResolveEvaluationResult {
  canAutoResolve: boolean;
  autoResolveReason: string;
  matchedSection?: string;
  resolutionAnswer?: string;
  category: Category;
  priority: Priority;
  summary: string;
  confidence: number;
  isEscalated: boolean;
  escalationReason?: string;
}

/**
 * Result structure after attempting to auto-resolve a ticket
 */
export interface AutoResolveTicketResult {
  ticketId: number;
  success: boolean;
  autoResolved: boolean;
  status: TicketStatus;
  previousStatus: TicketStatus;
  reason: string;
  matchedSection?: string;
  resolutionAnswer?: string;
  category?: Category | null;
  priority?: Priority;
  dryRun: boolean;
  messageAdded: boolean;
}

/**
 * Aggregated result structure of a batch auto-resolution run
 */
export interface BatchAutoResolveResult {
  totalProcessed: number;
  autoResolvedCount: number;
  escalatedCount: number;
  skippedCount: number;
  dryRun: boolean;
  results: AutoResolveTicketResult[];
}

/**
 * Real-time metrics and analytics for auto-resolution
 */
export interface AutoResolveStats {
  totalTickets: number;
  autoResolvedTickets: number;
  openTickets: number;
  resolvedTickets: number;
  autoResolveRate: number;
  categoryBreakdown: Record<string, number>;
  topMatchedSections: { section: string; count: number }[];
}

/**
 * Metadata descriptor for an auto-resolution rule / Knowledge Base section
 */
export interface AutoResolveRuleInfo {
  id: string;
  section: number;
  title: string;
  category: Category;
  priority: Priority;
  description: string;
  isEscalationRule?: boolean;
}
