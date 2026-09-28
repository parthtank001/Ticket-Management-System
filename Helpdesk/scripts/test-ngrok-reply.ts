import axios from 'axios';
import FormData from 'form-data';

async function testNgrokInboundReply() {
  const ngrokBaseUrl = 'https://grueling-subplot-unify.ngrok-free.dev';
  const webhookUrl = `${ngrokBaseUrl}/api/webhooks/mailgun`;
  const ticketId = 329;

  console.log('====================================================');
  console.log(`📥 TESTING INBOUND CUSTOMER REPLY TO TICKET #${ticketId} VIA NGROK`);
  console.log('====================================================\n');

  const testTimestamp = Date.now();
  const testStudentEmail = `live.student.1790587390191@gmail.com`;
  const testSubject = `Re: [Ticket #329] Question regarding course certification [LiveTest #1790587390191]`;

  const form = new FormData();
  form.append('sender', testStudentEmail);
  form.append('from', `Live Test Student <${testStudentEmail}>`);
  form.append('recipient', 'support@sandboxea1b3904caa14591a5186d29afc8d1a1.mailgun.org');
  form.append('subject', testSubject);
  form.append('stripped-text', 'Thanks! I found the certificate under my profile settings.');
  form.append('body-plain', 'Thanks! I found the certificate under my profile settings.');
  form.append('In-Reply-To', `<live-msg-1790587390191@gmail.com>`);
  form.append('references', `<live-msg-1790587390191@gmail.com>`);
  form.append(
    'message-headers',
    JSON.stringify([
      ['In-Reply-To', `<live-msg-1790587390191@gmail.com>`],
      ['References', `<live-msg-1790587390191@gmail.com>`],
      ['From', `Live Test Student <${testStudentEmail}>`],
      ['To', 'support@sandboxea1b3904caa14591a5186d29afc8d1a1.mailgun.org'],
      ['Subject', testSubject],
    ])
  );

  try {
    const headers = {
      ...form.getHeaders(),
      'x-webhook-secret': 'whsec_helpdesk_inbound_secret_token_key_2026',
    };
    const response = await axios.post(webhookUrl, form, {
      headers,
      timeout: 15000,
    });

    console.log('✅ Webhook Response Status:', response.status, response.statusText);
    console.log('Webhook Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    if (error.response) {
      console.error('❌ Webhook Error Response:', error.response.status, error.response.data);
    } else {
      console.error('❌ Network Error:', error.message);
    }
  }
}

testNgrokInboundReply();
