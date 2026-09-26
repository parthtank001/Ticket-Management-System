import { z } from 'zod';
import { Category, Priority } from '../enums';

/**
 * Zod validation schema for evaluating classification on an arbitrary text inquiry
 */
export const evaluateClassificationSchema = z.object({
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

export type EvaluateClassificationInput = z.input<typeof evaluateClassificationSchema>;
export type EvaluateClassificationOutput = z.output<typeof evaluateClassificationSchema>;

/**
 * Zod validation schema for classifying a single ticket
 */
export const classifyTicketSchema = z.object({
  force: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(false),
  async: z.boolean().optional().default(false),
  customPrompt: z.string().trim().max(500).optional(),
});

export type ClassifyTicketInput = z.input<typeof classifyTicketSchema>;
export type ClassifyTicketOutput = z.output<typeof classifyTicketSchema>;

/**
 * Zod validation schema for batch classifying tickets
 */
export const batchClassifySchema = z.object({
  ticketIds: z.array(z.number().int().positive()).optional(),
  statusFilter: z.enum(['NEW', 'OPEN', 'ALL', 'UNCLASSIFIED']).optional().default('NEW'),
  force: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(false),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

export type BatchClassifyInput = z.input<typeof batchClassifySchema>;
export type BatchClassifyOutput = z.output<typeof batchClassifySchema>;

/**
 * Result structure of evaluating classification on an inquiry
 */
export interface TicketClassificationResult {
  category: Category;
  priority: Priority;
  summary: string;
  aiDraftResponse: string;
  confidence: number;
  reasoning: string;
  tags: string[];
  isEscalated: boolean;
  escalationReason?: string;
  canAutoResolve?: boolean;
  autoResolveReason?: string;
  resolutionAnswer?: string;
}

/**
 * Result structure after classifying a single ticket
 */
export interface ClassifyTicketResult {
  ticketId: number;
  success: boolean;
  previousCategory?: Category | null;
  category: Category;
  previousPriority?: Priority;
  priority: Priority;
  summary: string;
  aiDraftResponse: string;
  confidence: number;
  reasoning: string;
  tags: string[];
  dryRun: boolean;
  updated: boolean;
}

/**
 * Result structure of a batch classification run
 */
export interface BatchClassifyResult {
  totalProcessed: number;
  classifiedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  dryRun: boolean;
  results: ClassifyTicketResult[];
}

/**
 * Real-time statistics and metrics on ticket classification
 */
export interface ClassificationStats {
  totalTickets: number;
  classifiedTickets: number;
  unclassifiedTickets: number;
  classificationRate: number;
  categoryBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  averageConfidence: number;
}

/**
 * Metadata descriptor for a classification category
 */
export interface ClassificationCategoryInfo {
  id: string;
  category: Category;
  title: string;
  description: string;
  keywords: string[];
  defaultPriority: Priority;
  examples: string[];
}
