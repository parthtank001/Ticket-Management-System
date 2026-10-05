import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import FormData from 'form-data';

async function setupMailgunRoute() {
  const apiKey = process.env.MAILGUN_API_KEY?.trim();
  const domain = process.env.MAILGUN_DOMAIN?.trim() || 'sandbox4943779f95474358aca05128896546b0.mailgun.org';
  const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://helpdesk-ai-system.onrender.com';
  const secret = process.env.WEBHOOK_SECRET || 'whsec_helpdesk_inbound_secret_token_key_2026';
  const targetWebhook = `${renderUrl}/api/webhooks/mailgun?secret=${secret}`;

  console.log('====================================================');
  console.log('🔗 MAILGUN AUTOMATIC ROUTE CONFIGURATION');
  console.log('====================================================');
  console.log(`Domain: ${domain}`);
  console.log(`Forward Target: ${targetWebhook}\n`);

  if (!apiKey || apiKey.includes('your-mailgun')) {
    console.error('❌ Please set your new MAILGUN_API_KEY in Helpdesk/.env first.');
    process.exit(1);
  }

  const authHeader = 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64');

  try {
    console.log('1. Checking existing routes...');
    const routesRes = await axios.get('https://api.mailgun.net/v3/routes', {
      headers: { Authorization: authHeader },
    });

    const existingRoutes = routesRes.data?.items || [];
    console.log(`Found ${existingRoutes.length} existing route(s).`);

    // Delete any old outdated routes
    for (const r of existingRoutes) {
      console.log(`Deleting old route ${r.id} (${r.expression})...`);
      await axios.delete(`https://api.mailgun.net/v3/routes/${r.id}`, {
        headers: { Authorization: authHeader },
      });
    }

    // Create the new active forward route
    console.log('\n2. Creating new inbound route...');
    const form = new FormData();
    form.append('expression', `match_recipient(".*@${domain}")`);
    form.append('action', `forward("${targetWebhook}")`);
    form.append('action', 'stop()');
    form.append('description', 'Helpdesk Inbound Webhook Route');

    const createRes = await axios.post('https://api.mailgun.net/v3/routes', form, {
      headers: {
        Authorization: authHeader,
        ...form.getHeaders(),
      },
    });

    console.log('\n🎉 SUCCESS! Route created successfully:');
    console.log(JSON.stringify(createRes.data, null, 2));
    console.log('\nAll emails sent to any address @' + domain + ' will now automatically create Helpdesk tickets!');
  } catch (err: any) {
    console.error('❌ Failed to configure route:', err.response?.data || err.message);
  }
}

setupMailgunRoute();
