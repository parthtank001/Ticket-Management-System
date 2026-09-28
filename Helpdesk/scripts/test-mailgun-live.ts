import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

async function testKeyCombinations() {
  const rawKey = process.env.MAILGUN_API_KEY || '';
  const variations = [
    { name: 'Raw key on US endpoint', key: rawKey, host: 'api.mailgun.net' },
    { name: 'Raw key on EU endpoint', key: rawKey, host: 'api.eu.mailgun.net' },
    { name: 'Key with "key-" prefix on US', key: rawKey.startsWith('key-') ? rawKey : `key-${rawKey}`, host: 'api.mailgun.net' },
    { name: 'Key with "key-" prefix on EU', key: rawKey.startsWith('key-') ? rawKey : `key-${rawKey}`, host: 'api.eu.mailgun.net' },
  ];

  console.log('Testing Mailgun API Key formats and regions...');

  for (const v of variations) {
    try {
      console.log(`\nTesting: ${v.name} (Host: ${v.host})...`);
      const authHeader = 'Basic ' + Buffer.from(`api:${v.key}`).toString('base64');
      const response = await axios.get(`https://${v.host}/v3/domains`, {
        headers: { Authorization: authHeader },
        timeout: 8000,
      });

      console.log(`🎉 SUCCESS with "${v.name}"!`);
      console.log('Domains found:', response.data?.items?.map((d: any) => d.name));
      return { successfulKey: v.key, successfulHost: v.host, domains: response.data?.items };
    } catch (err: any) {
      console.log(`❌ Failed: ${err.response?.status || err.message} - ${JSON.stringify(err.response?.data || {})}`);
    }
  }

  console.log('\n⚠️ None of the key variations authenticated with Mailgun API.');
}

testKeyCombinations();
