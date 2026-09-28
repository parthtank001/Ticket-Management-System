import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import FormData from 'form-data';

async function updateRoute() {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN || 'sandboxea1b3904caa14591a5186d29afc8d1a1.mailgun.org';
  const routeId = '6aba2ef8e365980e1f3c804a';
  const targetWebhookUrl = 'https://grueling-subplot-unify.ngrok-free.dev/api/webhooks/mailgun';

  console.log('Fetching existing routes...');
  const existing = await axios.get('https://api.mailgun.net/v3/routes', {
    auth: { username: 'api', password: apiKey as string },
  });
  console.log('Existing routes:', JSON.stringify(existing.data, null, 2));

  console.log('\nUpdating route', routeId, 'to point to:', targetWebhookUrl);
  const form = new FormData();
  form.append('expression', `match_recipient(".*@${domain}")`);
  form.append('action', `forward("${targetWebhookUrl}")`);
  form.append('action', 'stop()');
  form.append('description', 'Helpdesk Inbound Email Webhook');

  const updateRes = await axios.put(`https://api.mailgun.net/v3/routes/${routeId}`, form, {
    auth: { username: 'api', password: apiKey as string },
    headers: form.getHeaders(),
  });

  console.log('\n✅ Route updated successfully:', JSON.stringify(updateRes.data, null, 2));
}

updateRoute().catch((err) => {
  console.error('❌ Error updating route:', err.response?.data || err.message);
});
