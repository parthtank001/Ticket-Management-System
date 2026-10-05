#!/usr/bin/env node

/**
 * 🔄 Keep-Alive Pinger for Render Free Tier Web Services
 * 
 * Usage:
 *   node scripts/keep-alive.js <your-render-url>
 *   node scripts/keep-alive.js https://your-service.onrender.com/api/health
 * 
 * Or set environment variable:
 *   TARGET_URL=https://your-service.onrender.com node scripts/keep-alive.js
 */

const https = require('https');
const http = require('http');

// Target URL from argument or environment variable
let targetUrl = process.argv[2] || process.env.TARGET_URL || process.env.RENDER_URL;

if (!targetUrl) {
  console.log('⚠️ No URL specified. Usage: node scripts/keep-alive.js <URL>');
  console.log('Example: node scripts/keep-alive.js https://helpdesk-ai-system.onrender.com');
  process.exit(1);
}

// Ensure /api/health endpoint is targeted if only base URL provided
if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
  targetUrl = `https://${targetUrl}`;
}

if (!targetUrl.includes('/api/')) {
  targetUrl = targetUrl.replace(/\/+$/, '') + '/api/health';
}

// Interval in milliseconds (10 minutes = 600,000 ms to stay well under Render's 15 min idle threshold)
const INTERVAL_MINUTES = parseInt(process.env.INTERVAL_MINUTES || '10', 10);
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

let pingCount = 0;
let successCount = 0;
let failCount = 0;
const startTime = new Date();

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function ping() {
  pingCount++;
  const client = targetUrl.startsWith('https') ? https : http;
  const startPingTime = Date.now();

  console.log(`\n[${getTimestamp()}] 📡 Ping #${pingCount} -> ${targetUrl}`);

  const req = client.get(targetUrl, { timeout: 30000 }, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const duration = Date.now() - startPingTime;
      if (res.statusCode >= 200 && res.statusCode < 400) {
        successCount++;
        console.log(`[${getTimestamp()}] ✅ SUCCESS (${res.statusCode} ${res.statusMessage}) - Latency: ${duration}ms [Total Successes: ${successCount}]`);
      } else {
        failCount++;
        console.log(`[${getTimestamp()}] ⚠️ STATUS ${res.statusCode} - Latency: ${duration}ms [Total Failures: ${failCount}]`);
      }
    });
  });

  req.on('timeout', () => {
    failCount++;
    console.error(`[${getTimestamp()}] ⏱️ REQUEST TIMEOUT (>30s) - The server might be cold-starting`);
    req.destroy();
  });

  req.on('error', (err) => {
    failCount++;
    console.error(`[${getTimestamp()}] ❌ ERROR: ${err.message}`);
  });
}

console.log('='.repeat(65));
console.log('🚀 Render Server Keep-Alive Service Started');
console.log(`📍 Target Endpoint: ${targetUrl}`);
console.log(`⏱️ Ping Frequency : Every ${INTERVAL_MINUTES} minutes`);
console.log(`🕒 Started At      : ${getTimestamp()}`);
console.log('='.repeat(65));

// Run initial ping immediately
ping();

// Schedule recurring ping
const intervalId = setInterval(ping, INTERVAL_MS);

// Handle graceful shutdown
function shutdown() {
  console.log('\n' + '='.repeat(65));
  console.log('🛑 Keep-Alive Service Stopped');
  console.log(`📊 Statistics: Total Pings: ${pingCount} | Success: ${successCount} | Failed: ${failCount}`);
  console.log(`⏱️ Ran for: ${Math.round((Date.now() - startTime.getTime()) / 60000)} minutes`);
  console.log('='.repeat(65));
  clearInterval(intervalId);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
