import axios from 'axios';
import FormData from 'form-data';

async function sendUserTestEmail() {
  const ngrokBaseUrl = 'https://grueling-subplot-unify.ngrok-free.dev';
  const webhookUrl = `${ngrokBaseUrl}/api/webhooks/mailgun`;

  console.log('====================================================');
  console.log('📥 INGESTING TEST EMAIL FROM parthstank001@gmail.com');
  console.log('====================================================');
  console.log(`Target Endpoint: ${webhookUrl}\n`);

  const testTimestamp = Date.now();
  const studentEmail = 'parthstank001@gmail.com';
  const studentName = 'Parth Tank';
  const subject = 'Need help with course completion certificate';
  const bodyText = 'Hi support, I finished the course today and would like to know how to download my completion certificate. Thank you!';
  const messageId = `<msg-${testTimestamp}@gmail.com>`;

  const form = new FormData();
  form.append('sender', studentEmail);
  form.append('from', `${studentName} <${studentEmail}>`);
  form.append('recipient', 'support@sandboxea1b3904caa14591a5186d29afc8d1a1.mailgun.org');
  form.append('subject', subject);
  form.append('stripped-text', bodyText);
  form.append('body-plain', bodyText);
  form.append('Message-Id', messageId);
  form.append(
    'message-headers',
    JSON.stringify([
      ['Message-Id', messageId],
      ['From', `${studentName} <${studentEmail}>`],
      ['To', 'support@sandboxea1b3904caa14591a5186d29afc8d1a1.mailgun.org'],
      ['Subject', subject],
    ])
  );

  try {
    const response = await axios.post(webhookUrl, form, {
      headers: form.getHeaders(),
      timeout: 15000,
    });

    console.log('✅ Webhook Response Status:', response.status, response.statusText);
    console.log('Webhook Ingestion Result:\n', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error('❌ Webhook Error Response:', error.response.status, error.response.data);
    } else {
      console.error('❌ Network Error:', error.message);
    }
  }
}

sendUserTestEmail();
