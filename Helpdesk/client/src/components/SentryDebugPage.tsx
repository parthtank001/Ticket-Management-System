import React, { useState } from 'react';
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ExternalLink,
  Flame,
  Globe,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import { isClientSentryEnabled, triggerClientTestError } from '../lib/sentry';

interface TriggeredEventLog {
  id: string;
  source: 'frontend-handled' | 'frontend-boundary' | 'backend-api';
  timestamp: string;
  eventId: string;
  message: string;
}

export const SentryDebugPage: React.FC = () => {
  const [shouldCrashRender, setShouldCrashRender] = useState(false);
  const [isTriggeringFrontend, setIsTriggeringFrontend] = useState(false);
  const [isTriggeringBackend, setIsTriggeringBackend] = useState(false);
  const [eventLogs, setEventLogs] = useState<TriggeredEventLog[]>([]);
  const [latestEventId, setLatestEventId] = useState<string | null>(null);

  // If user requested a React render crash, throw an unhandled error inside render
  if (shouldCrashRender) {
    throw new Error(
      `[Sentry ErrorBoundary Crash Test] Intentional unhandled React render exception at ${new Date().toISOString()}`
    );
  }

  const handleTriggerFrontendError = async () => {
    setIsTriggeringFrontend(true);
    try {
      const eventId = await triggerClientTestError();
      setLatestEventId(eventId);
      setEventLogs((prev) => [
        {
          id: String(Date.now()),
          source: 'frontend-handled',
          timestamp: new Date().toLocaleTimeString(),
          eventId,
          message: 'Client-side exception captured & flushed to Sentry.io',
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error('Failed to trigger client error:', err);
    } finally {
      setIsTriggeringFrontend(false);
    }
  };

  const handleTriggerBackendError = async () => {
    setIsTriggeringBackend(true);
    try {
      const response = await fetch('/api/debug-sentry');
      const data = await response.json();
      const eventId = data.eventId || 'unknown-backend-event';
      setLatestEventId(eventId);
      setEventLogs((prev) => [
        {
          id: String(Date.now()),
          source: 'backend-api',
          timestamp: new Date().toLocaleTimeString(),
          eventId,
          message: data.message || 'Backend Express exception captured via Sentry.setupExpressErrorHandler',
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error('Failed to trigger backend error:', err);
    } finally {
      setIsTriggeringBackend(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="h-11 w-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Sentry Error Tracking Debugger
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold uppercase tracking-wider">
                Live Status
              </span>
            </h1>
            <p className="text-slate-500 text-sm">
              Verify real-time error logging, breadcrumb collection, and Sentry.io ingest for Frontend & Backend.
            </p>
          </div>
        </div>

        <a
          href="https://sentry.io"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-center"
        >
          <span>Open Sentry.io Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Frontend Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>Frontend React Client</span>
            </div>
            {isClientSentryEnabled ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Active & Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                <AlertTriangle className="w-3 h-3" />
                DSN Not Set
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Captures unhandled exceptions, React render crashes via <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">SentryErrorBoundary</code>, and route changes.
          </p>
          <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
            <span>Env Mode: {import.meta.env.MODE || 'development'}</span>
            <span>SDK: @sentry/react</span>
          </div>
        </div>

        {/* Backend Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Server className="w-4 h-4 text-indigo-600" />
              <span>Backend Express Server</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              Active & Instrumented
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Instruments Express request handlers, background worker queues, and centralized error logging with <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">Sentry.setupExpressErrorHandler</code>.
          </p>
          <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
            <span>Debug Route: /api/debug-sentry</span>
            <span>SDK: @sentry/node</span>
          </div>
        </div>
      </div>

      {/* Interactive Trigger Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Live Test Triggers</h2>
          <p className="text-xs text-slate-500 mt-1">
            Click any action below to trigger an error and instantly view the corresponding event ID generated by Sentry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action 1: Frontend Handled Exception */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                <Bug className="w-4 h-4" />
                <span>1. Frontend Exception</span>
              </div>
              <p className="text-xs text-slate-500">
                Captures a client exception with tags, browser metadata, and flushes immediately.
              </p>
            </div>
            <button
              onClick={handleTriggerFrontendError}
              disabled={isTriggeringFrontend}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isTriggeringFrontend ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Terminal className="w-3.5 h-3.5" />
              )}
              <span>Trigger Frontend Error</span>
            </button>
          </div>

          {/* Action 2: React Error Boundary Crash */}
          <div className="p-4 rounded-xl border border-red-200/80 bg-red-50/30 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                <Flame className="w-4 h-4" />
                <span>2. React Crash Fallback</span>
              </div>
              <p className="text-xs text-slate-500">
                Throws an unhandled render error caught by <code className="text-red-700 bg-red-100 px-1 py-0.5 rounded text-[10px]">SentryErrorBoundary</code>.
              </p>
            </div>
            <button
              onClick={() => setShouldCrashRender(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Crash React Render</span>
            </button>
          </div>

          {/* Action 3: Backend API Error */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Server className="w-4 h-4 text-indigo-600" />
                <span>3. Backend Server Error</span>
              </div>
              <p className="text-xs text-slate-500">
                Calls Express endpoint <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded text-[10px]">/api/debug-sentry</code> and captures HTTP 500.
              </p>
            </div>
            <button
              onClick={handleTriggerBackendError}
              disabled={isTriggeringBackend}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isTriggeringBackend ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Server className="w-3.5 h-3.5" />
              )}
              <span>Trigger Backend Error</span>
            </button>
          </div>
        </div>
      </div>

      {/* Latest Triggered Event Banner */}
      {latestEventId && (
        <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Sentry Event Dispatched Successfully</span>
            </div>
            <p className="text-xs font-mono text-indigo-800">
              Event ID: <span className="font-bold select-all bg-white px-2 py-0.5 rounded border border-indigo-200">{latestEventId}</span>
            </p>
          </div>
          <a
            href={`https://sentry.io`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <span>Search in Sentry</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Event Logs in this Session */}
      {eventLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Triggered Events in this Session ({eventLogs.length})
            </h3>
            <button
              onClick={() => setEventLogs([])}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Clear Logs
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {eventLogs.map((log) => (
              <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      log.source === 'backend-api'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {log.source}
                  </span>
                  <span className="text-slate-800 font-medium">{log.message}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 font-mono">
                  <span>ID: <code className="text-slate-700 font-semibold select-all">{log.eventId}</code></span>
                  <span>{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
