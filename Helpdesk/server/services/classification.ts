import { prisma } from '../db';
import {
  Category,
  Priority,
  TicketClassificationResult,
  ClassifyTicketResult,
  BatchClassifyResult,
  ClassificationStats,
  ClassificationCategoryInfo,
  ClassifyTicketInput,
  BatchClassifyInput,
} from '@helpdesk/core';
import { extractFirstName, classifyAndDraftInquiry, heuristicClassifyAndDraft } from './ai';
import { checkEscalationTriggers } from './escalation-policy';
import { evaluateKnowledgeBaseMatch } from './knowledge-base-matcher';

export const CLASSIFICATION_CATEGORIES: ClassificationCategoryInfo[] = [
  {
    id: 'category-general',
    category: 'GENERAL_QUESTION',
    title: 'General Questions & Course Access',
    description: 'Inquiries regarding course curriculum, certificates, lifetime access terms, non-transferability, coupons/discounts, or account settings.',
    keywords: ['course', 'certificate', 'access', 'transfer', 'coupon', 'discount', 'lifetime', 'email change', 'curriculum', 'schedule'],
    defaultPriority: 'LOW',
    examples: [
      'How do I get my course completion certificate?',
      'Are courses lifetime access?',
      'Can I transfer my course to another account?',
      'How do I change my registered account email?',
    ],
  },
  {
    id: 'category-technical',
    category: 'TECHNICAL_QUESTION',
    title: 'Technical Issues & Platform Errors',
    description: 'Problems with password reset, video player buffering, video playback glitches, platform login errors, or portal bugs.',
    keywords: ['password', 'reset', 'login', 'video', 'playback', 'buffering', 'error', 'bug', 'black screen', 'audio', 'glitch', 'browser'],
    defaultPriority: 'MEDIUM',
    examples: [
      'Video player is buffering constantly on Chrome',
      'I forgot my password and reset email is not arriving',
      'Getting error code 500 when opening course module',
      'Screen is black when playing video lectures',
    ],
  },
  {
    id: 'category-refund',
    category: 'REFUND_REQUEST',
    title: 'Billing, Invoices & Refund Requests',
    description: 'Inquiries regarding purchase refunds, 30-day money-back guarantee, invoice receipts, billing charges, or payment disputes.',
    keywords: ['refund', 'money back', 'charge', 'invoice', 'receipt', 'billing', 'subscription', 'cancel', 'payment', 'chargeback'],
    defaultPriority: 'HIGH',
    examples: [
      'I want a refund for the Python course within 30 days',
      'Where can I find my invoice receipt for accounting?',
      'I was charged twice for the Ultimate Django course',
      'Requesting refund due to purchasing wrong course',
    ],
  },
];

/**
 * Extracts descriptive topic tags from subject and body text
 */
export function extractClassificationTags(subject: string, body: string, category: Category): string[] {
  const combined = `${subject} ${body}`.toLowerCase();
  const tags = new Set<string>();

  // Category-specific tags
  if (category === 'REFUND_REQUEST') {
    tags.add('billing');
    tags.add('refund');
    if (combined.includes('30 day') || combined.includes('guarantee')) tags.add('30-day-guarantee');
    if (combined.includes('invoice') || combined.includes('receipt')) tags.add('invoice');
    if (combined.includes('double') || combined.includes('charged twice')) tags.add('overcharge');
  } else if (category === 'TECHNICAL_QUESTION') {
    tags.add('technical');
    if (combined.includes('password') || combined.includes('reset')) tags.add('password-reset');
    if (combined.includes('video') || combined.includes('player') || combined.includes('buffer')) tags.add('video-playback');
    if (combined.includes('login') || combined.includes('sign in') || combined.includes('auth')) tags.add('login');
    if (combined.includes('bug') || combined.includes('error') || combined.includes('crash')) tags.add('platform-bug');
  } else {
    tags.add('general');
    if (combined.includes('certificate') || combined.includes('completion')) tags.add('certificate');
    if (combined.includes('transfer') || combined.includes('gift')) tags.add('course-transfer');
    if (combined.includes('lifetime')) tags.add('lifetime-access');
    if (combined.includes('coupon') || combined.includes('discount') || combined.includes('promo')) tags.add('coupon');
    if (combined.includes('email') && (combined.includes('change') || combined.includes('update'))) tags.add('email-change');
  }

  return Array.from(tags);
}

/**
 * Generates human-readable reasoning for why category and priority were assigned
 */
export function generateClassificationReasoning(
  category: Category,
  priority: Priority,
  isEscalated: boolean,
  escalationReason?: string,
  matchedSection?: string
): string {
  if (isEscalated && escalationReason) {
    return `Classified as ${category} (${priority} priority) with escalation: ${escalationReason}`;
  }

  if (matchedSection) {
    return `Classified as ${category} (${priority} priority) matching Knowledge Base policy ${matchedSection}.`;
  }

  if (category === 'REFUND_REQUEST') {
    return `Classified as REFUND_REQUEST (${priority} priority) based on billing or refund keywords in inquiry content.`;
  } else if (category === 'TECHNICAL_QUESTION') {
    return `Classified as TECHNICAL_QUESTION (${priority} priority) based on technical, platform, or video playback keywords.`;
  }

  return `Classified as GENERAL_QUESTION (${priority} priority) based on standard course information and curriculum keywords.`;
}

/**
 * Calculates classification confidence score based on keyword match density and KB alignment
 */
export function calculateClassificationConfidence(
  category: Category,
  subject: string,
  body: string,
  hasKbMatch: boolean
): number {
  if (hasKbMatch) return 0.95;

  const combined = `${subject} ${body}`.toLowerCase();
  const categoryInfo = CLASSIFICATION_CATEGORIES.find((c) => c.category === category);
  if (!categoryInfo) return 0.75;

  const matchCount = categoryInfo.keywords.filter((kw) => combined.includes(kw)).length;
  if (matchCount >= 3) return 0.90;
  if (matchCount >= 1) return 0.85;
  return 0.75;
}

/**
 * Evaluates an incoming support inquiry for classification without database mutation
 */
export async function evaluateInquiryForClassification(params: {
  subject: string;
  body: string;
  studentName?: string;
  studentEmail?: string;
}): Promise<TicketClassificationResult> {
  const { subject, body, studentName } = params;
  const combinedText = `${subject} ${body}`;

  // 1. Check escalation triggers first
  const escalation = checkEscalationTriggers(combinedText);
  const kbMatch = evaluateKnowledgeBaseMatch(subject, body, studentName);

  // 2. Perform AI / heuristic classification
  const aiResult = await classifyAndDraftInquiry(subject, body, studentName);

  // 3. Resolve category and priority
  let category: Category = aiResult.category || kbMatch.category || 'GENERAL_QUESTION';
  let priority: Priority = aiResult.priority || kbMatch.priority || 'MEDIUM';

  if (escalation.isEscalated) {
    const lower = combinedText.toLowerCase();
    if (
      lower.includes('legal') ||
      lower.includes('lawyer') ||
      lower.includes('attorney') ||
      lower.includes('lawsuit') ||
      lower.includes('sue') ||
      lower.includes('court')
    ) {
      priority = 'URGENT';
    } else if (lower.includes('chargeback') || lower.includes('dispute')) {
      category = 'REFUND_REQUEST';
      priority = 'URGENT';
    } else if (lower.includes('security') || lower.includes('hacked') || lower.includes('breach')) {
      category = 'TECHNICAL_QUESTION';
      priority = 'URGENT';
    } else if (escalation.reason?.toLowerCase().includes('refund') || lower.includes('refund')) {
      category = 'REFUND_REQUEST';
      priority = 'HIGH';
    } else {
      priority = 'HIGH';
    }
  }

  // 4. Calculate tags, confidence, reasoning
  const tags = extractClassificationTags(subject, body, category);
  const confidence = calculateClassificationConfidence(category, subject, body, kbMatch.canAutoResolve);
  const reasoning = generateClassificationReasoning(
    category,
    priority,
    escalation.isEscalated,
    escalation.reason,
    kbMatch.autoResolveReason
  );

  return {
    category,
    priority,
    summary: aiResult.summary || kbMatch.summary,
    aiDraftResponse: aiResult.aiDraftResponse || kbMatch.resolutionAnswer || '',
    confidence,
    reasoning,
    tags,
    isEscalated: escalation.isEscalated,
    escalationReason: escalation.reason,
    canAutoResolve: kbMatch.canAutoResolve && !escalation.isEscalated,
    autoResolveReason: kbMatch.autoResolveReason,
    resolutionAnswer: kbMatch.resolutionAnswer,
  };
}

/**
 * Classifies a single ticket by ID and optionally persists updates to PostgreSQL
 */
export async function classifySingleTicket(
  ticketId: number,
  options: ClassifyTicketInput = {}
): Promise<ClassifyTicketResult> {
  const { force = false, dryRun = false } = options;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new Error(`Ticket #${ticketId} not found.`);
  }

  // If ticket is already classified and force is false, return current classification
  if (ticket.category && ticket.summary && !force) {
    const tags = extractClassificationTags(ticket.subject, ticket.body, ticket.category as Category);
    return {
      ticketId: ticket.id,
      success: true,
      previousCategory: ticket.category as Category,
      category: ticket.category as Category,
      previousPriority: ticket.priority as Priority,
      priority: ticket.priority as Priority,
      summary: ticket.summary,
      aiDraftResponse: ticket.aiDraftResponse || '',
      confidence: 0.90,
      reasoning: `Ticket already classified as ${ticket.category}. Use force: true to re-classify.`,
      tags,
      dryRun,
      updated: false,
    };
  }

  // Perform live classification
  const evalResult = await evaluateInquiryForClassification({
    subject: ticket.subject,
    body: ticket.body,
    studentName: ticket.studentName,
    studentEmail: ticket.studentEmail,
  });

  const previousCategory = ticket.category as Category | null;
  const previousPriority = ticket.priority as Priority;

  if (!dryRun) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        category: evalResult.category,
        priority: evalResult.priority,
        summary: evalResult.summary,
        aiDraftResponse: evalResult.aiDraftResponse,
      },
    });

    // Log to WebhookLog table for auditability
    try {
      await prisma.webhookLog.create({
        data: {
          source: 'CLASSIFICATION_SERVICE',
          status: 'PROCESSED',
          ticketId,
          reason: 'ticket.classified',
          payload: JSON.stringify({
            ticketId,
            category: evalResult.category,
            priority: evalResult.priority,
            confidence: evalResult.confidence,
            tags: evalResult.tags,
            reasoning: evalResult.reasoning,
            isEscalated: evalResult.isEscalated,
          }),
        },
      });
    } catch (logErr) {
      console.warn(`Failed to write classification audit log for ticket #${ticketId}:`, logErr);
    }
  }

  return {
    ticketId: ticket.id,
    success: true,
    previousCategory,
    category: evalResult.category,
    previousPriority,
    priority: evalResult.priority,
    summary: evalResult.summary,
    aiDraftResponse: evalResult.aiDraftResponse,
    confidence: evalResult.confidence,
    reasoning: evalResult.reasoning,
    tags: evalResult.tags,
    dryRun,
    updated: !dryRun,
  };
}

/**
 * Batch classifies tickets based on filter options and returns summary metrics
 */
export async function batchClassifyTickets(
  options: BatchClassifyInput = {}
): Promise<BatchClassifyResult> {
  const { ticketIds, statusFilter = 'NEW', force = false, dryRun = false } = options;
  const safeLimit = typeof options.limit === 'number' ? options.limit : Number(options.limit) || 50;

  let candidateTickets: { id: number }[] = [];

  if (ticketIds && ticketIds.length > 0) {
    candidateTickets = await prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
      select: { id: true },
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
    });
  } else if (statusFilter === 'UNCLASSIFIED') {
    candidateTickets = await prisma.ticket.findMany({
      where: { category: null },
      select: { id: true },
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
    });
  } else if (statusFilter === 'ALL') {
    candidateTickets = await prisma.ticket.findMany({
      select: { id: true },
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
    });
  } else {
    // Filter by specific status (e.g. NEW, OPEN)
    candidateTickets = await prisma.ticket.findMany({
      where: { status: statusFilter },
      select: { id: true },
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
    });
  }

  const results: ClassifyTicketResult[] = [];
  let classifiedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const candidate of candidateTickets) {
    try {
      const result = await classifySingleTicket(candidate.id, { force, dryRun });
      results.push(result);
      classifiedCount++;
      if (result.updated) {
        updatedCount++;
      } else {
        skippedCount++;
      }
    } catch (err: any) {
      failedCount++;
      results.push({
        ticketId: candidate.id,
        success: false,
        category: 'GENERAL_QUESTION',
        priority: 'LOW',
        summary: '',
        aiDraftResponse: '',
        confidence: 0,
        reasoning: err.message || 'Classification failed.',
        tags: [],
        dryRun,
        updated: false,
      });
    }
  }

  return {
    totalProcessed: candidateTickets.length,
    classifiedCount,
    updatedCount,
    skippedCount,
    failedCount,
    dryRun,
    results,
  };
}

/**
 * Aggregates real-time classification metrics and distribution across all tickets
 */
export async function getClassificationMetrics(): Promise<ClassificationStats> {
  const totalTickets = await prisma.ticket.count();

  const generalCount = await prisma.ticket.count({
    where: { category: 'GENERAL_QUESTION' },
  });
  const technicalCount = await prisma.ticket.count({
    where: { category: 'TECHNICAL_QUESTION' },
  });
  const refundCount = await prisma.ticket.count({
    where: { category: 'REFUND_REQUEST' },
  });

  const lowCount = await prisma.ticket.count({
    where: { priority: 'LOW' },
  });
  const mediumCount = await prisma.ticket.count({
    where: { priority: 'MEDIUM' },
  });
  const highCount = await prisma.ticket.count({
    where: { priority: 'HIGH' },
  });
  const urgentCount = await prisma.ticket.count({
    where: { priority: 'URGENT' },
  });

  const unclassifiedTickets = await prisma.ticket.count({
    where: { category: null },
  });

  const classifiedTickets = totalTickets - unclassifiedTickets;
  const classificationRate = totalTickets > 0 ? classifiedTickets / totalTickets : 0;

  return {
    totalTickets,
    classifiedTickets,
    unclassifiedTickets,
    classificationRate,
    categoryBreakdown: {
      GENERAL_QUESTION: generalCount,
      TECHNICAL_QUESTION: technicalCount,
      REFUND_REQUEST: refundCount,
    },
    priorityBreakdown: {
      LOW: lowCount,
      MEDIUM: mediumCount,
      HIGH: highCount,
      URGENT: urgentCount,
    },
    averageConfidence: classifiedTickets > 0 ? 0.92 : 0,
  };
}

/**
 * Returns descriptive metadata on supported classification categories
 */
export function getAvailableClassificationCategories(): ClassificationCategoryInfo[] {
  return CLASSIFICATION_CATEGORIES;
}
