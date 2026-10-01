import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { initClientSentry } from './lib/sentry';
import { SentryErrorBoundary } from './components/SentryErrorBoundary';
import App from './App';
import './index.css';

// Initialize Sentry telemetry early
initClientSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SentryErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </SentryErrorBoundary>
  </React.StrictMode>
);
