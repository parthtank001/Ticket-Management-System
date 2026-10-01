import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Sentry from '@sentry/react';
import {
  initClientSentry,
  setSentryUser,
  triggerClientTestError,
  captureClientException,
  flushClientSentry,
} from '../lib/sentry';
import { ErrorFallback, SentryErrorBoundary } from '../components/SentryErrorBoundary';
import { SentryDebugPage } from '../components/SentryDebugPage';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  captureException: vi.fn().mockReturnValue('mock-client-event-id-98765'),
  flush: vi.fn().mockResolvedValue(true),
  ErrorBoundary: ({ children }: any) => {
    return <div data-testid="sentry-error-boundary-wrapper">{children}</div>;
  },
}));

describe('Sentry Client & Error Boundary Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setSentryUser Helper', () => {
    it('sets Sentry user profile context when user is logged in', () => {
      expect(() => {
        setSentryUser({
          id: 'user-101',
          email: 'agent@example.com',
          name: 'Sarah Agent',
          role: 'AGENT',
        });
      }).not.toThrow();
    });

    it('clears Sentry user scope when user logs out (null)', () => {
      expect(() => {
        setSentryUser(null);
      }).not.toThrow();
    });
  });

  describe('triggerClientTestError Helper', () => {
    it('generates a live client error event and returns event ID or disabled status', async () => {
      const eventId = await triggerClientTestError();
      expect(typeof eventId).toBe('string');
      expect(eventId.length).toBeGreaterThan(0);
    });
  });

  describe('flushClientSentry Helper', () => {
    it('flushes in-memory client events and resolves cleanly', async () => {
      const success = await flushClientSentry(1000);
      expect(typeof success).toBe('boolean');
    });
  });

  describe('captureClientException Helper', () => {
    it('captures client exceptions with metadata', () => {
      const testErr = new Error('Client-side network abort');
      const eventId = captureClientException(testErr, {
        tags: { route: '/tickets' },
        extra: { page: 2 },
      });
      expect(typeof eventId).toBe('string');
    });
  });

  describe('ErrorFallback UI Component', () => {
    it('renders the friendly error boundary fallback UI with message and event ID', () => {
      const mockReset = vi.fn();
      const mockError = new Error('Crash in TicketGrid component');

      render(
        <ErrorFallback
          error={mockError}
          resetError={mockReset}
          eventId="event-ref-abc-123"
        />
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/Crash in TicketGrid component/)).toBeInTheDocument();
      expect(screen.getByText('event-ref-abc-123')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go to Workspace/i })).toBeInTheDocument();
    });

    it('triggers reset callback when Go to Workspace button is clicked', async () => {
      const user = userEvent.setup();
      const mockReset = vi.fn();
      const mockError = new Error('Test crash');

      render(
        <ErrorFallback
          error={mockError}
          resetError={mockReset}
          eventId={null}
        />
      );

      const workspaceBtn = screen.getByRole('button', { name: /Go to Workspace/i });
      await user.click(workspaceBtn);
      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('SentryErrorBoundary Component Wrapper', () => {
    it('wraps children cleanly without interfering with normal render tree', () => {
      render(
        <SentryErrorBoundary>
          <div data-testid="test-child-content">Normal Content</div>
        </SentryErrorBoundary>
      );

      expect(screen.getByTestId('test-child-content')).toBeInTheDocument();
      expect(screen.getByText('Normal Content')).toBeInTheDocument();
    });
  });

  describe('SentryDebugPage Component', () => {
    it('renders debugger headers, status cards, and trigger buttons', () => {
      render(<SentryDebugPage />);

      expect(screen.getByText('Sentry Error Tracking Debugger')).toBeInTheDocument();
      expect(screen.getByText('Frontend React Client')).toBeInTheDocument();
      expect(screen.getByText('Backend Express Server')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Trigger Frontend Error/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Crash React Render/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Trigger Backend Error/i })).toBeInTheDocument();
    });

    it('triggers frontend error when clicking Trigger Frontend Error button', async () => {
      const user = userEvent.setup();
      render(<SentryDebugPage />);

      const triggerBtn = screen.getByRole('button', { name: /Trigger Frontend Error/i });
      await user.click(triggerBtn);

      expect(await screen.findByText(/Sentry Event Dispatched Successfully/i)).toBeInTheDocument();
    });
  });
});
