import { test, expect, APIRequestContext } from '@playwright/test';
import process from 'node:process';

// Environment & Configuration variables
const API_BASE_URL = process.env.API_BASE_URL || process.env.API_URL || process.env.VITE_API_URL!;
const CLIENT_ORIGIN: string = process.env.PLAYWRIGHT_BASE_URL!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL!;

// API Endpoints
const INBOUND_EMAIL_ENDPOINT = '/api/emails/inbound';
const WEBHOOK_EMAIL_ENDPOINT = '/api/webhooks/email';
const SUPPORT_ADDRESS_ENDPOINT = '/api/emails/support-address';
const WEBHOOK_LOGS_ENDPOINT = '/api/webhooks/logs';
const TICKETS_ENDPOINT = '/api/tickets';
const AUTH_SIGN_IN_ENDPOINT = '/api/auth/sign-in/email';

test.describe('Inbound Support Email Ingestion & Conversion Suite', () => {
  let adminContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    adminContext = await playwright.request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Origin': CLIENT_ORIGIN,
      },
    });

    const adminSignIn = await adminContext.post(AUTH_SIGN_IN_ENDPOINT, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(adminSignIn.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    await adminContext?.dispose();
  });

  test.describe('1. Support Address Information Endpoint', () => {
    test('GET /api/emails/support-address returns configured support email and inbound webhook URLs', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}${SUPPORT_ADDRESS_ENDPOINT}`);
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.supportEmail).toBeDefined();
      expect(body.inboundWebhookUrl).toBe(WEBHOOK_EMAIL_ENDPOINT);
      expect(body.inboundDirectUrl).toBe(INBOUND_EMAIL_ENDPOINT);
      expect(body.threadingFormat).toBe('[Ticket #XXXX]');
      expect(body.antiLoopProtection).toBe('enabled');
    });
  });

  test.describe('2. Direct Inbound Email Ticket Conversion (POST /api/emails/inbound)', () => {
    test('converts an inbound email to a plain ticket without AI processing', async ({ request }) => {
      const timestamp = Date.now();
      const studentEmail = `maya.lin.${timestamp}@student.edu`;
      const senderName = 'Maya Lin';
      const subject = 'Cannot login to my student account';
      const bodyContent = 'Hello Support,\n\nI have been trying to log into the student portal for the past hour and keep getting a password error. Could you reset my access?\n\nThank you,\nMaya';
      const messageId = `<inbound-msg-${timestamp}@student.edu>`;

      const emailPayload = {
        from: `${senderName} <${studentEmail}>`,
        to: SUPPORT_EMAIL,
        subject,
        body: bodyContent,
        messageId,
      };

      const response = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: emailPayload,
      });

      expect(response.status()).toBe(201);
      const data = await response.json();

      expect(data.status).toBe('created');
      expect(data.message).toMatch(/converted into a new support ticket/i);
      expect(data.ticket).toBeDefined();
      expect(data.ticketNumber).toBeDefined();

      const ticket = data.ticket;
      expect(typeof ticket.id).toBe('number');
      expect(ticket.id).toBeGreaterThan(0);
      expect(ticket.studentEmail).toBe(studentEmail);
      expect(ticket.studentName).toBe(senderName);
      expect(ticket.subject).toBe(subject);
      expect(ticket.status).toBe('OPEN');
      expect(ticket.category).toBeNull();
      expect(ticket.priority).toBe('MEDIUM');

      // Verify no AI draft or summary is generated (plain ticket)
      expect(ticket.summary).toBeNull();
      expect(ticket.aiDraftResponse).toBeNull();

      // Verify initial ticket message
      expect(ticket.messages).toHaveLength(1);
      expect(ticket.messages[0].senderType).toBe('STUDENT');
      expect(ticket.messages[0].senderEmail).toBe(studentEmail);
      expect(ticket.messages[0].body).toContain('trying to log into the student portal');
      expect(ticket.messages[0].messageId).toBe(`inbound-msg-${timestamp}@student.edu`);
    });

    test('converts email inquiry into a plain support ticket with null category and default priority', async ({ request }) => {
      const timestamp = Date.now();
      const emailPayload = {
        from: `Liam Davis <liam.davis.${timestamp}@college.edu>`,
        to: SUPPORT_EMAIL,
        subject: 'Refund request for dropped chemistry course',
        body: 'I dropped Chemistry 101 within the add/drop window. Can you please process my tuition refund to my original payment card?',
        messageId: `<refund-inquiry-${timestamp}@college.edu>`,
      };

      const response = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: emailPayload,
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(typeof data.ticket.id).toBe('number');
      expect(data.ticket.category).toBeNull();
      expect(data.ticket.priority).toBe('MEDIUM');
      expect(data.ticket.summary).toBeNull();
      expect(data.ticket.aiDraftResponse).toBeNull();
    });
  });

  test.describe('3. Email Gateway Webhook Compatibility (POST /api/webhooks/email)', () => {
    test('handles SendGrid Inbound Parse format with HTML body fallback', async ({ request }) => {
      const timestamp = Date.now();
      const studentEmail = `carlos.${timestamp}@university.edu`;
      const studentName = 'Carlos Santana';
      const sendgridPayload = {
        from: `"${studentName}" <${studentEmail}>`,
        to: SUPPORT_EMAIL,
        subject: 'General Question about graduation commencement date',
        html: '<p>Hi Support,</p><p>When is the deadline to RSVP for commencement?</p>',
        headers: JSON.stringify({
          'Message-ID': `<sendgrid-msg-${timestamp}@mail.sendgrid.net>`,
          'Date': new Date().toUTCString(),
        }),
      };

      const response = await request.post(`${API_BASE_URL}${WEBHOOK_EMAIL_ENDPOINT}`, {
        data: sendgridPayload,
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.status).toBe('created');
      expect(typeof data.ticket.id).toBe('number');
      expect(data.ticket.studentName).toBe(studentName);
      expect(data.ticket.studentEmail).toBe(studentEmail);
      expect(data.ticket.category).toBeNull();
      expect(data.ticket.messages[0].body).toContain('When is the deadline to RSVP for commencement?');
    });

    test('handles Mailgun Inbound Parse format with stripped-text field', async ({ request }) => {
      const timestamp = Date.now();
      const studentEmail = `olivia.${timestamp}@school.edu`;
      const mailgunPayload = {
        sender: studentEmail,
        recipient: SUPPORT_EMAIL,
        subject: 'Login error on canvas platform',
        'stripped-text': 'I am seeing a 403 Forbidden page when navigating to canvas.',
        'Message-Id': `<mailgun-${timestamp}@school.edu>`,
      };

      const response = await request.post(`${API_BASE_URL}${WEBHOOK_EMAIL_ENDPOINT}`, {
        data: mailgunPayload,
      });

      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.status).toBe('created');
      expect(typeof data.ticket.id).toBe('number');
      expect(data.ticket.studentEmail).toBe(studentEmail);
      expect(data.ticket.category).toBeNull();
    });
  });

  test.describe('4. Conversation Threading & Ticket Matching', () => {
    test('threads reply into existing ticket when [Ticket #XXXX] subject tag is present', async ({ request }) => {
      const timestamp = Date.now();
      const studentEmail = `marcus.${timestamp}@stoic.edu`;
      const senderName = 'Marcus Aurelius';

      // Step 1: Create initial ticket via email
      const initialRes = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: {
          from: `${senderName} <${studentEmail}>`,
          to: SUPPORT_EMAIL,
          subject: 'Need clarification on midterm grading policy',
          body: 'What percentage of our grade is the midterm exam?',
          messageId: `<initial-${timestamp}@stoic.edu>`,
        },
      });
      expect(initialRes.status()).toBe(201);
      const initialData = await initialRes.json();
      const ticketNumber = initialData.ticketNumber;
      const ticketId = initialData.ticket.id;

      // Step 2: Student replies with [Ticket #XXXX] tag in subject
      const replyRes = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: {
          from: `${senderName} <${studentEmail}>`,
          to: SUPPORT_EMAIL,
          subject: `Re: [Ticket #${ticketNumber}] Need clarification on midterm grading policy`,
          body: 'Also, is the midterm cumulative or only chapters 1-4?',
          messageId: `<reply-${timestamp}@stoic.edu>`,
          inReplyTo: `<initial-${timestamp}@stoic.edu>`,
        },
      });

      expect(replyRes.status()).toBe(200);
      const replyData = await replyRes.json();

      expect(replyData.status).toBe('appended');
      expect(replyData.ticketId).toBe(ticketId);
      expect(replyData.ticketNumber).toBe(ticketNumber);
      expect(replyData.message.body).toContain('is the midterm cumulative');

      // Step 3: Verify ticket messages count in database via GET /api/tickets
      const ticketsRes = await adminContext.get(TICKETS_ENDPOINT);
      expect(ticketsRes.status()).toBe(200);
      const allTickets = await ticketsRes.json();
      const updatedTicket = allTickets.find((t: any) => t.id === ticketId);
      expect(updatedTicket).toBeDefined();
      expect(updatedTicket.messages.length).toBe(2);
      expect(updatedTicket.messages[1].body).toContain('is the midterm cumulative');
    });

    test('threads reply into existing ticket via In-Reply-To Message-ID matching', async ({ request }) => {
      const timestamp = Date.now();
      const studentEmail = `elena.${timestamp}@domain.com`;
      const senderName = 'Elena Rostova';

      // Step 1: Create initial ticket
      const initialMsgId = `root-msg-${timestamp}@domain.com`;
      const initialRes = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: {
          from: `${senderName} <${studentEmail}>`,
          to: SUPPORT_EMAIL,
          subject: 'Library VPN connection issues',
          body: 'VPN disconnects every 5 minutes.',
          messageId: `<${initialMsgId}>`,
        },
      });
      expect(initialRes.status()).toBe(201);
      const initialData = await initialRes.json();
      const ticketId = initialData.ticket.id;

      // Step 2: Send reply without ticket tag in subject, but with In-Reply-To header
      const replyRes = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: {
          from: `${senderName} <${studentEmail}>`,
          to: SUPPORT_EMAIL,
          subject: 'Re: Library VPN connection issues',
          body: 'I tried on another laptop and the issue persists.',
          messageId: `<reply-followup-${timestamp}@domain.com>`,
          inReplyTo: `<${initialMsgId}>`,
        },
      });

      expect(replyRes.status()).toBe(200);
      const replyData = await replyRes.json();
      expect(replyData.status).toBe('appended');
      expect(replyData.ticketId).toBe(ticketId);
    });

    test('reopens a RESOLVED ticket back to OPEN when student replies', async ({ request }) => {
      const timestamp = Date.now();
      const studentEmail = `sam.${timestamp}@blackarrow.com`;
      const senderName = 'Sam Fisher';

      // Step 1: Create ticket
      const initialRes = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: {
          from: `${senderName} <${studentEmail}>`,
          to: SUPPORT_EMAIL,
          subject: 'Access card deactivated',
          body: 'My building access badge is not scanning.',
          messageId: `<badge-msg-${timestamp}@blackarrow.com>`,
        },
      });
      expect(initialRes.status()).toBe(201);
      const { ticket } = await initialRes.json();

      // Step 2: Agent marks ticket as RESOLVED
      const updateRes = await adminContext.patch(`${TICKETS_ENDPOINT}/${ticket.id}`, {
        data: { status: 'RESOLVED' },
      });
      expect(updateRes.status()).toBe(200);
      const resolvedTicket = await updateRes.json();
      expect(resolvedTicket.status).toBe('RESOLVED');

      // Step 3: Student emails reply indicating problem is not fixed
      const replyRes = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: {
          from: `${senderName} <${studentEmail}>`,
          to: SUPPORT_EMAIL,
          subject: `[Ticket #${ticket.id}] Access card deactivated`,
          body: 'The card is still flashing red at the lab door.',
          messageId: `<badge-followup-${timestamp}@blackarrow.com>`,
        },
      });

      expect(replyRes.status()).toBe(200);

      // Step 4: Verify ticket status reopened from RESOLVED back to OPEN
      const ticketsRes = await adminContext.get(TICKETS_ENDPOINT);
      const allTickets = await ticketsRes.json();
      const updatedTicket = allTickets.find((t: any) => t.id === ticket.id);
      expect(updatedTicket.status).toBe('OPEN');
    });
  });

  test.describe('5. Anti-Loop Protection (Ignoring Automated Auto-Responders)', () => {
    test('safely ignores incoming email with Auto-Submitted: auto-replied header', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: {
          from: 'auto-responder@corporate.com',
          to: SUPPORT_EMAIL,
          subject: 'Automatic reply: Out of the Office',
          body: 'I will be out of the office with no access to email.',
          headers: {
            'Auto-Submitted': 'auto-replied',
          },
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('ignored');
      expect(body.message).toMatch(/auto-submitted|reply loop/i);
    });

    test('safely ignores incoming email with Auto-Submitted: auto-generated header', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}${WEBHOOK_EMAIL_ENDPOINT}`, {
        data: {
          from: 'mailer-daemon@server.net',
          to: SUPPORT_EMAIL,
          subject: 'Delivery Status Notification (Failure)',
          body: 'Delivery to the following recipient failed permanently.',
          headers: {
            'auto-submitted': 'auto-generated',
          },
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('ignored');
    });

    test('safely ignores incoming email with automatic out-of-office subject line', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: {
          from: 'vacationing.student@domain.edu',
          to: SUPPORT_EMAIL,
          subject: 'Automatic reply: On Annual Leave until Sep 20',
          body: 'Thanks for contacting me. I am currently out of town.',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('ignored');
    });
  });

  test.describe('6. Duplicate Prevention & Validation Guards', () => {
    test('handles duplicate webhook deliveries gracefully without duplicating messages', async ({ request }) => {
      const timestamp = Date.now();
      const uniqueMsgId = `duplicate-test-${timestamp}@domain.com`;

      const payload = {
        from: `Dana Scully <dana.${timestamp}@fbi.gov>`,
        to: SUPPORT_EMAIL,
        subject: 'Evidence submission question',
        body: 'Where do I send the digital forensics files?',
        messageId: `<${uniqueMsgId}>`,
      };

      // First ingestion: Creates ticket
      const firstRes = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: payload,
      });
      expect(firstRes.status()).toBe(201);

      // Second ingestion (same Message-ID delivery retry): Safely handled
      const secondRes = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: payload,
      });
      expect(secondRes.status()).toBe(200);
      const secondBody = await secondRes.json();
      expect(secondBody.status).toBe('duplicate');
    });

    test('returns 400 Bad Request when email has no sender or empty body', async ({ request }) => {
      // Missing sender
      const noSenderRes = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: {
          from: '',
          to: SUPPORT_EMAIL,
          subject: 'No sender',
          body: 'Hello',
        },
      });
      expect(noSenderRes.status()).toBe(400);

      // Missing body
      const noBodyRes = await request.post(`${API_BASE_URL}${INBOUND_EMAIL_ENDPOINT}`, {
        data: {
          from: 'user@example.com',
          to: SUPPORT_EMAIL,
          subject: 'No body',
          body: '',
          html: '',
        },
      });
      expect(noBodyRes.status()).toBe(400);
    });
  });

  test.describe('7. Webhook Audit Logs Endpoint (GET /api/webhooks/logs)', () => {
    test('allows authenticated Admin to retrieve webhook audit logs', async () => {
      const logsRes = await adminContext.get(WEBHOOK_LOGS_ENDPOINT);
      expect(logsRes.status()).toBe(200);
      const logs = await logsRes.json();
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toHaveProperty('id');
      expect(logs[0]).toHaveProperty('source');
      expect(logs[0]).toHaveProperty('status');
      expect(logs[0]).toHaveProperty('createdAt');
    });

    test('rejects unauthenticated requests with 401 Unauthorized', async ({ request }) => {
      const unauthRes = await request.get(`${API_BASE_URL}${WEBHOOK_LOGS_ENDPOINT}`);
      expect(unauthRes.status()).toBe(401);
    });
  });
});
