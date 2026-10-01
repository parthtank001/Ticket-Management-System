import * as Sentry from '@sentry/react';

const rawDsn = (import.meta.env.VITE_SENTRY_DSN || '').trim();
const isEnabled = Boolean(
  rawDsn &&
  rawDsn.length > 10 &&
  !rawDsn.includes('placeholder') &&
  !rawDsn.includes('your-key') &&
  !rawDsn.includes('your-sentry-dsn')
);

/**
 * Initializes the Sentry React SDK in the browser.
 */
export function initClientSentry(): void {
  if (!isEnabled) {
    console.info('[Sentry] VITE_SENTRY_DSN not configured. Sentry running in disabled/local mode.');
    return;
  }

  try {
    Sentry.init({
      dsn: rawDsn,
      environment: import.meta.env.MODE || 'development',
      tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
      sampleRate: 1.0,
      beforeSend(event) {
        // Redact any authorization tokens or sensitive headers from request breadcrumbs
        if (event.request?.headers) {
          if (event.request.headers['authorization']) {
            event.request.headers['authorization'] = '[REDACTED]';
          }
          if (event.request.headers['cookie']) {
            event.request.headers['cookie'] = '[REDACTED]';
          }
        }
        return event;
      },
    });

    console.info('✅ [Sentry] Sentry React SDK initialized for live client error tracking.');
  } catch (err) {
    console.warn('[Sentry Init Warning] Failed to initialize Sentry React SDK:', err);
  }
}

/**
 * Synchronizes the currently authenticated user with Sentry scope.
 */
export function setSentryUser(user: { id: string; email: string; name?: string; role?: string } | null): void {
  if (!isEnabled) return;
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
      role: user.role,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Flushes the in-memory Sentry event buffer to ingest servers.
 */
export async function flushClientSentry(timeoutMs: number = 2000): Promise<boolean> {
  if (!isEnabled) return true;
  try {
    return await Sentry.flush(timeoutMs);
  } catch (err) {
    console.warn('[Sentry Flush Warning]:', err);
    return false;
  }
}

/**
 * Captures an arbitrary error with context from React components or hooks.
 */
export function captureClientException(
  error: any,
  context?: { tags?: Record<string, string>; extra?: Record<string, any> }
): string {
  if (!isEnabled) return 'sentry-client-disabled';
  return Sentry.captureException(error, context);
}

/**
 * Triggers a live test exception in the browser, captures it directly to Sentry,
 * flushes the event queue, and returns the generated Sentry Event ID for verification.
 */
export async function triggerClientTestError(): Promise<string> {
  try {
    throw new Error(`[Sentry Live Test] React client exception triggered at ${new Date().toISOString()}`);
  } catch (err: any) {
    const eventId = isEnabled
      ? captureClientException(err, {
          tags: {
            testEvent: 'true',
            platform: 'react-browser',
            environment: import.meta.env.MODE || 'development',
          },
          extra: {
            url: typeof window !== 'undefined' ? window.location.href : 'unknown',
            timestamp: new Date().toISOString(),
          },
        })
      : 'sentry-client-disabled';

    console.info(`%c[Sentry] Live React Exception Captured! Event ID: ${eventId}`, 'color: #6366f1; font-weight: bold;');
    
    if (isEnabled) {
      await flushClientSentry(2000);
    }
    
    return eventId;
  }
}

export { Sentry, isEnabled as isClientSentryEnabled };

