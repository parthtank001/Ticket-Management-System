import dotenv from 'dotenv';
dotenv.config();

import { sendOutboundEmail } from '../server/services/email-sender';

async function testLiveOutbound() {
  const targetEmail = process.argv[2] || process.env.TEST_RECIPIENT_EMAIL;

  console.log('====================================================');
  console.log('📬 MAILGUN LIVE OUTBOUND TEST');
  console.log('====================================================\n');

  if (!targetEmail) {
    console.log('⚠️ No recipient email specified.');
    console.log('Usage: npx tsx scripts/test-mailgun-send.ts <your-authorized-email@example.com>\n');
    console.log('Note: For Mailgun sandbox domains, the recipient email MUST be added');
    console.log('under "Authorized Recipients" in your Mailgun sandbox domain dashboard.');
    process.exit(0);
  }

  console.log(`Sending test email to authorized recipient: ${targetEmail}`);
  console.log(`Using Mailgun Domain: ${process.env.MAILGUN_DOMAIN}`);
  console.log(`Sender: ${process.env.SUPPORT_EMAIL || 'support@' + process.env.MAILGUN_DOMAIN}\n`);

  try {
    const result = await sendOutboundEmail({
      to: targetEmail,
      toName: 'Helpdesk Test User',
      subject: 'Live Test from Helpdesk Ticket System',
      text: 'Hello!\n\nThis is a live test email sent from your Helpdesk Ticket Management System via Mailgun.\n\nEverything is working properly!',
      html: '<p>Hello!</p><p>This is a live test email sent from your <strong>Helpdesk Ticket Management System</strong> via Mailgun.</p><p>Everything is working properly!</p>',
      ticketId: 101,
    });

    console.log('Result:', result);
    if (result.success) {
      console.log('\n🎉 SUCCESS! Test email has been sent successfully.');
      console.log(`Message ID: ${result.messageId}`);
    } else {
      console.error('\n❌ Sending failed:', result.error);
    }
  } catch (err: any) {
    console.error('\n❌ Unexpected error:', err.message || err);
  }
}

testLiveOutbound();
