import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

/**
 * Verifies Mailgun HMAC-SHA256 Webhook Signature.
 * Mailgun hashes (timestamp + token) using the Mailgun Webhook Signing Key.
 */
export function verifyMailgunSignature(
  token?: string,
  timestamp?: string | number,
  signature?: string,
  signingKey?: string
): boolean {
  if (!token || !timestamp || !signature || !signingKey) {
    return false;
  }

  const timeNum = typeof timestamp === 'number' ? timestamp : parseInt(String(timestamp), 10);
  if (isNaN(timeNum)) return false;

  // Replay Protection: Reject requests older than 15 minutes (900 seconds)
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timeNum) > 900) {
    console.warn(`[Mailgun Auth] Webhook timestamp expired: ${timeNum}, current: ${nowSec}`);
    return false;
  }

  try {
    const hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(`${timestamp}${token}`);
    const expectedSignature = hmac.digest('hex');

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  } catch (err) {
    console.error('[Mailgun Auth] Signature validation error:', err);
    return false;
  }
}

/**
 * Inbound Webhook Authentication Middleware
 * Validates incoming webhooks via:
 * 1. Mailgun HMAC Signature (when MAILGUN_SIGNING_KEY or MAILGUN_API_KEY is configured)
 * 2. Static Secret Header (when WEBHOOK_SECRET is configured)
 * 3. Open access if no secrets are configured in development
 */
export function verifyWebhookSecret(req: Request, res: Response, next: NextFunction) {
  const configuredSecret = process.env.WEBHOOK_SECRET?.trim();
  const rawSigningKey = process.env.MAILGUN_SIGNING_KEY?.trim();
  const rawApiKey = process.env.MAILGUN_API_KEY?.trim();

  // Filter out dummy/placeholder values
  const validSigningKey = rawSigningKey && !rawSigningKey.includes('your-mailgun') ? rawSigningKey : undefined;
  const validApiKey = rawApiKey && !rawApiKey.includes('your-mailgun') ? rawApiKey : undefined;
  const signingKeysToTry = [validSigningKey, validApiKey].filter(Boolean) as string[];

  // If no security keys are configured at all, permit development access
  if (!configuredSecret && signingKeysToTry.length === 0) {
    return next();
  }

  // 1. Check Mailgun HMAC Signature
  const rawBody = req.body || {};
  const token = rawBody.token || rawBody.signature?.token;
  const timestamp = rawBody.timestamp || rawBody.signature?.timestamp;
  const signature = typeof rawBody.signature === 'string' ? rawBody.signature : rawBody.signature?.signature;

  if (signingKeysToTry.length > 0 && token && timestamp && signature) {
    for (const key of signingKeysToTry) {
      if (verifyMailgunSignature(token, timestamp, signature, key)) {
        return next();
      }
    }
  }

  // 2. Check Static Webhook Secret Header / Query
  if (configuredSecret) {
    const providedSecret =
      req.headers['x-webhook-secret'] ||
      req.headers['x-api-key'] ||
      req.query.secret ||
      (req.headers['authorization']?.startsWith('Bearer ')
        ? req.headers['authorization'].slice(7)
        : undefined);

    if (providedSecret && providedSecret === configuredSecret) {
      return next();
    }
  }

  // 3. Development Fallback: If in development environment and no explicit signing key was provided,
  // permit valid inbound email payloads (containing sender and recipient)
  if (process.env.NODE_ENV !== 'production' && !validSigningKey) {
    const hasEmailPayload = Boolean(rawBody.sender || rawBody.from || rawBody.recipient || rawBody['body-plain']);
    if (hasEmailPayload) {
      console.log('[Mailgun Auth] Ingested webhook in development mode (HTTP Webhook Signing Key not configured).');
      return next();
    }
  }

  // If credentials failed or were missing
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Invalid or missing webhook signature or authorization secret header.',
  });
}
