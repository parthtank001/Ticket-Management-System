import { GoogleGenAI } from '@google/genai';
import { generateText } from 'ai';
import { createGoogleGenerativeAI, google } from '@ai-sdk/google';
import { Category, Priority } from '@helpdesk/core';

export interface AIClassificationResult {
  category: Category;
  priority: Priority;
  summary: string;
  aiDraftResponse: string;
}

/**
 * Helper to extract only the first name from a full name (e.g. "Alice Johnson" -> "Alice", "Smith, John" -> "John")
 */
export function extractFirstName(studentName?: string): string {
  if (!studentName || !studentName.trim()) return 'Student';
  const trimmed = studentName.trim();
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1 && parts[1]) {
      return parts[1].split(/\s+/)[0] || parts[0] || 'Student';
    }
  }
  return trimmed.split(/\s+/)[0] || 'Student';
}

/**
 * Heuristic fallback classifier and draft generator for offline or non-API key runs.
 */
export function heuristicClassifyAndDraft(
  subject: string,
  body: string,
  studentName?: string
): AIClassificationResult {
  const content = `${subject} ${body}`.toLowerCase();
  const firstName = extractFirstName(studentName);

  let category: Category = 'GENERAL_QUESTION';
  let priority: Priority = 'MEDIUM';

  // 1. Classification
  const refundKeywords = [
    'refund',
    'billing',
    'charge',
    'payment',
    'invoice',
    'money back',
    'receipt',
    'overcharged',
    'subscription fee',
    'cancel payment',
    'double charged',
  ];
  const technicalKeywords = [
    'error',
    'bug',
    'login',
    'cannot login',
    'password',
    '403',
    '404',
    '500',
    'portal',
    'crash',
    'broken',
    'recording',
    'access denied',
    'system down',
    'cannot access',
    'server error',
    'glitch',
    'session expired',
  ];

  if (refundKeywords.some((kw) => content.includes(kw))) {
    category = 'REFUND_REQUEST';
  } else if (technicalKeywords.some((kw) => content.includes(kw))) {
    category = 'TECHNICAL_QUESTION';
  } else {
    category = 'GENERAL_QUESTION';
  }

  // 2. Priority detection
  const urgentKeywords = ['urgent', 'emergency', 'asap', 'immediately', 'critical', 'exam today', 'deadline today'];
  const highKeywords = ['cannot access', 'blocked', 'locked out', 'failing', 'refund', 'overcharged', 'high priority'];
  const lowKeywords = ['fyi', 'suggestion', 'feedback', 'when possible', 'minor'];

  if (urgentKeywords.some((kw) => content.includes(kw))) {
    priority = 'URGENT';
  } else if (highKeywords.some((kw) => content.includes(kw))) {
    priority = 'HIGH';
  } else if (lowKeywords.some((kw) => content.includes(kw))) {
    priority = 'LOW';
  } else {
    priority = 'MEDIUM';
  }

  // 3. Bullet summary
  const summaryBullets: string[] = [];
  summaryBullets.push(`- Inquiry regarding: "${subject.trim()}"`);
  if (category === 'TECHNICAL_QUESTION') {
    summaryBullets.push('- Student is experiencing a technical issue with portal or digital resources');
  } else if (category === 'REFUND_REQUEST') {
    summaryBullets.push('- Student has requested financial/billing assistance or refund processing');
  } else {
    summaryBullets.push('- General informational/course inquiry received');
  }
  const summary = summaryBullets.join('\n');

  // 4. Draft response
  let aiDraftResponse = `Hello ${firstName},\n\nThank you for reaching out to Helpdesk Support. We have received your inquiry regarding "${subject.trim()}". An agent will review your request shortly.\n\nBest regards,\nHelpdesk AI Support`;

  if (category === 'TECHNICAL_QUESTION') {
    aiDraftResponse = `Hello ${firstName},\n\nRegarding your technical issue "${subject.trim()}": Please try clearing your browser cache, re-authenticating, or verifying your network connection. Our technical support team is inspecting the logs for your account.\n\nBest regards,\nHelpdesk Technical Team`;
  } else if (category === 'REFUND_REQUEST') {
    aiDraftResponse = `Hello ${firstName},\n\nThank you for submitting a refund inquiry for "${subject.trim()}". Refund requests are processed within 3-5 business days. Please verify your invoice number for speedier processing.\n\nBest regards,\nBilling Support Team`;
  }

  return {
    category,
    priority,
    summary,
    aiDraftResponse,
  };
}

/**
 * Classifies an incoming inquiry and generates a summary & draft response using Google Gemini API.
 * Falls back safely to rule-based heuristics if the API key is not configured or errors.
 */
export async function classifyAndDraftInquiry(
  subject: string,
  body: string,
  studentName?: string
): Promise<AIClassificationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback if no real API key configured or in test environments
  if (!apiKey || apiKey === '12345' || apiKey.length < 10) {
    return heuristicClassifyAndDraft(subject, body, studentName);
  }

  const firstName = extractFirstName(studentName);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an AI customer support triage assistant for a student helpdesk system.
Analyze the following student support inquiry and provide a JSON response with:
1. "category": EXACTLY one of ["GENERAL_QUESTION", "TECHNICAL_QUESTION", "REFUND_REQUEST"]
2. "priority": EXACTLY one of ["LOW", "MEDIUM", "HIGH", "URGENT"]
3. "summary": 2-3 bullet points summarizing the student's problem
4. "aiDraftResponse": A professional, empathetic, and helpful draft response ready for a human agent to review and send to the student. ALWAYS address the customer directly by ONLY their first name ("Hello ${firstName},") at the start. Do not include their last name in the greeting. Sign off with appropriate support team signature.

Customer First Name: ${firstName}
Subject: ${subject}
Message Body:
${body}

Respond ONLY with valid JSON in this exact structure:
{
  "category": "GENERAL_QUESTION" | "TECHNICAL_QUESTION" | "REFUND_REQUEST",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "summary": "string",
  "aiDraftResponse": "string"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    }).catch(() => ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
    }));

    const responseText = response.text?.trim() || '';
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

      return {
        category,
        priority,
        summary: summary || heuristicClassifyAndDraft(subject, body, studentName).summary,
        aiDraftResponse,
      };
    }

    return heuristicClassifyAndDraft(subject, body, studentName);
  } catch (error) {
    console.warn('Gemini AI classification failed, using heuristic fallback:', error);
    return heuristicClassifyAndDraft(subject, body, studentName);
  }
}

export interface PolishReplyOptions {
  replyText: string;
  studentName?: string;
  category?: string;
}

/**
 * Intelligent heuristic polish function used when offline, in test mode, or when API call fails/quota exceeded.
 */
export function heuristicPolishReply(
  replyText: string,
  studentName?: string
): string {
  if (!replyText || !replyText.trim()) return '';
  let cleaned = replyText.trim();
  const firstName = extractFirstName(studentName);

  // Fix common abbreviations and lowercase 'i'
  cleaned = cleaned.replace(/\bi\b/g, 'I');
  cleaned = cleaned.replace(/\bim\b/gi, "I'm");
  cleaned = cleaned.replace(/\bcant\b/gi, 'cannot');
  cleaned = cleaned.replace(/\bdont\b/gi, 'do not');
  cleaned = cleaned.replace(/\bwont\b/gi, 'will not');
  cleaned = cleaned.replace(/\bive\b/gi, "I have");
  cleaned = cleaned.replace(/\bill\b/gi, "I will");
  cleaned = cleaned.replace(/\bpls\b|\bplz\b/gi, 'please');
  cleaned = cleaned.replace(/\bthx\b|\bthanx\b/gi, 'thank you');
  cleaned = cleaned.replace(/\bvpn\b/gi, 'VPN');
  cleaned = cleaned.replace(/\bapi\b/gi, 'API');
  cleaned = cleaned.replace(/\bpdf\b/gi, 'PDF');
  cleaned = cleaned.replace(/\burl\b/gi, 'URL');
  cleaned = cleaned.replace(/\bid\b/gi, 'ID');

  // Strip dangling trailing "thanks" / "thank you" / "regards" so we can place clean signoff
  cleaned = cleaned.replace(/[\s,.-]+(thanks|thank you|thx|cheers|regards|best regards)[\s,.-]*$/i, '');

  // Strip any raw starting greeting (e.g. "hi", "hello", "dear customer", "hey alice smith") so we can uniformly format the salutation with only the customer's first name
  cleaned = cleaned.replace(/^(hello|hi|dear|greetings|hey)(\s+[a-zA-Z0-9_\-\.]+){0,3}([,\s!:-]*)/i, '').trim();

  // Capitalize sentence beginnings
  cleaned = cleaned.replace(/(^\s*|\.\s+|\?\s+|\!\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  // Ensure sentence ends with a period if no terminal punctuation
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }

  // Always address the customer by only their first name
  const greeting = `Hello ${firstName},\n\n`;

  // Professional signoff
  const hasSignoff = /(best regards|sincerely|warm regards|helpdesk support team)/i.test(cleaned);
  const signoff = hasSignoff ? '' : `\n\nBest regards,\nHelpdesk Support Team`;

  return `${greeting}${cleaned}${signoff}`.trim();
}

/**
 * Polishes and improves a support agent's draft reply using Google Gemini via Vercel AI SDK (@ai-sdk/google).
 */
export async function polishReplyWithAi(options: PolishReplyOptions): Promise<string> {
  const { replyText, studentName, category } = options;

  if (!replyText || !replyText.trim()) {
    return '';
  }

  const firstName = extractFirstName(studentName);

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (
    !apiKey ||
    apiKey.trim() === '' ||
    apiKey === '12345' ||
    apiKey === 'mock-key' ||
    apiKey.length < 10
  ) {
    return heuristicPolishReply(replyText, studentName);
  }

  try {
    const googleProvider = createGoogleGenerativeAI({
      apiKey: apiKey.trim(),
    });

    const prompt = `You are an expert customer service communication coach and editor.
Polish and improve the following support agent's draft reply to a student/customer.

Guidelines:
1. Salutation & Greeting: Always address the customer directly by ONLY their first name at the very beginning of the reply (e.g., "Hello ${firstName}," or "Hi ${firstName},"). Do NOT include their last name in the greeting.
2. Tone: Professional, courteous, clear, and empathetic.
3. Grammar: Fix any spelling, grammar, punctuation, and phrasing issues.
4. Content: Retain all original instructions, facts, links, numbers, and solutions without fabricating new details.
5. Structure: Format with clean paragraphs and line breaks where appropriate.
6. Sign-off: Include a courteous sign-off with the support team name (e.g., "Best regards,\nHelpdesk Support Team").
7. Return ONLY the final polished reply text directly. Do NOT include greetings about the prompt, explanations, multiple options, bullet points about what you changed, or markdown blockquotes. Output only the single polished message.

Context:
- Customer First Name: ${firstName}
${category ? `- Ticket Category: ${category}` : ''}

Agent's Draft:
${replyText}`;

    // Primary attempt with gemini-3.5-flash-lite
    try {
      const { text } = await generateText({
        model: googleProvider('gemini-3.5-flash-lite'),
        prompt,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(6000),
      });

      const polished = text?.trim();
      if (polished && polished.length > 0) {
        return polished;
      }
    } catch (primaryErr: any) {
      console.warn('Gemini 3.5 Flash Lite attempt failed, trying gemini-3.1-flash-lite fallback:', primaryErr?.message || primaryErr);
      // Secondary attempt with gemini-3.1-flash-lite
      const { text } = await generateText({
        model: googleProvider('gemini-3.1-flash-lite'),
        prompt,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(6000),
      });

      const polished = text?.trim();
      if (polished && polished.length > 0) {
        return polished;
      }
    }

    return heuristicPolishReply(replyText, studentName);
  } catch (error: any) {
    console.warn('AI Polish with Gemini failed or timed out, using fallback:', error?.message || error);
    return heuristicPolishReply(replyText, studentName);
  }
}
