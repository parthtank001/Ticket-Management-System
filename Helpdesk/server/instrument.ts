import path from 'path';
import dotenv from 'dotenv';

// Ensure .env is loaded from the Helpdesk root directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN?.trim();
const isEnabled = Boolean(dsn && dsn.length > 10 && !dsn.includes('placeholder') && !dsn.includes('your-key'));

if (isEnabled) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) : (process.env.NODE_ENV === 'production' ? 0.2 : 1.0),
    sampleRate: 1.0,
    beforeSend(event) {
      // Scrub sensitive headers & tokens before sending to Sentry
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-webhook-secret'];
        delete event.request.headers['better-auth-secret'];
      }
      return event;
    },
  });
  console.log('✅ Sentry Node SDK initialized for live error tracking.');
} else {
  console.log('ℹ️ Sentry DSN not configured; running in local/test mode without Sentry.');
}

/**
 * Flushes the Sentry event buffer. Useful before test responses or process exits.
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  if (!isEnabled) return true;
  return Sentry.flush(timeout);
}

/**
 * Manually captures an exception with contextual tags and metadata.
 */
export function captureServerException(error: any, context?: { tags?: Record<string, string>; extra?: Record<string, any>; user?: any }): string {
  if (!isEnabled) return 'sentry-disabled';
  return Sentry.captureException(error, context);
}

export { Sentry, isEnabled as isSentryEnabled };
