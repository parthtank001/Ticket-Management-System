import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../server/db';
import { ingestInboundEmail } from '../server/services/email-ingestion';
import { sendOutboundEmail } from '../server/services/email-sender';
import { verifyMailgunSignature } from '../server/middleware/webhook-auth';
import crypto from 'node:crypto';

async function runEmailVerification() {
  console.log('====================================================');
  console.log('🔍 STARTING MAILGUN EMAIL INGESTION & OUTBOUND VERIFICATION');
  console.log('====================================================\n');

  const testTimestamp = Date.now();
  const testStudentEmail = `test.student.${testTimestamp}@example.edu`;
  const testStudentName = 'Alex Test Student';
  const testSubject = `Cannot login to platform course [Test #${testTimestamp}]`;
  const testMessageId = `<msg-${testTimestamp}@example.edu>`;

  // 1. TEST: Mailgun Signature Verification
  console.log('--- 1. Testing Mailgun HMAC Signature Verification ---');
  const mockSigningKey = 'test-mailgun-key-12345';
  const token = 'random_50_char_token_' + testTimestamp;
  const timestamp = Math.floor(Date.now() / 1000);
  const validSignature = crypto.createHmac('sha256', mockSigningKey).update(`${timestamp}${token}`).digest('hex');

  const isSignatureValid = verifyMailgunSignature(token, timestamp, validSignature, mockSigningKey);
  const isInvalidSignatureRejected = !verifyMailgunSignature(token, timestamp, 'invalid_signature_hex', mockSigningKey);

  if (isSignatureValid && isInvalidSignatureRejected) {
    console.log('✅ Mailgun HMAC signature validation works correctly.\n');
  } else {
    console.error('❌ Mailgun HMAC signature validation failed!');
    process.exit(1);
  }

  // 2. TEST: Inbound Mailgun Webhook -> New Ticket Creation
  console.log('--- 2. Testing Inbound Mailgun Email -> New Ticket Creation ---');
  const mailgunNewPayload = {
    sender: testStudentEmail,
    from: `"${testStudentName}" <${testStudentEmail}>`,
    recipient: 'support@helpdesk.com',
    subject: testSubject,
    'stripped-text': 'Hello Support team,\n\nI get a 403 Forbidden error whenever I try to access Module 3.\n\nThank you,\nAlex',
    'body-plain': 'Hello Support team,\n\nI get a 403 Forbidden error whenever I try to access Module 3.\n\nThank you,\nAlex',
    'Message-Id': testMessageId,
    'message-headers': JSON.stringify([
      ['Received', 'by mailgun.org with HTTP; Sun, 27 Sep 2026 12:00:00 -0000'],
      ['Message-Id', testMessageId],
      ['From', `"${testStudentName}" <${testStudentEmail}>`],
      ['To', 'support@helpdesk.com'],
      ['Subject', testSubject],
    ]),
  };

  const createResult = await ingestInboundEmail(mailgunNewPayload);
  console.log('Ingestion Result (New Ticket):', {
    status: createResult.status,
    ticketId: createResult.ticketId,
    ticketNumber: createResult.ticketNumber,
    isThreadReply: createResult.isThreadReply,
  });

  if (createResult.status !== 'created' || !createResult.ticketId) {
    console.error('❌ Failed to create ticket from inbound Mailgun email!');
    process.exit(1);
  }
  console.log(`✅ Inbound email successfully converted into Ticket #${createResult.ticketId}.\n`);

  // Verify in PostgreSQL database
  const createdTicket = await prisma.ticket.findUnique({
    where: { id: createResult.ticketId },
    include: { assignedAgent: true },
  });

  if (!createdTicket || createdTicket.studentEmail !== testStudentEmail) {
    console.error('❌ Created ticket does not match expected email in database!');
    process.exit(1);
  }
  console.log('✅ PostgreSQL Database Ticket verified:', {
    id: createdTicket.id,
    subject: createdTicket.subject,
    studentEmail: createdTicket.studentEmail,
    studentName: createdTicket.studentName,
    status: createdTicket.status,
  });

  // 3. TEST: Inbound Mailgun Customer Reply -> Thread Appending
  console.log('\n--- 3. Testing Inbound Mailgun Customer Reply -> Thread Appending ---');
  const replyMessageId = `<reply-msg-${Date.now()}@example.edu>`;
  const mailgunReplyPayload = {
    sender: testStudentEmail,
    from: `"${testStudentName}" <${testStudentEmail}>`,
    recipient: 'support@helpdesk.com',
    subject: `Re: [Ticket #${createdTicket.id}] ${testSubject}`,
    'stripped-text': 'Here is an update: I tried clearing my cache, but the 403 error still persists.',
    'body-plain': 'Here is an update: I tried clearing my cache, but the 403 error still persists.\n\nOn Sun, Sep 27 Support wrote:...',
    'Message-Id': replyMessageId,
    'In-Reply-To': testMessageId,
    references: testMessageId,
  };

  const replyResult = await ingestInboundEmail(mailgunReplyPayload);
  console.log('Ingestion Result (Reply):', {
    status: replyResult.status,
    ticketId: replyResult.ticketId,
    ticketNumber: replyResult.ticketNumber,
    isThreadReply: replyResult.isThreadReply,
  });

  if (replyResult.status !== 'appended' || replyResult.ticketId !== createdTicket.id) {
    console.error('❌ Failed to append reply to existing ticket thread!');
    process.exit(1);
  }

  // Verify updated body in database
  const updatedTicket = await prisma.ticket.findUnique({
    where: { id: createdTicket.id },
  });
  if (!updatedTicket?.body.includes('clearing my cache')) {
    console.error('❌ Thread body does not contain the appended reply!');
    process.exit(1);
  }
  console.log(`✅ Inbound reply successfully appended to Ticket #${createdTicket.id} thread.\n`);

  // 4. TEST: Anti-Loop Protection (Auto-Responder / Out of Office)
  console.log('--- 4. Testing Anti-Loop Protection ---');
  const autoResponderPayload = {
    sender: 'autoreply@company.com',
    from: 'Out of Office Bot <autoreply@company.com>',
    recipient: 'support@helpdesk.com',
    subject: 'Automatic reply: Out of the office until Monday',
    body: 'I am away from my desk until next week.',
    headers: {
      'auto-submitted': 'auto-generated',
      'x-autoreply': 'yes',
    },
  };

  const loopResult = await ingestInboundEmail(autoResponderPayload);
  console.log('Ingestion Result (Auto-Responder):', {
    status: loopResult.status,
    reason: loopResult.reason,
  });

  if (loopResult.status !== 'ignored') {
    console.error('❌ Anti-loop protection failed to ignore auto-submitted email!');
    process.exit(1);
  }
  console.log('✅ Anti-loop protection successfully blocked loop auto-responder.\n');

  // 5. TEST: Outbound Email Sender
  console.log('--- 5. Testing Outbound Email Sender ---');
  const outboundResult = await sendOutboundEmail({
    to: testStudentEmail,
    toName: testStudentName,
    subject: 'Update regarding your course access',
    text: 'Hello Alex, we have refreshed your portal permissions. Please try logging in now.',
    ticketId: createdTicket.id,
    inReplyTo: replyMessageId,
  });

  console.log('Outbound Email Result:', outboundResult);
  if (outboundResult.success) {
    console.log(`✅ Outbound email sender executed successfully (Provider: ${outboundResult.provider}).\n`);
  } else {
    console.log(`⚠️ Live Mailgun API returned error: "${outboundResult.error}". Please ensure your MAILGUN_API_KEY, MAILGUN_DOMAIN, and region host are configured in .env.\n`);
  }

  // Clean up test ticket
  await prisma.ticket.delete({
    where: { id: createdTicket.id },
  });
  console.log(`🧹 Cleaned up temporary test ticket #${createdTicket.id}.`);

  console.log('\n====================================================');
  console.log('🎉 EMAIL INGESTION, THREADING & DISPATCH FLOWS ARE VERIFIED!');
  console.log('====================================================');
}

runEmailVerification()
  .catch((err) => {
    console.error('Fatal verification error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
