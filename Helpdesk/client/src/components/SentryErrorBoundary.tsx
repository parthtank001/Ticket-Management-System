import React from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  eventId: string | null;
}

export function ErrorFallback({ error, resetError, eventId }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center space-y-6">
        <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-600 shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Something went wrong</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            An unexpected error occurred in the application. Our technical team has been notified automatically via Sentry.
          </p>
        </div>

        {error?.message && (
          <div className="bg-slate-100 rounded-xl p-3 text-left overflow-x-auto border border-slate-200/80">
            <p className="text-xs font-mono text-slate-700 break-words">{error.message}</p>
          </div>
        )}

        {eventId && (
          <div className="text-xs text-slate-400 font-mono">
            Error Reference ID: <span className="text-slate-600 select-all font-semibold">{eventId}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Page</span>
          </button>
          <button
            onClick={() => {
              resetError();
              window.location.href = '/';
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Go to Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function SentryErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError, eventId }) => (
        <ErrorFallback error={error as Error} resetError={resetError} eventId={eventId} />
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
