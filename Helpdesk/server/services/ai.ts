import { GoogleGenAI } from '@google/genai';
import { Category, Priority } from '@helpdesk/core';

export interface AIClassificationResult {
  category: Category;
  priority: Priority;
  summary: string;
  aiDraftResponse: string;
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
  const name = studentName?.trim() || 'Student';

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
  let aiDraftResponse = `Hello ${name},\n\nThank you for reaching out to Helpdesk Support. We have received your inquiry regarding "${subject.trim()}". An agent will review your request shortly.\n\nBest regards,\nHelpdesk AI Support`;

  if (category === 'TECHNICAL_QUESTION') {
    aiDraftResponse = `Hello ${name},\n\nRegarding your technical issue "${subject.trim()}": Please try clearing your browser cache, re-authenticating, or verifying your network connection. Our technical support team is inspecting the logs for your account.\n\nBest regards,\nHelpdesk Technical Team`;
  } else if (category === 'REFUND_REQUEST') {
    aiDraftResponse = `Hello ${name},\n\nThank you for submitting a refund inquiry for "${subject.trim()}". Refund requests are processed within 3-5 business days. Please verify your invoice number for speedier processing.\n\nBest regards,\nBilling Support Team`;
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

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an AI customer support triage assistant for a student helpdesk system.
Analyze the following student support inquiry and provide a JSON response with:
1. "category": EXACTLY one of ["GENERAL_QUESTION", "TECHNICAL_QUESTION", "REFUND_REQUEST"]
2. "priority": EXACTLY one of ["LOW", "MEDIUM", "HIGH", "URGENT"]
3. "summary": 2-3 bullet points summarizing the student's problem
4. "aiDraftResponse": A professional, empathetic, and helpful draft response ready for a human agent to review and send to the student. Address the student by name (${studentName || 'Student'}). Sign off with appropriate support team signature.

Student Name: ${studentName || 'Student'}
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
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

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
