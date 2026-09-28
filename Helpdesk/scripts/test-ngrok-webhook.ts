import axios from 'axios';
import FormData from 'form-data';

async function testNgrokInboundWebhook() {
  const ngrokBaseUrl = 'https://grueling-subplot-unify.ngrok-free.dev';
  const webhookUrl = `${ngrokBaseUrl}/api/webhooks/mailgun`;

  console.log('====================================================');
  console.log('📥 TESTING LIVE INBOUND WEBHOOK VIA NGROK TUNNEL');
  console.log('====================================================');
  console.log(`Target Webhook Endpoint: ${webhookUrl}\n`);

  const testTimestamp = Date.now();
  const testStudentEmail = `live.student.${testTimestamp}@gmail.com`;
  const testSubject = `Question regarding course certification [LiveTest #${testTimestamp}]`;

  const apiKey = process.env.MAILGUN_API_KEY || '5130119f1d214b0d86e7c0fb01098258-7543e985-db715bc0';
  const token = 'test_token_' + testTimestamp;
  const timestamp = Math.floor(Date.now() / 1000);
  const crypto = require('crypto');
  const signature = crypto.createHmac('sha256', apiKey).update(`${timestamp}${token}`).digest('hex');

  const form = new FormData();
  form.append('token', token);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('sender', testStudentEmail);
  form.append('from', `Live Test Student <${testStudentEmail}>`);
  form.append('recipient', 'support@sandboxea1b3904caa14591a5186d29afc8d1a1.mailgun.org');
  form.append('subject', testSubject);
  form.append('stripped-text', 'Hello Support,\n\nI just finished the final exam and would like to know how to download my completion certificate.\n\nThank you!');
  form.append('body-plain', 'Hello Support,\n\nI just finished the final exam and would like to know how to download my completion certificate.\n\nThank you!');
  form.append('Message-Id', `<live-msg-${testTimestamp}@gmail.com>`);
  form.append(
    'message-headers',
    JSON.stringify([
      ['Message-Id', `<live-msg-${testTimestamp}@gmail.com>`],
      ['From', `Live Test Student <${testStudentEmail}>`],
      ['To', 'support@sandboxea1b3904caa14591a5186d29afc8d1a1.mailgun.org'],
      ['Subject', testSubject],
    ])
  );

  try {
    console.log('Posting simulated Mailgun webhook to ngrok endpoint...');
    const headers = {
      ...form.getHeaders(),
      'x-webhook-secret': 'whsec_helpdesk_inbound_secret_token_key_2026',
    };
    const response = await axios.post(webhookUrl, form, {
      headers,
      timeout: 15000,
    });

    console.log('\n✅ Webhook Response Status:', response.status, response.statusText);
    console.log('Webhook Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    if (error.response) {
      console.error('\n❌ Webhook Error Response:', error.response.status, error.response.data);
    } else {
      console.error('\n❌ Network Error:', error.message);
    }
  }
}

testNgrokInboundWebhook();
