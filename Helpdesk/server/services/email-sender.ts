import axios from 'axios';

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html?: string;
  ticketId?: number;
  inReplyTo?: string;
  references?: string[];
  httpClient?: {
    post: (url: string, data: any, config?: any) => Promise<any>;
  };
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider: 'mailgun' | 'mock' | 'error';
  error?: string;
}

/**
 * Checks whether the configured Mailgun credentials are live or placeholder
 */
function isRealMailgunConfig(apiKey?: string, domain?: string): boolean {
  if (!apiKey || !domain) return false;
  const lowerKey = apiKey.toLowerCase();
  const lowerDom = domain.toLowerCase();
  if (
    lowerKey.includes('your-mailgun') ||
    lowerKey.includes('your-api-key') ||
    lowerKey.includes('example') ||
    lowerDom.includes('yourdomain') ||
    lowerDom.includes('example.com')
  ) {
    return false;
  }
  return true;
}

/**
 * Sends outbound transactional email / agent reply via Mailgun API,
 * including RFC threading headers (In-Reply-To, References) and [Ticket #XXXX] in subject.
 */
export async function sendOutboundEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, toName, subject, text, html, ticketId, inReplyTo, references, httpClient } = options;

  const mailgunApiKey = process.env.MAILGUN_API_KEY?.trim();
  const mailgunDomain = process.env.MAILGUN_DOMAIN?.trim();
  const mailgunHost = process.env.MAILGUN_HOST?.trim() || 'api.mailgun.net';
  const supportEmail = process.env.SUPPORT_EMAIL || `support@${mailgunDomain || 'example.com'}`;

  // Ensure subject contains [Ticket #<id>] tag for conversation threading
  let formattedSubject = subject;
  if (ticketId && !formattedSubject.includes(`[Ticket #${ticketId}]`)) {
    formattedSubject = `[Ticket #${ticketId}] ${formattedSubject}`;
  }

  const recipientFormatted = toName ? `"${toName}" <${to}>` : to;
  const fromFormatted = `Support Team <${supportEmail}>`;

  // If real Mailgun credentials are configured (or httpClient is mocked in test), send via Mailgun REST API
  if ((isRealMailgunConfig(mailgunApiKey, mailgunDomain) || httpClient) && mailgunApiKey && mailgunDomain) {
    try {
      const url = `https://${mailgunHost}/v3/${mailgunDomain}/messages`;
      const authHeader = 'Basic ' + Buffer.from(`api:${mailgunApiKey}`).toString('base64');

      const formData = new URLSearchParams();
      formData.append('from', fromFormatted);
      formData.append('to', recipientFormatted);
      formData.append('subject', formattedSubject);
      formData.append('text', text);
      if (html) {
        formData.append('html', html);
      }

      // Add RFC threading headers if replying to an existing email
      if (inReplyTo) {
        formData.append('h:In-Reply-To', inReplyTo);
      }
      if (references && references.length > 0) {
        formData.append('h:References', references.join(' '));
      } else if (inReplyTo) {
        formData.append('h:References', inReplyTo);
      }

      const client = httpClient || axios;
      const response = await client.post(url, formData.toString(), {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return {
        success: true,
        messageId: response.data?.id,
        provider: 'mailgun',
      };
    } catch (err: any) {
      console.error('[Mailgun Outbound] Failed to send email:', err.response?.data || err.message);
      return {
        success: false,
        provider: 'mailgun',
        error: err.response?.data?.message || err.message,
      };
    }
  }

  // Development / Mock fallback when Mailgun credentials are placeholder or unset
  const mockMessageId = `<mock-${Date.now()}.${ticketId || 'outbound'}@helpdesk.local>`;
  console.info(`[Email Sender (Mock/Dev)] Sent email to ${recipientFormatted} with subject "${formattedSubject}" (Message-ID: ${mockMessageId})`);

  return {
    success: true,
    messageId: mockMessageId,
    provider: 'mock',
  };
}
