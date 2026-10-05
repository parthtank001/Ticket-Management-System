import 'dotenv/config';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogle } from '@ai-sdk/google';
import { Category, Priority, heuristicPolishReply, extractFirstName, stripHeadersAndFooters } from '@helpdesk/core';
import { prisma } from '../db';
import { enqueueTicketClassification } from './queue';
import { loadKnowledgeBaseContent } from './escalation-policy';
import { evaluateKnowledgeBaseMatch } from './knowledge-base-matcher';
import { sendOutboundEmail } from './email-sender';

export interface AIClassificationResult {
  category: Category;
  priority: Priority;
  summary: string;
  aiDraftResponse: string;
  canAutoResolve?: boolean;
  autoResolveReason?: string;
  resolutionAnswer?: string;
  hasAiError?: boolean;
}

export { extractFirstName, stripHeadersAndFooters };

/**
 * Validates whether an API key string is non-empty and not a dummy placeholder.
 */
export function isNonEmptyApiKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  return (
    trimmed.length >= 10 &&
    trimmed !== '12345' &&
    trimmed !== 'test-openai-key' &&
    trimmed !== 'mock-openai-key' &&
    trimmed !== 'mock-gemini-key'
  );
}

export interface ActiveAiModelConfig {
  provider: 'gemini' | 'openai';
  model: any;
  modelName: string;
}

/**
 * Normalizes user-specified or environment Gemini model aliases to valid Gemini API model identifiers.
 */
export function normalizeGeminiModel(name?: string): string {
  if (!name) return 'gemini-3.5-flash-lite';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'gemini-pro' || lower === 'pro' || lower === 'gemini-1.5-pro' || lower === 'gemini-2.5-pro' || lower === 'gemini-pro-latest') {
    return 'gemini-3.1-pro-preview';
  }
  if (lower === 'gemini-flash' || lower === 'flash' || lower === 'gemini-1.5-flash' || lower === 'gemini-2.0-flash' || lower === 'gemini-2.5-flash' || lower === 'gemini-3.5-flash') {
    return 'gemini-3.5-flash-lite';
  }
  return trimmed;
}

/**
 * Returns the active language model instance based on environment variables.
 * Prefers Google Gemini if GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY is configured
 * or if AI_PROVIDER is set to "gemini". Otherwise falls back to OpenAI if OPENAI_API_KEY is configured.
 */
export function getActiveAiModel(defaultModelName?: string): ActiveAiModelConfig | null {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  const providerPref = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();

  // 1. If Gemini is explicitly preferred or if only Gemini key is valid
  if (
    (providerPref === 'gemini' || !isNonEmptyApiKey(openaiKey)) &&
    isNonEmptyApiKey(geminiKey)
  ) {
    const googleProvider = createGoogle({ apiKey: geminiKey!.trim() });
    const rawModelName = process.env.GEMINI_MODEL || defaultModelName || 'gemini-3.5-flash-lite';
    const modelName = normalizeGeminiModel(rawModelName);
    return {
      provider: 'gemini',
      model: googleProvider(modelName),
      modelName,
    };
  }

  // 2. OpenAI provider if preferred or if only OpenAI key is valid
  if (isNonEmptyApiKey(openaiKey)) {
    const openaiProvider = createOpenAI({ apiKey: openaiKey!.trim() });
    const modelName = process.env.OPENAI_MODEL || defaultModelName || 'gpt-4o-mini';
    return {
      provider: 'openai',
      model: openaiProvider(modelName),
      modelName,
    };
  }

  // 3. Fallback to Gemini if valid key exists
  if (isNonEmptyApiKey(geminiKey)) {
    const googleProvider = createGoogle({ apiKey: geminiKey!.trim() });
    const rawModelName = process.env.GEMINI_MODEL || defaultModelName || 'gemini-3.5-flash-lite';
    const modelName = normalizeGeminiModel(rawModelName);
    return {
      provider: 'gemini',
      model: googleProvider(modelName),
      modelName,
    };
  }

  return null;
}

/**
 * Heuristic fallback classifier and draft generator for offline or non-API key runs.
 * Evaluates the inquiry against the knowledge base and escalation rules.
 */
export function heuristicClassifyAndDraft(
  subject: string,
  body: string,
  studentName?: string
): AIClassificationResult {
  const firstName = extractFirstName(studentName);
  const kbMatch = evaluateKnowledgeBaseMatch(subject, body, studentName);

  let aiDraftResponse = kbMatch.resolutionAnswer;
  if (!aiDraftResponse) {
    if (kbMatch.category === 'TECHNICAL_QUESTION') {
      aiDraftResponse = `Hello ${firstName},\n\nThank you for reaching out to Code with Mosh Support.\n\nRegarding your technical issue "${subject.trim()}": Please try clearing your browser cache, re-authenticating, or verifying your network connection. Our support team is inspecting the logs for your account and will gladly assist if the issue persists.\n\nBest regards,\nCode with Mosh Support`;
    } else if (kbMatch.category === 'REFUND_REQUEST') {
      aiDraftResponse = `Hello ${firstName},\n\nThank you for reaching out to Code with Mosh Support.\n\nWe have received your refund inquiry for "${subject.trim()}". Refund requests under our 30-day guarantee are processed within 3–5 business days. Please verify your invoice or order receipt number so we can process this quickly for you.\n\nBest regards,\nCode with Mosh Support`;
    } else {
      aiDraftResponse = `Hello ${firstName},\n\nThank you for reaching out to Code with Mosh Support. We have received your inquiry regarding "${subject.trim()}". A support agent will review your request and get back to you shortly.\n\nBest regards,\nCode with Mosh Support`;
    }
  }

  return {
    category: kbMatch.category,
    priority: kbMatch.priority,
    summary: kbMatch.summary,
    aiDraftResponse,
    canAutoResolve: kbMatch.canAutoResolve,
    autoResolveReason: kbMatch.autoResolveReason,
    resolutionAnswer: kbMatch.resolutionAnswer,
  };
}

/**
 * Classifies an incoming inquiry and generates a summary & draft response using Google Gemini (or OpenAI fallback).
 * Falls back safely to rule-based heuristics if no API key is configured or on error.
 */
export async function classifyAndDraftInquiry(
  subject: string,
  body: string,
  studentName?: string
): Promise<AIClassificationResult> {
  const aiConfig = getActiveAiModel(process.env.AI_PROVIDER === 'gemini' ? 'gemini-3.5-flash-lite' : 'gpt-5-nano');

  // Fallback if no real API key configured or in test environments
  if (!aiConfig || process.env.NODE_ENV === 'test') {
    return heuristicClassifyAndDraft(subject, body, studentName);
  }

  const firstName = extractFirstName(studentName);

  try {
    const kbContent = loadKnowledgeBaseContent();

    const prompt = `You are an AI customer support triage and auto-resolution assistant for Code with Mosh Support.
Here is the official support Knowledge Base and Escalation Policy:
${kbContent}

Analyze the following student support inquiry and provide a JSON response:
1. "category": EXACTLY one of ["GENERAL_QUESTION", "TECHNICAL_QUESTION", "REFUND_REQUEST"]
2. "priority": EXACTLY one of ["LOW", "MEDIUM", "HIGH", "URGENT"]
3. "summary": 2-3 bullet points summarizing the student's problem
4. "aiDraftResponse": A professional, empathetic, and customer-friendly draft response addressed to the customer by ONLY their first name ("Hello ${firstName},"). Format clearly with clean paragraphs and lists, and sign off with "Best regards,\nCode with Mosh Support".
5. "canAutoResolve": boolean (true ONLY IF the inquiry is directly and clearly answerable using the Knowledge Base policies and does NOT trigger any Escalation Rules such as legal threats, chargebacks, refund requests outside the 30-day guarantee window, or account security concerns; otherwise false)
6. "autoResolveReason": string explaining why the inquiry can be auto-resolved or why it must be escalated to a human agent
7. "resolutionAnswer": string (if canAutoResolve is true, the complete, professional, customer-friendly, and properly formatted answer directly solving the student's issue based on the Knowledge Base, addressed to "Hello ${firstName}," with full steps, formatted paragraphs/bullet points, and signed with "Best regards,\nCode with Mosh Support"; if false, omit or set to null)

Customer First Name: ${firstName}
Subject: ${subject}
Message Body:
${body}

Respond ONLY with valid JSON in this exact structure:
{
  "category": "GENERAL_QUESTION" | "TECHNICAL_QUESTION" | "REFUND_REQUEST",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "summary": "string",
  "aiDraftResponse": "string",
  "canAutoResolve": boolean,
  "autoResolveReason": "string",
  "resolutionAnswer": "string" | null
}`;

    let responseText = '';
    try {
      const { text } = await generateText({
        model: aiConfig.model,
        prompt,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(4000),
      });
      responseText = text?.trim() || '';
    } catch (primaryErr: any) {
      // Fall through to heuristic parse
    }

    // Extract JSON block if enclosed in markdown backticks
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validCategories: Category[] = [
        'GENERAL_QUESTION',
        'TECHNICAL_QUESTION',
        'REFUND_REQUEST',
      ];
      const validPriorities: Priority[] = [
        'LOW',
        'MEDIUM',
        'HIGH',
        'URGENT',
      ];

      const category = validCategories.includes(parsed.category)
        ? parsed.category
        : 'GENERAL_QUESTION';
      const priority = validPriorities.includes(parsed.priority)
        ? parsed.priority
        : 'MEDIUM';
      const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
      const aiDraftResponse =
        typeof parsed.aiDraftResponse === 'string' && parsed.aiDraftResponse.length > 0
          ? parsed.aiDraftResponse
          : heuristicClassifyAndDraft(subject, body, studentName).aiDraftResponse;
      const canAutoResolve = typeof parsed.canAutoResolve === 'boolean' ? parsed.canAutoResolve : false;
      const autoResolveReason = typeof parsed.autoResolveReason === 'string' ? parsed.autoResolveReason : undefined;
      const resolutionAnswer = typeof parsed.resolutionAnswer === 'string' && parsed.resolutionAnswer.length > 0
        ? parsed.resolutionAnswer
        : undefined;

      return {
        category,
        priority,
        summary: summary || heuristicClassifyAndDraft(subject, body, studentName).summary,
        aiDraftResponse,
        canAutoResolve,
        autoResolveReason,
        resolutionAnswer,
      };
    }

    return heuristicClassifyAndDraft(subject, body, studentName);
  } catch (error) {
    console.warn(`[${aiConfig.provider}] AI classification failed, using heuristic fallback:`, error);
    const fallback = heuristicClassifyAndDraft(subject, body, studentName);
    return {
      ...fallback,
      hasAiError: true,
    };
  }
}

export interface PolishReplyOptions {
  replyText: string;
  studentName?: string;
  category?: string;
}

export { heuristicPolishReply };

/**
 * Strips codeblocks, surrounding quotes, and leading/trailing greetings or signatures from raw LLM text output.
 */
export function cleanAiPolishedBody(raw: string): string {
  let cleaned = (raw || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  }
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return stripHeadersAndFooters(cleaned);
}

/**
 * Polishes and improves a support agent's draft reply using AI (Google Gemini / OpenAI fallback via Vercel AI SDK).
 * Instructs the AI model to rewrite the message body professionally, naturally, and concisely
 * while strictly preserving original meaning, facts, and instructions without generating greetings or signatures.
 * The application then constructs and adds the single standardized greeting and signature.
 * Automatically falls back to rule-based heuristicPolishReply on API error, timeout, quota limits, or invalid response.
 */
export async function aiPolishReply(
  replyText: string,
  studentName?: string,
  category?: string
): Promise<string> {
  if (!replyText || !replyText.trim()) {
    return '';
  }

  const cleanedInput = stripHeadersAndFooters(replyText);
  if (!cleanedInput) {
    return '';
  }

  const aiConfig = getActiveAiModel('gemini-3.6-flash');

  if (!aiConfig) {
    return heuristicPolishReply(replyText, studentName, category);
  }

  const firstName = extractFirstName(studentName);

  const prompt = `You are an expert customer support email copywriter for Code with Mosh Support.

Your task is to take a draft reply written by a support agent and polish it into a concise, professional, and properly related response of EXACTLY 2 to 3 clear lines/sentences.

GUIDELINES FOR THE 2-3 LINES:
1. Sentence 1: Clearly acknowledge the inquiry and confirm the specific action taken or solution provided.
2. Sentence 2: Provide the necessary instructions, verification steps, URL/link, or timeframe details.
3. Sentence 3 (if applicable): Add a polite, courteous offer of further assistance.

STRICT RULES:
1. Length: Keep the body text between 2 and 3 complete sentences. Do NOT write single-word fragments, and do NOT write long essays.
2. Do NOT include any greeting (e.g., "Hello ...") or sign-off (e.g., "Best regards..."). Return ONLY the polished body text.
3. Do NOT wrap output in markdown code blocks or quotes. Return plain text only.
4. Preserve all factual details, procedures, URLs, credentials, and key context intact.
5. Tone: Polite, empathetic, helpful, and professional.

Customer: ${studentName?.trim() || 'Student'}
Category: ${category?.trim() || 'General Support'}

Draft message to polish:
"""
${cleanedInput}
"""

Polished 2-3 line message body:`;

  try {
    const { text } = await generateText({
      model: aiConfig.model,
      prompt,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(10000),
    });

    const cleanedPolishedBody = cleanAiPolishedBody(text);

    if (!cleanedPolishedBody) {
      return heuristicPolishReply(replyText, studentName, category);
    }

    const greeting = `Hello ${firstName},\n\n`;
    const signoff = `\n\nBest regards,\nCode with Mosh Support`;

    return `${greeting}${cleanedPolishedBody}${signoff}`;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    const isAuthError =
      errorMsg.includes('authentication credentials') ||
      errorMsg.includes('API key') ||
      errorMsg.includes('401') ||
      errorMsg.includes('403') ||
      errorMsg.includes('unauthorized');

    console.warn(`[${aiConfig.provider}] AI Polish Reply primary attempt (${aiConfig.modelName}) failed, trying fallback:`, errorMsg);

    // Fallback 1: Gemini Waterfall across active models (only if not an auth failure)
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (isNonEmptyApiKey(geminiKey) && (!isAuthError || aiConfig.provider !== 'gemini')) {
      const fallbackModels = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.8-flash'].filter(
        (m) => m !== aiConfig.modelName
      );
      const googleProvider = createGoogle({ apiKey: geminiKey!.trim() });
      for (const fallbackModel of fallbackModels) {
        try {
          const { text: geminiText } = await generateText({
            model: googleProvider(fallbackModel),
            prompt,
            maxRetries: 0,
            abortSignal: AbortSignal.timeout(6000),
          });
          const cleanedGemini = cleanAiPolishedBody(geminiText);
          if (cleanedGemini) {
            const greeting = `Hello ${firstName},\n\n`;
            const signoff = `\n\nBest regards,\nCode with Mosh Support`;
            return `${greeting}${cleanedGemini}${signoff}`;
          }
        } catch (gemErr: any) {
          console.warn(`[gemini-fallback] Attempt with ${fallbackModel} failed:`, gemErr?.message || gemErr);
          if (String(gemErr).includes('authentication credentials')) break;
        }
      }
    }

    // Fallback 2: OpenAI if configured
    const openaiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    if (isNonEmptyApiKey(openaiKey) && (!isAuthError || aiConfig.provider !== 'openai')) {
      try {
        const openaiProvider = createOpenAI({ apiKey: openaiKey!.trim() });
        const { text: fallbackText } = await generateText({
          model: openaiProvider('gpt-4o-mini'),
          prompt,
          maxRetries: 1,
          abortSignal: AbortSignal.timeout(6000),
        });
        const cleanedFallback = cleanAiPolishedBody(fallbackText);
        if (cleanedFallback) {
          const greeting = `Hello ${firstName},\n\n`;
          const signoff = `\n\nBest regards,\nCode with Mosh Support`;
          return `${greeting}${cleanedFallback}${signoff}`;
        }
      } catch (secondaryErr: any) {
        console.warn('[openai] Secondary AI Polish fallback also failed:', secondaryErr?.message || secondaryErr);
      }
    }

    return heuristicPolishReply(replyText, studentName, category);
  }
}

/**
 * Options-object wrapper for aiPolishReply for backward compatibility.
 */
export async function polishReplyWithAi(options: PolishReplyOptions): Promise<string> {
  return aiPolishReply(options.replyText, options.studentName, options.category);
}

export interface MessageSummaryContext {
  id?: string;
  senderType: string;
  senderEmail?: string;
  body: string;
  isInternalNote?: boolean;
  createdAt?: Date | string;
}

export interface TicketSummaryContext {
  id?: number;
  subject: string;
  studentName?: string;
  studentEmail?: string;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  createdAt?: Date | string;
  body?: string;
  messages?: MessageSummaryContext[];
}

/**
 * Heuristic summary generator for ticket and conversation history when offline or no API key.
 */
export function heuristicSummarizeTicketAndHistory(ticket: TicketSummaryContext): string {
  const subject = ticket.subject?.trim() || 'Inquiry';
  const student = ticket.studentName?.trim() || 'Student';
  const category = ticket.category || 'General Question';
  const priority = ticket.priority || 'MEDIUM';
  const status = ticket.status || 'OPEN';
  const messages = ticket.messages || [];
  const ticketBody = ticket.body?.trim() || '';

  const bullets: string[] = [];

  // Section 1: Initial Issue
  bullets.push(`• Initial Issue:`);
  bullets.push(`  - Customer (${student}) submitted inquiry regarding "${subject}" [Category: ${category}, Priority: ${priority}].`);
  const initialMsg = messages.find((m) => m.senderType === 'STUDENT') || messages[0];
  const problemText = ticketBody || initialMsg?.body || '';
  if (problemText) {
    const preview = problemText.trim().replace(/\s+/g, ' ').slice(0, 140);
    bullets.push(`  - Problem statement: "${preview}${preview.length >= 140 ? '...' : ''}"`);
  }

  // Section 2: Conversation & Actions Taken
  bullets.push(`• Conversation & Actions Taken:`);
  if (messages.length <= 1) {
    bullets.push(`  - Ticket logged in system. Awaiting support agent review and initial response.`);
  } else {
    const studentCount = messages.filter((m) => m.senderType === 'STUDENT').length;
    const agentCount = messages.filter((m) => m.senderType === 'AGENT' && !m.isInternalNote).length;
    const noteCount = messages.filter((m) => m.isInternalNote).length;

    bullets.push(
      `  - Thread contains ${messages.length} total message(s) (${studentCount} student message(s), ${agentCount} agent reply(ies)${
        noteCount > 0 ? `, ${noteCount} internal note(s)` : ''
      }).`
    );

    const latestAgentReply = [...messages].reverse().find((m) => m.senderType === 'AGENT' && !m.isInternalNote);
    if (latestAgentReply) {
      const replyPreview = latestAgentReply.body.trim().replace(/\s+/g, ' ').slice(0, 120);
      bullets.push(`  - Latest agent response: "${replyPreview}${replyPreview.length >= 120 ? '...' : ''}"`);
    }

    const latestNote = [...messages].reverse().find((m) => m.isInternalNote);
    if (latestNote) {
      const notePreview = latestNote.body.trim().replace(/\s+/g, ' ').slice(0, 100);
      bullets.push(`  - Staff note recorded: "${notePreview}${notePreview.length >= 100 ? '...' : ''}"`);
    }
  }

  // Section 3: Current Status & Next Steps
  bullets.push(`• Current Status & Next Steps:`);
  if (status === 'RESOLVED') {
    bullets.push(`  - Ticket is marked as RESOLVED. Support solutions have been communicated.`);
  } else if (status === 'CLOSED') {
    bullets.push(`  - Ticket is CLOSED.`);
  } else {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.senderType === 'STUDENT') {
      bullets.push(`  - Status is OPEN. Pending support agent review of latest student follow-up.`);
    } else if (lastMsg && lastMsg.senderType === 'AGENT' && !lastMsg.isInternalNote) {
      bullets.push(`  - Status is OPEN. Agent replied; awaiting student response or confirmation.`);
    } else {
      bullets.push(`  - Status is OPEN. Active in support queue.`);
    }
  }

  return bullets.join('\n');
}

/**
 * Summarizes the ticket details and full conversation history using Google Gemini (or OpenAI fallback).
 * Falls back safely to heuristic rule-based summarization when offline or if API is unreachable.
 */
export async function summarizeTicketAndHistory(ticket: TicketSummaryContext): Promise<string> {
  const aiConfig = getActiveAiModel(process.env.AI_PROVIDER === 'gemini' ? 'gemini-3.8-flash' : 'gpt-4o-mini');

  if (!aiConfig) {
    return heuristicSummarizeTicketAndHistory(ticket);
  }

  try {
    const messagesFormatted = (ticket.messages || [])
      .map((m, idx) => {
        const senderLabel = m.isInternalNote
          ? 'INTERNAL NOTE (Agent)'
          : m.senderType === 'STUDENT'
          ? `STUDENT/CUSTOMER (${m.senderEmail || ticket.studentEmail || 'Student'})`
          : `SUPPORT AGENT (${m.senderEmail || 'Support Agent'})`;
        const time = m.createdAt ? ` [${new Date(m.createdAt).toISOString()}]` : '';
        return `Message #${idx + 1} - ${senderLabel}${time}:\n${m.body.trim()}`;
      })
      .join('\n\n---\n\n');

    const ticketContent = ticket.body
      ? `Ticket Body:\n${ticket.body}\n\n${messagesFormatted ? `Additional Messages:\n${messagesFormatted}` : ''}`
      : messagesFormatted || '(No conversation content yet)';

    const prompt = `You are an expert AI customer support lead. Summarize the following support ticket into a concise, professional executive summary.

Ticket Details:
- Ticket ID: ${ticket.id ? `#${ticket.id}` : 'N/A'}
- Subject: ${ticket.subject}
- Customer: ${ticket.studentName || 'Student'} (${ticket.studentEmail || 'No email'})
- Category: ${ticket.category || 'General Question'}
- Priority: ${ticket.priority || 'MEDIUM'}
- Status: ${ticket.status || 'OPEN'}

Content:
${ticketContent}

Instructions:
Format the output clearly under these three bulleted headings:
• Initial Issue: 1-2 concise bullets summarizing what the student requested or reported.
• Conversation & Actions Taken: 1-3 bullets summarizing key agent responses, troubleshooting steps, notes, and back-and-forth timeline.
• Current Status & Next Steps: 1-2 bullets summarizing the current state, resolution, or who is currently waiting on whom.

Return ONLY the structured summary text without conversational prefixes or meta commentary.`;

    try {
      const { text } = await generateText({
        model: aiConfig.model,
        prompt,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(4000),
      });

      const cleaned = text?.trim();
      if (cleaned && cleaned.length > 0) {
        return cleaned;
      }
    } catch (primaryErr: any) {
      // Fall through to heuristic summary
    }

    return heuristicSummarizeTicketAndHistory(ticket);
  } catch (error: any) {
    console.warn(`[${aiConfig.provider}] AI Summarization failed or timed out, using fallback:`, error?.message || error);
    return heuristicSummarizeTicketAndHistory(ticket);
  }
}

export interface BackgroundClassifyOptions {
  preserveCategoryIfSet?: boolean;
  preservePriorityIfSet?: boolean;
  force?: boolean;
}

export const AI_AGENT_EMAIL = process.env.AI_AGENT_EMAIL || 'ai@example.com';
export const AI_AGENT_NAME = 'AI';

/**
 * Finds the system AI Agent user in the database.
 */
export async function getAiAgentUser() {
  try {
    return await prisma.user.findFirst({
      where: {
        OR: [
          { email: AI_AGENT_EMAIL },
          { name: AI_AGENT_NAME },
        ],
        deletedAt: null,
        isActive: true,
      },
    });
  } catch (err) {
    console.warn('[AI Agent Lookup Warning]:', err);
    return null;
  }
}

/**
 * Executes automatic GPT classification for a given ticket ID in the background
 * and updates the ticket record in PostgreSQL with category, priority, bullet summary, and draft response.
 */
export async function classifyTicketInBackground(
  ticketId: number,
  options?: BackgroundClassifyOptions
): Promise<any> {
  let ticket: any = null;
  try {
    ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      console.warn(`[AI Classification] Ticket #${ticketId} not found, skipping background classification.`);
      return null;
    }

    console.info(`[AI Classification] Starting non-blocking GPT classification for Ticket #${ticketId} ("${ticket.subject}")...`);

    // Transition ticket to PROCESSING status while AI evaluates auto-resolution
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'PROCESSING' },
    });

    const result = await classifyAndDraftInquiry(
      ticket.subject,
      ticket.body,
      ticket.studentName
    );

    const aiAgent = await getAiAgentUser();

    const updateData: {
      category?: Category;
      priority?: Priority;
      status?: 'OPEN' | 'RESOLVED';
      body?: string;
      summary?: string;
      aiDraftResponse?: string;
      assignedAgentId?: string | null;
    } = {
      summary: result.summary,
      aiDraftResponse: result.aiDraftResponse,
    };

    if (result.canAutoResolve) {
      updateData.status = 'RESOLVED';
      const resolutionReply = result.resolutionAnswer || result.aiDraftResponse;
      const resolutionMessage = `\n\n--- [Auto-Resolution Reply from Code with Mosh Support (support@example.com)] ---\n${resolutionReply}`;
      updateData.body = ticket.body ? `${ticket.body}${resolutionMessage}` : resolutionReply;

      // Keep assigned to AI Agent or assign to AI Agent if not explicitly assigned to a human
      if (aiAgent && (!ticket.assignedAgentId || ticket.assignedAgentId === aiAgent.id)) {
        updateData.assignedAgentId = aiAgent.id;
      }
      console.info(`[AI Auto-Resolution] Ticket #${ticketId} auto-resolved based on Knowledge Base: ${result.autoResolveReason || 'Policy match'}`);
    } else {
      updateData.status = 'OPEN';
      // If the ticket was assigned to the AI agent and cannot be auto-resolved, unassign it so human agents can triage it
      if (aiAgent && ticket.assignedAgentId === aiAgent.id) {
        updateData.assignedAgentId = null;
        console.info(`[AI Auto-Resolution] Ticket #${ticketId} cannot be auto-resolved; unassigned from AI Agent and routed to OPEN queue.`);
      } else {
        console.info(`[AI Classification] Ticket #${ticketId} transitioned to OPEN queue for human agent review.`);
      }
    }

    if (!options?.preserveCategoryIfSet || !ticket.category) {
      updateData.category = result.category;
    }

    if (!options?.preservePriorityIfSet) {
      updateData.priority = result.priority;
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        assignedAgent: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    console.info(
      `[AI Classification] Successfully classified Ticket #${ticketId} via GPT: Category=${updatedTicket?.category || 'N/A'}, Priority=${updatedTicket?.priority || 'N/A'}`
    );

    // Send outbound auto-resolution email reply to student upon auto-resolution
    if (result.canAutoResolve && ticket.studentEmail) {
      try {
        const resolutionReply = result.resolutionAnswer || result.aiDraftResponse;
        const sendResult = await sendOutboundEmail({
          to: ticket.studentEmail,
          toName: ticket.studentName,
          subject: ticket.subject,
          text: resolutionReply,
          ticketId: ticket.id,
        });

        if (sendResult?.success) {
          try {
            await prisma.webhookLog.create({
              data: {
                source: 'mailgun_outbound',
                payload: JSON.stringify({
                  to: ticket.studentEmail,
                  toName: ticket.studentName,
                  subject: `[Ticket #${ticket.id}] ${ticket.subject}`,
                  messageId: sendResult.messageId,
                  autoResolution: true,
                }),
                status: 'sent',
                ticketId: ticket.id,
              },
            });
          } catch (logErr) {
            // Ignore webhook logging errors
          }
          console.info(`[AI Auto-Resolution] Dispatched auto-resolution email to ${ticket.studentEmail} (Message-ID: ${sendResult.messageId})`);
        }
      } catch (emailErr) {
        console.warn(`[AI Auto-Resolution Warning] Failed to send email for Ticket #${ticketId}:`, emailErr);
      }
    }

    return updatedTicket;
  } catch (error: any) {
    if (error?.code === 'P2025' || error?.message?.includes('Record to update not found')) {
      console.info(`[AI Classification] Ticket #${ticketId} was deleted or not found; stopping background task.`);
      return null;
    }
    console.error(`[AI Classification] Error during background classification for Ticket #${ticketId}:`, error?.message || error);
    try {
      const aiAgent = await getAiAgentUser();
      const fallbackUpdate: { status: 'OPEN'; assignedAgentId?: null } = { status: 'OPEN' };
      if (aiAgent && ticket?.assignedAgentId === aiAgent.id) {
        fallbackUpdate.assignedAgentId = null;
      }

      await prisma.ticket.update({
        where: { id: ticketId },
        data: fallbackUpdate,
      });
      console.info(`[AI Classification] Ticket #${ticketId} status updated to OPEN after error.`);
    } catch (statusErr: any) {
      if (statusErr?.code !== 'P2025' && !statusErr?.message?.includes('Record to update not found')) {
        console.error(`[AI Classification] Failed to update ticket status to OPEN for Ticket #${ticketId}:`, statusErr);
      }
    }
    return null;
  }
}

/**
 * Schedules non-blocking automatic classification of a ticket using GPT via pg-boss job queue.
 * If pg-boss is unavailable, falls back to non-blocking event loop execution.
 */
export function scheduleTicketClassification(
  ticketId: number,
  options?: BackgroundClassifyOptions
): void {
  enqueueTicketClassification(ticketId, options).catch((err) => {
    console.error(`[Queue Error] Failed to enqueue classification for Ticket #${ticketId}:`, err);
    setImmediate(() => {
      classifyTicketInBackground(ticketId, options).catch((fallbackErr) => {
        console.error(`[AI Classification Background Exception for Ticket #${ticketId}]:`, fallbackErr);
      });
    });
  });
}


