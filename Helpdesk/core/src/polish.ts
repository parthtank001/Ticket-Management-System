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
 * Common abbreviations, slang, contractions, and technical acronyms normalization map.
 */
const TOKEN_NORMALIZATIONS: Array<[RegExp, string]> = [
  // Technical acronyms (preserve exact casing)
  [/\bvpn\b/gi, 'VPN'],
  [/\bssh\b/gi, 'SSH'],
  [/\bapi\b/gi, 'API'],
  [/\bpdf\b/gi, 'PDF'],
  [/\burl\b/gi, 'URL'],
  [/\bhttp\b/gi, 'HTTP'],
  [/\bhttps\b/gi, 'HTTPS'],
  [/\bui\b/gi, 'UI'],
  [/\bsql\b/gi, 'SQL'],
  [/\bid\b/gi, 'ID'],

  // Slang, contractions, and abbreviations
  [/\bpls\b|\bplz\b/gi, 'please'],
  [/\bthx\b|\bthanx\b|\bty\b|\btyvm\b|\btysm\b/gi, 'thank you'],
  [/\bu\b/gi, 'you'],
  [/\bur\b/gi, 'your'],
  [/\burs\b/gi, 'yours'],
  [/\br\b/gi, 'are'],
  [/\bya\b/gi, 'you'],
  [/\byep\b|\byup\b|\byeah\b/gi, 'yes'],
  [/\bcant\b/gi, 'cannot'],
  [/\bcan't\b/gi, 'cannot'],
  [/\bdont\b/gi, 'do not'],
  [/\bdon't\b/gi, 'do not'],
  [/\bwont\b/gi, 'will not'],
  [/\bwon't\b/gi, 'will not'],
  [/\bisnt\b/gi, 'is not'],
  [/\bisn't\b/gi, 'is not'],
  [/\barent\b/gi, 'are not'],
  [/\baren't\b/gi, 'are not'],
  [/\bwasnt\b/gi, 'was not'],
  [/\bwasn't\b/gi, 'was not'],
  [/\bwerent\b/gi, 'were not'],
  [/\bweren't\b/gi, 'were not'],
  [/\bive\b/gi, 'I have'],
  [/\bi've\b/gi, 'I have'],
  [/\bill\b/gi, 'I will'],
  [/\bi'll\b/gi, 'I will'],
  [/\bim\b/gi, 'I am'],
  [/\bi'm\b/gi, 'I am'],
  [/\bi'd\b/gi, 'I would'],
  [/\bi\b/g, 'I'],
  [/\basap\b/gi, 'as promptly as possible'],
  [/\bpwd\b|\bpass\b/gi, 'password'],
  [/\bacc\b|\bacct\b/gi, 'account'],
  [/\bsub\b/gi, 'subscription'],
  [/\bsubs\b/gi, 'subscriptions'],
  [/\bmsg\b/gi, 'message'],
  [/\bmsgs\b/gi, 'messages'],
  [/\binfo\b/gi, 'information'],
  [/\bdocs\b/gi, 'documentation'],
  [/\bcert\b/gi, 'certificate'],
  [/\bcerts\b/gi, 'certificates'],
  [/\badmin\b/gi, 'administrator'],
  [/\batm\b/gi, 'at the moment'],
  [/\bbtw\b/gi, 'by the way'],
  [/\bw\//gi, 'with '],
  [/\bw\/o/gi, 'without '],
  [/\bb\/c\b/gi, 'because'],
];

/**
 * Domain-specific support phrase transformations.
 * Ordered from highest specificity to general phrasing.
 */
interface PhraseRule {
  pattern: RegExp;
  replacement: string;
}

const SUPPORT_PHRASE_RULES: PhraseRule[] = [
  // 1. Apologies & Delays
  {
    pattern: /\b(?:sorry\s+for\s+(?:the\s+)?delay|apologies\s+for\s+(?:the\s+)?delay|sorry\s+for\s+(?:the\s+)?late\s+reply|sorry\s+for\s+keeping\s+you\s+waiting|apologies\s+for\s+(?:the\s+)?wait)\b/gi,
    replacement: 'Thank you for your patience while we investigated this.',
  },
  {
    pattern: /\b(?:sorry\s+about\s+that|apologies\s+for\s+the\s+inconvenience|sorry\s+for\s+the\s+trouble)\b/gi,
    replacement: 'We sincerely apologize for any inconvenience this may have caused.',
  },
  {
    pattern: /\b(?:sorry\s+to\s+hear\s+that|sorry\s+that\s+happened)\b/gi,
    replacement: 'We are sorry to hear that you experienced this issue.',
  },

  // 2. Account & Password Resets
  {
    pattern: /\b(?:i|we)\s+reset\s+your\s+password[,\s]*(?:and\s+)?(?:login\s+and\s+check|log\s+in\s+and\s+check)\b/gi,
    replacement: 'We have issued a password reset link for your account. Please log in to verify access',
  },
  {
    pattern: /\byour\s+password\s+has\s+been\s+reset[,\s]+(?:login\s+and\s+check|log\s+in\s+and\s+check)\b/gi,
    replacement: 'Your password reset instructions have been dispatched to your email. Please follow the link to log in and access your account',
  },
  {
    pattern: /\bhere\s+is\s+the\s+link\s+to\s+reset\s+your\s+password\b/gi,
    replacement: 'You can reset your account password using the following link:',
  },
  {
    pattern: /\b(?:login\s+and\s+check|log\s+in\s+and\s+check)\b/gi,
    replacement: 'please log in to verify access',
  },
  {
    pattern: /\b(?:i|we)\s+(?:have\s+)?updated\s+your\s+email\s+address\b/gi,
    replacement: 'We have updated your registered email address as requested',
  },

  // 3. Certificates & Invoices & Billing
  {
    pattern: /\b(?:the\s+)?course\s+certificate\s+has\s+been\s+sent\s+to\s+your\s+email\b/gi,
    replacement: 'Your Course Certificate of Completion has been generated and sent to your registered email address. You can also view and download your certificates directly from your student dashboard under "My Certificates"',
  },
  {
    pattern: /\byou\s+can\s+download\s+your\s+invoice\s+from\s+the\s+account\s+billing\s+section\b/gi,
    replacement: 'You can view and download your official invoice directly by navigating to your Account Settings under the "Billing and Invoices" section',
  },
  {
    pattern: /\byour\s+payment\s+failed[,\s]*(?:please\s+)?update\s+your\s+card\b/gi,
    replacement: 'Your recent payment attempt could not be processed. Please update your billing details or payment method in your account settings',
  },
  {
    pattern: /\b(?:i|we)\s+processed\s+your\s+refund\b/gi,
    replacement: 'We processed your refund',
  },
  {
    pattern: /\b(?:i|we)\s+have\s+processed\s+your\s+refund\b/gi,
    replacement: 'We have processed your refund',
  },
  {
    pattern: /\b(?:your\s+refund\s+request\s+is\s+outside\s+our\s+30\s*day\s+refund\s+policy\s+so\s+we\s+cannot\s+refund|we\s+cannot\s+refund\s+because\s+30\s*days\s+passed|we\s+cant\s+refund\s+because\s+30\s*days\s+passed|cant\s+refund\s+because\s+30\s*days\s+passed)\b/gi,
    replacement: 'In accordance with our policy, refund requests must be submitted within our 30-day money-back guarantee window. Because your enrollment exceeds this timeframe, we are unable to process a refund for this transaction',
  },
  {
    pattern: /\b(?:we\s+cannot\s+refund|we\s+cant\s+refund|cannot\s+give\s+(?:a\s+)?refund|cant\s+give\s+(?:a\s+)?refund|cannot\s+refund|cant\s+refund|no\s+refund)\b/gi,
    replacement: 'In accordance with our policy, refund requests must be submitted within our 30-day guarantee window. Consequently, we are unable to process a refund for this transaction',
  },

  // 4. Troubleshooting & System Fixes
  {
    pattern: /\b(?:i\s+have|we\s+have|i|we)?\s*fixed\s+the\s+video\s+loading\s+problem\b/gi,
    replacement: 'We have resolved the video playback issue on our end. Videos should now stream smoothly without interruption',
  },
  {
    pattern: /\b(?:i|we)\s+checked\s+your\s+account\s+and\s+everything\s+looks\s+good(?:\s+now)?\b/gi,
    replacement: 'We have reviewed your account, and everything is in order and functioning properly',
  },
  {
    pattern: /\b(?:i|we)\s+(?:have\s+)?fixed\s+(?:it|this|the issue|the problem)\b/gi,
    replacement: 'We have successfully resolved this issue for you',
  },
  {
    pattern: /\b(?:i|we)\s+(?:have\s+)?resolved\s+it\b/gi,
    replacement: 'We have successfully resolved this issue for you',
  },
  {
    pattern: /\b(?:i|we)\s+(?:have\s+)?checked\b/gi,
    replacement: 'We have reviewed',
  },
  {
    pattern: /\b(?:i|we)\s+(?:have\s+)?(?:looked into|looked at)\b/gi,
    replacement: 'We have investigated',
  },
  {
    pattern: /\b(?:i|we)\s+are\s+looking\s+into\s+it\s+and\s+will\s+get\s+back\s+to\s+you\b/gi,
    replacement: 'Our support team is actively investigating this issue, and we will follow up with you as soon as an update is available',
  },

  // 5. Actions, Navigation & Inquiries
  {
    pattern: /\blet\s+(?:me|us)\s+know\s+if\s+you\s+need\s+anything\s+else\b/gi,
    replacement: 'Please feel free to reach out if you have any further questions or if there is anything else we can assist you with',
  },
  {
    pattern: /\blet\s+(?:me|us)\s+know\s+if\s+this\s+helps\b/gi,
    replacement: 'Please let us know if this resolves the issue or if you need any further assistance',
  },
  {
    pattern: /\byou\s+can\s+access\s+the\s+course\s+from\s+your\s+dashboard\b/gi,
    replacement: 'You can access your enrolled course materials directly from your student dashboard',
  },
  {
    pattern: /\b(?:i will|i'll)\s+(?:check|take a look at)\b/gi,
    replacement: 'I will review and verify',
  },
  {
    pattern: /\b(?:we will|we'll)\s+(?:check|take a look at)\b/gi,
    replacement: 'We will review and verify',
  },
  {
    pattern: /\bgimme\b/gi,
    replacement: 'could you please provide',
  },
  {
    pattern: /\b(?:can\s+u\s+send|can\s+you\s+send)\s+(?:a\s+)?(?:screenshot|screen\s+shot)\b/gi,
    replacement: 'Could you please provide a screenshot of the error message',
  },
  {
    pattern: /\bcan\s+u\s+send\b|\bcan\s+you\s+send\b/gi,
    replacement: 'Could you please provide',
  },
  {
    pattern: /\bcan u\b|\bcan you\b/gi,
    replacement: 'could you please',
  },
  {
    pattern: /\b(?:you\s+need\s+to\s+go\s+to|you\s+have\s+to\s+go\s+to|you\s+must\s+go\s+to)\b/gi,
    replacement: 'please navigate to',
  },
  {
    pattern: /\b(?:you\s+need\s+to|you\s+have\s+to|you\s+must)\b/gi,
    replacement: 'please ensure that you',
  },
  {
    pattern: /\bgo to\b/gi,
    replacement: 'please navigate to',
  },
  {
    pattern: /\bclick on\b/gi,
    replacement: 'select',
  },
  {
    pattern: /\bcheck your email\b/gi,
    replacement: 'please check your email inbox (including the spam or junk folder)',
  },
  {
    pattern: /\bno worries\b|\bdont worry\b|\bdo not worry\b/gi,
    replacement: 'Rest assured, we are here to help',
  },
  {
    pattern: /\bworking now\b/gi,
    replacement: 'now functioning properly',
  },
  {
    pattern: /\bproblem is fixed\b|\bissue is fixed\b/gi,
    replacement: 'the issue has been successfully resolved',
  },
  {
    pattern: /\bplease\s+(?:please|ensure\s+that\s+you\s+please)\b/gi,
    replacement: 'please',
  },
];

/**
 * Strips pre-existing greeting headers and signature footers.
 */
export function stripHeadersAndFooters(text: string): string {
  let cleaned = text.trim();

  // Strip greetings
  cleaned = cleaned.replace(/^(?:hello|hi|hey|dear|greetings)\s+[^,\n:!-]+[,\n:!-]+\s*/i, '');
  cleaned = cleaned.replace(/^(?:good\s+(?:morning|afternoon|evening))\s+[^,\n:!-]+[,\n:!-]+\s*/i, '');
  cleaned = cleaned.replace(/^(?:hello|hi|hey|dear|greetings|good\s+(?:morning|afternoon|evening))[,\n:!-]+\s*/i, '');
  cleaned = cleaned.replace(/^(?:hello|hi|hey|dear|greetings)\s+/i, '');

  // Strip trailing sign-offs
  cleaned = cleaned.replace(
    /(?:\n\s*|\s+)(?:best regards|warm regards|kind regards|regards|sincerely|thanks|thank you|cheers|best|yours truly|code with helpdesk|support team|helpdesk support team)[,\s\S]*$/i,
    ''
  );

  return cleaned.trim();
}

/**
 * Capitalizes sentences and ensures appropriate terminal punctuation.
 */
function formatSentence(sentence: string): string {
  let trimmed = sentence.trim();
  if (!trimmed) return '';

  // Capitalize initial character
  trimmed = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

  // Capitalize subsequent sentences after periods, exclamation marks, or question marks
  trimmed = trimmed.replace(/([.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  // Determine if the sentence is interrogative
  const isQuestion = /^(?:could\s+you|can\s+you|would\s+you|may\s+we|is\s+it|are\s+you|did\s+you|do\s+you|have\s+you)/i.test(
    trimmed
  );

  if (!/[.!?]$/.test(trimmed)) {
    trimmed += isQuestion ? '?' : '.';
  }

  return trimmed;
}

/**
 * Intelligent heuristic polish function used when offline, in test mode, or when API call fails/quota exceeded.
 * Performs multi-stage natural language transformation, tone elevation, and professional support structuring.
 */
export function heuristicPolishReply(
  replyText: string,
  studentName?: string,
  _category?: string
): string {
  if (!replyText || !replyText.trim()) return '';

  const firstName = extractFirstName(studentName);
  let cleaned = stripHeadersAndFooters(replyText);

  if (!cleaned) return '';

  // 1. Apply token normalizations (abbreviations, technical terms, contractions)
  for (const [pattern, rep] of TOKEN_NORMALIZATIONS) {
    cleaned = cleaned.replace(pattern, rep);
  }

  // 2. Apply courteous support phrase elevations
  for (const rule of SUPPORT_PHRASE_RULES) {
    cleaned = cleaned.replace(rule.pattern, rule.replacement);
  }

  // 3. Clean up spaces and punctuation junctions
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.replace(/([.!?])\s*([.!?])/g, '$1');

  // Insert period before courtesy follow-up clauses if preceded by words without punctuation
  cleaned = cleaned.replace(
    /([a-zA-Z0-9])\s+(Please feel free to reach out|Please let us know|Rest assured|Please check your email)/g,
    '$1. $2'
  );
  cleaned = cleaned.replace(
    /([a-zA-Z0-9])\s+(Thank you for your patience|We sincerely apologize)/g,
    '$1. $2'
  );

  // 4. Format sentence capitalization and terminal punctuation
  const formattedBody = formatSentence(cleaned);

  // 5. Wrap in salutation and sign-off
  const greeting = `Hello ${firstName},\n\n`;
  const signoff = `\n\nBest regards,\nCode with helpdesk`;

  return `${greeting}${formattedBody}${signoff}`;
}
