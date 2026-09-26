import fs from 'fs';
import path from 'path';

export interface EscalationResult {
  isEscalated: boolean;
  reason?: string;
}

let cachedKnowledgeBase: string | null = null;

/**
 * Reads and caches the official support knowledge base markdown document from disk.
 */
export function loadKnowledgeBaseContent(): string {
  if (cachedKnowledgeBase) {
    return cachedKnowledgeBase;
  }

  const possiblePaths = [
    path.join(__dirname, '../knowledge-base.md'),
    path.join(__dirname, '../../knowledge-base.md'),
    path.join(process.cwd(), 'server/knowledge-base.md'),
    path.join(process.cwd(), 'Helpdesk/server/knowledge-base.md'),
    path.join(process.cwd(), 'knowledge-base.md'),
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      try {
        cachedKnowledgeBase = fs.readFileSync(filePath, 'utf-8');
        return cachedKnowledgeBase;
      } catch (err) {
        console.warn(`[KnowledgeBase] Failed to read ${filePath}:`, err);
      }
    }
  }

  return '';
}

/**
 * Evaluates whether an incoming ticket inquiry triggers internal escalation policies
 * as defined in Section 10 of the knowledge base.
 */
export function checkEscalationTriggers(content: string): EscalationResult {
  const lower = content.toLowerCase();

  // 1. Legal action threats
  const legalKeywords = ['lawyer', 'attorney', 'legal action', 'sue', 'lawsuit', 'court', 'litigation'];
  if (legalKeywords.some((kw) => lower.includes(kw))) {
    return {
      isEscalated: true,
      reason: 'User mentioned or threatened legal action (Escalation Rule #1)',
    };
  }

  // 2. Refund requests outside the 30-day window
  const isRefundInquiry = lower.includes('refund') || lower.includes('money back') || lower.includes('money-back') || lower.includes('return');
  const hasOutOfWindowTiming =
    lower.includes('outside 30') ||
    lower.includes('past 30') ||
    lower.includes('after 30') ||
    lower.includes('more than 30') ||
    lower.includes('over 30') ||
    lower.includes('month') ||
    lower.includes('60 day') ||
    lower.includes('90 day') ||
    lower.includes('last year') ||
    lower.includes('years ago');

  if (isRefundInquiry && hasOutOfWindowTiming) {
    return {
      isEscalated: true,
      reason: 'Refund requested outside the standard 30-day guarantee window (Escalation Rule #2)',
    };
  }

  // 3. Chargeback or dispute threats
  const chargebackKeywords = ['chargeback', 'dispute charge', 'disputing charge', 'bank dispute', 'fraudulent charge', 'credit card dispute'];
  if (chargebackKeywords.some((kw) => lower.includes(kw))) {
    return {
      isEscalated: true,
      reason: 'User mentioned a chargeback or payment dispute (Escalation Rule #3)',
    };
  }

  // 4. Account security concerns
  const securityKeywords = ['hacked', 'compromised', 'unauthorized access', 'security breach', 'stolen account', 'someone logged into my'];
  if (securityKeywords.some((kw) => lower.includes(kw))) {
    return {
      isEscalated: true,
      reason: 'Issue involves account security or compromised credentials (Escalation Rule #4)',
    };
  }

  return { isEscalated: false };
}
