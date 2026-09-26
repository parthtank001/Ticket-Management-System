import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutoResolveBadge } from '../AutoResolveBadge';
import { AutoResolveCard } from '../AutoResolveCard';
import { BatchAutoResolveModal } from '../BatchAutoResolveModal';
import { renderWithQuery } from '../../test/renderWithQuery';
import { autoResolveApi } from '../../lib/auto-resolve-api';
import type { Ticket } from '../../lib/types';

vi.mock('../../lib/auto-resolve-api', () => ({
  autoResolveApi: {
    evaluate: vi.fn(),
    autoResolveTicket: vi.fn(),
    batchAutoResolve: vi.fn(),
    getStats: vi.fn(),
    getRules: vi.fn(),
  },
}));

describe('Auto-Resolve UI Components Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AutoResolveBadge Component', () => {
    it('renders Auto-Resolved badge correctly', () => {
      render(<AutoResolveBadge isAutoResolved={true} />);
      expect(screen.getByText('Auto-Resolved')).toBeInTheDocument();
    });

    it('renders Auto-Resolved full banner with section title', () => {
      render(
        <AutoResolveBadge
          isAutoResolved={true}
          variant="banner"
          sectionTitle="Section 1: Password Reset"
        />
      );
      expect(screen.getByText(/Auto-Resolved via Knowledge Base/i)).toBeInTheDocument();
      expect(screen.getByText(/100% Policy Match/i)).toBeInTheDocument();
    });

    it('renders Escalated badge when isEscalated is true', () => {
      render(<AutoResolveBadge isEscalated={true} />);
      expect(screen.getByText('Escalated')).toBeInTheDocument();
    });

    it('renders Escalation alert banner with role="alert"', () => {
      render(<AutoResolveBadge isEscalated={true} variant="banner" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Escalation Policy Triggered/i)).toBeInTheDocument();
    });

    it('renders KB Match Eligible badge', () => {
      render(<AutoResolveBadge canAutoResolve={true} />);
      expect(screen.getByText('KB Match Eligible')).toBeInTheDocument();
    });

    it('renders nothing when all flags are false or undefined', () => {
      const { container } = render(<AutoResolveBadge />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('AutoResolveCard Component', () => {
    const mockTicket: Ticket = {
      id: 101,
      subject: 'Forgot password',
      studentName: 'Bruce Wayne',
      studentEmail: 'bruce@wayne.com',
      body: 'I cannot sign in to my account. Please help.',
      status: 'OPEN',
      category: 'TECHNICAL_QUESTION',
      priority: 'MEDIUM',
      summary: null,
      aiDraftResponse: null,
      assignedAgentId: null,
      createdAt: '2026-09-26T10:00:00Z',
      updatedAt: '2026-09-26T10:00:00Z',
    };

    it('renders initial card layout with title and actions', () => {
      renderWithQuery(<AutoResolveCard ticket={mockTicket} />);

      expect(screen.getByText('Knowledge Base Auto-Resolution')).toBeInTheDocument();
      expect(screen.getByText('Check KB Match')).toBeInTheDocument();
      expect(screen.getByText('Auto-Resolve & Reply')).toBeInTheDocument();
    });

    it('evaluates inquiry against KB and renders result when Check KB Match is clicked', async () => {
      const user = userEvent.setup();
      (autoResolveApi.evaluate as any).mockResolvedValueOnce({
        canAutoResolve: true,
        autoResolveReason: 'Resolved via Section 1 (Password Reset)',
        matchedSection: 'Section 1',
        resolutionAnswer: 'Hello Bruce,\n\nFollow these password reset steps.',
        category: 'TECHNICAL_QUESTION',
        priority: 'MEDIUM',
        confidence: 0.95,
        isEscalated: false,
      });

      renderWithQuery(<AutoResolveCard ticket={mockTicket} />);

      const checkButton = screen.getByText('Check KB Match');
      await user.click(checkButton);

      await waitFor(() => {
        expect(autoResolveApi.evaluate).toHaveBeenCalledWith({
          subject: mockTicket.subject,
          body: mockTicket.body,
          studentName: mockTicket.studentName,
          studentEmail: mockTicket.studentEmail,
        });
        expect(screen.getByText(/Eligible for Auto-Resolution/i)).toBeInTheDocument();
        expect(screen.getByText(/Resolved via Section 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Follow these password reset steps/i)).toBeInTheDocument();
      });
    });

    it('executes auto-resolve mutation and calls onResolved callback', async () => {
      const user = userEvent.setup();
      const onResolved = vi.fn();

      (autoResolveApi.autoResolveTicket as any).mockResolvedValueOnce({
        ticketId: 101,
        success: true,
        autoResolved: true,
        status: 'RESOLVED',
        previousStatus: 'OPEN',
        reason: 'Resolved via KB',
        dryRun: false,
        messageAdded: true,
      });

      renderWithQuery(<AutoResolveCard ticket={mockTicket} onResolved={onResolved} />);

      const autoResolveButton = screen.getByText('Auto-Resolve & Reply');
      await user.click(autoResolveButton);

      await waitFor(() => {
        expect(autoResolveApi.autoResolveTicket).toHaveBeenCalledWith(101, {
          sendReply: true,
          dryRun: false,
        });
        expect(onResolved).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('BatchAutoResolveModal Component', () => {
    it('does not render when isOpen is false', () => {
      const { container } = renderWithQuery(
        <BatchAutoResolveModal isOpen={false} onClose={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders modal with configuration options when isOpen is true', () => {
      renderWithQuery(<BatchAutoResolveModal isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText('Batch Auto-Resolve Tickets')).toBeInTheDocument();
      expect(screen.getByLabelText(/Queue Status Filter/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Category Filter/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Max Tickets to Process/i)).toBeInTheDocument();
      expect(screen.getByText(/Dry Run/i)).toBeInTheDocument();
    });

    it('submits batch auto-resolve form and displays aggregated results', async () => {
      const user = userEvent.setup();
      const mockResult = {
        totalProcessed: 5,
        autoResolvedCount: 3,
        escalatedCount: 1,
        skippedCount: 1,
        dryRun: false,
        results: [
          { ticketId: 201, success: true, autoResolved: true, status: 'RESOLVED', reason: 'Password Reset match' },
          { ticketId: 202, success: true, autoResolved: false, status: 'OPEN', reason: 'Escalated: legal action' },
          { ticketId: 203, success: true, autoResolved: false, status: 'OPEN', reason: 'Requires human staff' },
        ],
      };

      (autoResolveApi.batchAutoResolve as any).mockResolvedValueOnce(mockResult);

      renderWithQuery(<BatchAutoResolveModal isOpen={true} onClose={vi.fn()} />);

      const runButton = screen.getByText('Run Batch Auto-Resolve');
      await user.click(runButton);

      await waitFor(() => {
        expect(autoResolveApi.batchAutoResolve).toHaveBeenCalledWith(
          expect.objectContaining({
            statusFilter: 'NEW',
            limit: 25,
            dryRun: false,
          })
        );

        expect(screen.getByText('Processed')).toBeInTheDocument();
        expect(screen.getAllByText('Resolved').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Escalated').length).toBeGreaterThan(0);
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText(/201/)).toBeInTheDocument();
        expect(screen.getByText(/Password Reset match/)).toBeInTheDocument();
        expect(screen.getByText(/Escalated: legal action/)).toBeInTheDocument();
        expect(screen.getByText('Run Another Batch')).toBeInTheDocument();
      });
    });

    it('calls onClose when close or Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      renderWithQuery(<BatchAutoResolveModal isOpen={true} onClose={onClose} />);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
