import { Request, Response, NextFunction } from 'express';

/**
 * Webhook Authentication Middleware
 * If WEBHOOK_SECRET is configured in the environment, verifies that incoming
 * webhook requests include matching credentials in X-Webhook-Secret header,
 * Authorization header, or secret query parameter.
 * If WEBHOOK_SECRET is unset, allows all incoming webhook payloads for development.
 */
export function verifyWebhookSecret(req: Request, res: Response, next: NextFunction) {
  const configuredSecret = process.env.WEBHOOK_SECRET;

  // If no secret is configured, proceed without authentication (development mode)
  if (!configuredSecret || configuredSecret.trim() === '') {
    return next();
  }

  const providedSecret =
    req.headers['x-webhook-secret'] ||
    req.headers['x-api-key'] ||
    req.query.secret ||
    (req.headers['authorization']?.startsWith('Bearer ')
      ? req.headers['authorization'].slice(7)
      : undefined);

  if (!providedSecret || providedSecret !== configuredSecret) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing webhook secret header (X-Webhook-Secret).',
    });
  }

  next();
}
