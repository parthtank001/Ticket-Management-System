import { prisma } from '../db';
import {
  Category,
  Priority,
  TicketStatus,
  AutoResolveEvaluationResult,
  AutoResolveTicketResult,
  BatchAutoResolveResult,
  AutoResolveStats,
  AutoResolveRuleInfo,
  AutoResolveTicketInput,
  BatchAutoResolveInput,
} from '@helpdesk/core';
import { extractFirstName, getAiAgentUser } from './ai';
import { checkEscalationTriggers, EscalationResult } from './escalation-policy';
import { evaluateKnowledgeBaseMatch } from './knowledge-base-matcher';

export const AUTO_RESOLVE_RULES: AutoResolveRuleInfo[] = [
  {
    id: 'kb-sec-1-password',
    section: 1,
    title: 'Account & Login: Password Reset',
    category: 'TECHNICAL_QUESTION',
    priority: 'MEDIUM',
    description: 'Automated guidance for self-service password reset and troubleshooting missing reset emails.',
  },
  {
    id: 'kb-sec-2-transfer',
    section: 2,
    title: 'Course Access: Non-Transferable Policy',
    category: 'GENERAL_QUESTION',
    priority: 'LOW',
    description: 'Clarifies that courses are non-transferable and provides account email update instructions.',
  },
  {
    id: 'kb-sec-2-missing',
    section: 2,
    title: 'Course Access: Missing Purchased Course',
    category: 'GENERAL_QUESTION',
    priority: 'MEDIUM',
    description: 'Troubleshooting steps for newly purchased courses not appearing on the student dashboard.',
  },
  {
    id: 'kb-sec-3-lifetime',
    section: 3,
    title: 'Lifetime Access Policy',
    category: 'GENERAL_QUESTION',
    priority: 'LOW',
    description: 'Explains permanent access terms, one-time payment structure, and future course update eligibility.',
  },
  {
    id: 'kb-sec-4-refund',
    section: 4,
    title: 'Standard Refund Policy (< 30 Days)',
    category: 'REFUND_REQUEST',
    priority: 'MEDIUM',
    description: 'Provides 30-day money-back guarantee terms, course progress rules (<80%), and refund submission steps.',
  },
  {
    id: 'kb-sec-5-certificates',
    section: 5,
    title: 'Certificates of Completion',
    category: 'GENERAL_QUESTION',
    priority: 'LOW',
    description: 'Explains certificate generation upon 100% course completion and dashboard download access.',
  },
  {
    id: 'kb-sec-6-downloads',
    section: 6,
    title: 'Content & Video Downloading Policy',
    category: 'GENERAL_QUESTION',
    priority: 'LOW',
    description: 'Explains online video streaming terms and downloadable project source code availability.',
  },
  {
    id: 'kb-sec-7-video-playback',
    section: 7,
    title: 'Technical Issues: Video Playback & Buffering',
    category: 'TECHNICAL_QUESTION',
    priority: 'MEDIUM',
    description: 'Step-by-step browser cache clearing, extension troubleshooting, and video player support.',
  },
  {
    id: 'kb-sec-8-coupons',
    section: 8,
    title: 'Coupon & Promo Code Troubleshooting',
    category: 'GENERAL_QUESTION',
    priority: 'LOW',
    description: 'Guidance on coupon expiration, single-use limits, and per-order discount rules.',
  },
  {
    id: 'kb-sec-9-email-change',
    section: 9,
    title: 'Account Settings: Email Address Update',
    category: 'GENERAL_QUESTION',
    priority: 'MEDIUM',
    description: 'Instructions and verification requirements for updating account registration emails.',
  },
  {
    id: 'kb-sec-10-escalation-legal',
    section: 10,
    title: 'Escalation Guardrail: Legal Threats',
    category: 'GENERAL_QUESTION',
    priority: 'URGENT',
    description: 'Strictly blocks auto-resolution and escalates legal or litigation inquiries to senior staff.',
    isEscalationRule: true,
  },
  {
    id: 'kb-sec-10-escalation-refund-window',
    section: 10,
    title: 'Escalation Guardrail: Expired Refund Window (> 30 Days)',
    category: 'REFUND_REQUEST',
    priority: 'HIGH',
    description: 'Strictly blocks auto-resolution for refund claims outside the 30-day guarantee period.',
    isEscalationRule: true,
  },
  {
    id: 'kb-sec-10-escalation-chargeback',
    section: 10,
    title: 'Escalation Guardrail: Payment Disputes & Chargebacks',
    category: 'REFUND_REQUEST',
    priority: 'URGENT',
    description: 'Strictly blocks auto-resolution and routes chargeback/bank dispute threats to management.',
    isEscalationRule: true,
  },
  {
    id: 'kb-sec-10-escalation-security',
    section: 10,
    title: 'Escalation Guardrail: Account Security & Compromised Credentials',
    category: 'TECHNICAL_QUESTION',
    priority: 'URGENT',
    description: 'Strictly blocks auto-resolution for reported unauthorized access or compromised accounts.',
    isEscalationRule: true,
  },
];

/**
 * Evaluates an incoming inquiry against the official Knowledge Base and Escalation rules.
 * Computes match confidence, detected section, resolution answer, and category/priority.
 */
export function evaluateInquiryForAutoResolve(params: {
  subject: string;
  body: string;
  studentName?: string;
  studentEmail?: string;
}): AutoResolveEvaluationResult {
  const { subject, body, studentName } = params;
  const content = `${subject} ${body}`.toLowerCase();

  // 1. Check escalation triggers first
  const escalation: EscalationResult = checkEscalationTriggers(content);
  if (escalation.isEscalated) {
    let category: Category = 'GENERAL_QUESTION';
    if (content.includes('refund') || content.includes('charge') || content.includes('billing')) {
      category = 'REFUND_REQUEST';
    } else if (content.includes('hacked') || content.includes('security') || content.includes('access')) {
      category = 'TECHNICAL_QUESTION';
    }

    return {
      canAutoResolve: false,
      autoResolveReason: escalation.reason || 'Triggered internal escalation guardrail',
      matchedSection: 'Section 10: Escalation Rules (Human Agent Review Required)',
      category,
      priority: 'HIGH',
      summary: `- Ticket inquiry: "${subject.trim()}"\n- Escalated for human review: ${escalation.reason}`,
      confidence: 0.0,
      isEscalated: true,
      escalationReason: escalation.reason,
    };
  }

  // 2. Evaluate Knowledge Base rules
  const kbMatch = evaluateKnowledgeBaseMatch(subject, body, studentName);

  if (kbMatch.canAutoResolve && kbMatch.resolutionAnswer) {
    const matchedSection = kbMatch.autoResolveReason || 'Knowledge Base Policy';
    return {
      canAutoResolve: true,
      autoResolveReason: kbMatch.autoResolveReason || 'Inquiry resolved by Knowledge Base policy',
      matchedSection,
      resolutionAnswer: kbMatch.resolutionAnswer,
      category: kbMatch.category,
      priority: kbMatch.priority,
      summary: kbMatch.summary,
      confidence: 0.95,
      isEscalated: false,
    };
  }

  return {
    canAutoResolve: false,
    autoResolveReason: kbMatch.autoResolveReason || 'Inquiry requires human agent assistance',
    category: kbMatch.category,
    priority: kbMatch.priority,
    summary: kbMatch.summary,
    confidence: 0.2,
    isEscalated: false,
  };
}

/**
 * Attempts to auto-resolve a single ticket by its database ID.
 * Evaluates ticket content, handles status transition to RESOLVED (or keeps OPEN),
 * appends official resolution reply, and returns the result.
 */
export async function autoResolveSingleTicket(
  ticketId: number,
  options?: AutoResolveTicketInput
): Promise<AutoResolveTicketResult> {
  const dryRun = Boolean(options?.dryRun);
  const force = Boolean(options?.force);
  const sendReply = options?.sendReply !== false;
  const customAnswer = options?.customAnswer;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    return {
      ticketId,
      success: false,
      autoResolved: false,
      status: 'OPEN',
      previousStatus: 'OPEN',
      reason: `Ticket #${ticketId} does not exist in the database.`,
      dryRun,
      messageAdded: false,
    };
  }

  const previousStatus = ticket.status as TicketStatus;

  // Evaluate inquiry against auto-resolve rules
  const evaluation = evaluateInquiryForAutoResolve({
    subject: ticket.subject,
    body: ticket.body,
    studentName: ticket.studentName,
    studentEmail: ticket.studentEmail,
  });

  const shouldResolve = evaluation.canAutoResolve || (force && customAnswer);

  if (shouldResolve) {
    const resolutionText = customAnswer || evaluation.resolutionAnswer || ticket.aiDraftResponse || 'Issue resolved per support policy.';
    const resolutionNotice = `\n\n--- [Auto-Resolution Reply from Code with Mosh Support (support@example.com)] ---\n${resolutionText}`;

    if (!dryRun) {
      const updatedBody = sendReply
        ? ticket.body
          ? `${ticket.body}${resolutionNotice}`
          : resolutionText
        : ticket.body;

      const aiAgent = await getAiAgentUser();
      let assignedAgentId = ticket.assignedAgentId;
      if (aiAgent && (!ticket.assignedAgentId || ticket.assignedAgentId === aiAgent.id)) {
        assignedAgentId = aiAgent.id;
      }

      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'RESOLVED',
          category: ticket.category || evaluation.category,
          priority: evaluation.priority,
          summary: evaluation.summary,
          body: updatedBody,
          assignedAgentId,
        },
      });

      try {
        await prisma.webhookLog.create({
          data: {
            source: 'auto_resolve_module',
            payload: JSON.stringify({ ticketId, matchedSection: evaluation.matchedSection, reason: evaluation.autoResolveReason }),
            status: 'resolved',
            ticketId,
            reason: evaluation.autoResolveReason || 'Auto-resolved via Knowledge Base',
          },
        });
      } catch (logErr) {
        console.warn(`[Auto-Resolve Log Warning for #${ticketId}]:`, logErr);
      }
    }

    return {
      ticketId,
      success: true,
      autoResolved: true,
      status: 'RESOLVED',
      previousStatus,
      reason: evaluation.autoResolveReason,
      matchedSection: evaluation.matchedSection,
      resolutionAnswer: resolutionText,
      category: ticket.category || evaluation.category,
      priority: evaluation.priority,
      dryRun,
      messageAdded: sendReply,
    };
  }

  // If ticket cannot be auto-resolved, transition NEW or PROCESSING tickets to OPEN for staff review
  // and unassign from AI agent if currently assigned to AI
  if (!dryRun) {
    const aiAgent = await getAiAgentUser();
    const shouldUnassign = aiAgent && ticket.assignedAgentId === aiAgent.id;

    if (previousStatus === 'NEW' || previousStatus === 'PROCESSING' || shouldUnassign) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: previousStatus === 'NEW' || previousStatus === 'PROCESSING' ? 'OPEN' : previousStatus,
          category: ticket.category || evaluation.category,
          priority: evaluation.priority,
          summary: evaluation.summary,
          ...(shouldUnassign ? { assignedAgentId: null } : {}),
        },
      });
    }
  }

  return {
    ticketId,
    success: true,
    autoResolved: false,
    status: previousStatus === 'NEW' || previousStatus === 'PROCESSING' ? (dryRun ? previousStatus : 'OPEN') : previousStatus,
    previousStatus,
    reason: evaluation.isEscalated
      ? `Escalated: ${evaluation.escalationReason}`
      : evaluation.autoResolveReason,
    matchedSection: evaluation.matchedSection,
    category: ticket.category || evaluation.category,
    priority: evaluation.priority,
    dryRun,
    messageAdded: false,
  };
}

/**
 * Batch evaluates and auto-resolves tickets in the queue matching specified filters.
 */
export async function batchAutoResolveTickets(
  options?: BatchAutoResolveInput
): Promise<BatchAutoResolveResult> {
  const statusFilter = options?.statusFilter || 'NEW';
  const categoryFilter = options?.category;
  const rawLimit = typeof options?.limit === 'number' ? options.limit : Number(options?.limit) || 50;
  const limit = Math.max(1, Math.min(100, rawLimit));
  const dryRun = Boolean(options?.dryRun);

  const where: any = {};

  if (options?.ticketIds && options.ticketIds.length > 0) {
    where.id = { in: options.ticketIds };
  } else {
    if (statusFilter === 'NEW') {
      where.status = 'NEW';
    } else if (statusFilter === 'OPEN') {
      where.status = 'OPEN';
    } else if (statusFilter === 'ALL') {
      where.status = { in: ['NEW', 'OPEN'] };
    }

    if (categoryFilter) {
      where.category = categoryFilter;
    }
  }

  const tickets = await prisma.ticket.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  const results: AutoResolveTicketResult[] = [];
  let autoResolvedCount = 0;
  let escalatedCount = 0;
  let skippedCount = 0;

  for (const t of tickets) {
    const res = await autoResolveSingleTicket(t.id, { dryRun });
    results.push(res);

    if (res.autoResolved) {
      autoResolvedCount++;
    } else if (res.reason.toLowerCase().includes('escalat')) {
      escalatedCount++;
    } else {
      skippedCount++;
    }
  }

  return {
    totalProcessed: tickets.length,
    autoResolvedCount,
    escalatedCount,
    skippedCount,
    dryRun,
    results,
  };
}

/**
 * Gathers aggregate metrics on ticket auto-resolution.
 */
export async function getAutoResolveMetrics(): Promise<AutoResolveStats> {
  const [totalTickets, resolvedTickets, openTickets, ticketsWithBodies] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: 'RESOLVED' } }),
    prisma.ticket.count({ where: { status: 'OPEN' } }),
    prisma.ticket.findMany({
      where: {
        status: 'RESOLVED',
      },
      select: {
        id: true,
        category: true,
        body: true,
        summary: true,
      },
    }),
  ]);

  // Count tickets resolved with auto-resolution marker or summary
  let autoResolvedTickets = 0;
  const categoryBreakdown: Record<string, number> = {
    GENERAL_QUESTION: 0,
    TECHNICAL_QUESTION: 0,
    REFUND_REQUEST: 0,
  };
  const sectionCounts: Record<string, number> = {};

  for (const t of ticketsWithBodies) {
    const isAutoRes =
      (t.body && t.body.includes('[Auto-Resolution Reply from Code with Mosh Support')) ||
      (t.summary && t.summary.toLowerCase().includes('automated resolution provided'));

    if (isAutoRes) {
      autoResolvedTickets++;
      if (t.category && categoryBreakdown[t.category] !== undefined) {
        categoryBreakdown[t.category]++;
      }
    }
  }

  const topMatchedSections = Object.entries(sectionCounts)
    .map(([section, count]) => ({ section, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const autoResolveRate = totalTickets > 0 ? Math.round((autoResolvedTickets / totalTickets) * 1000) / 10 : 0;

  return {
    totalTickets,
    autoResolvedTickets,
    openTickets,
    resolvedTickets,
    autoResolveRate,
    categoryBreakdown,
    topMatchedSections,
  };
}

/**
 * Returns available auto-resolution rules and policies.
 */
export function getAvailableAutoResolveRules(): AutoResolveRuleInfo[] {
  return AUTO_RESOLVE_RULES;
}
