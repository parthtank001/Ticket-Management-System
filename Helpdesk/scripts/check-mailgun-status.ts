import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

async function checkMailgunStatus() {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN || 'sandboxea1b3904caa14591a5186d29afc8d1a1.mailgun.org';
  const host = process.env.MAILGUN_HOST || 'api.mailgun.net';

  console.log('====================================================');
  console.log('🔍 MAILGUN CONFIGURATION & STATUS AUDIT');
  console.log('====================================================');
  console.log(`Domain: ${domain}`);
  console.log(`Host: ${host}`);
  console.log(`Support Email: ${process.env.SUPPORT_EMAIL || 'support@' + domain}\n`);

  const authHeader = 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64');

  // 1. Check Routes
  try {
    const routesRes = await axios.get(`https://${host}/v3/routes`, {
      headers: { Authorization: authHeader },
    });
    console.log('--- 1. Mailgun Inbound Routes ---');
    if (routesRes.data?.items?.length === 0) {
      console.log('⚠️ NO ROUTES CONFIGURED! Incoming emails to Mailgun will NOT be forwarded to your server.');
    } else {
      routesRes.data.items.forEach((r: any, idx: number) => {
        console.log(`Route #${idx + 1} [ID: ${r.id}]`);
        console.log(`  Description: ${r.description}`);
        console.log(`  Expression:  ${r.expression}`);
        console.log(`  Actions:     ${JSON.stringify(r.actions)}`);
      });
    }
  } catch (err: any) {
    console.error('❌ Failed to fetch routes:', err.response?.data || err.message);
  }

  // 2. Check Sandbox Authorized Recipients (if Sandbox domain)
  if (domain.startsWith('sandbox')) {
    console.log('\n--- 2. Sandbox Authorized Recipients ---');
    try {
      // In sandbox domains, check domain info
      const domainRes = await axios.get(`https://${host}/v3/domains/${domain}`, {
        headers: { Authorization: authHeader },
      });
      console.log(`Domain State: ${domainRes.data?.domain?.state}`);
      console.log(`Domain Type:  ${domainRes.data?.domain?.type}`);
    } catch (err: any) {
      console.log('Domain info fetch error:', err.response?.data?.message || err.message);
    }
  }

  console.log('\n====================================================');
}

checkMailgunStatus();
