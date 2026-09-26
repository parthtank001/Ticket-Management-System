import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassificationBadge } from '../ClassificationBadge';
import { ClassificationCard } from '../ClassificationCard';
import { BatchClassifyModal } from '../BatchClassifyModal';
import { renderWithQuery } from '../../test/renderWithQuery';
import { classificationApi } from '../../lib/classification-api';
import type { Ticket } from '../../lib/types';

vi.mock('../../lib/classification-api', () => ({
  classificationApi: {
    evaluate: vi.fn(),
    classifyTicket: vi.fn(),
    batchClassify: vi.fn(),
    getStats: vi.fn(),
    getCategories: vi.fn(),
  },
}));

describe('Classification UI Components Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ClassificationBadge Component', () => {
    it('renders category and priority badges with confidence score', () => {
      render(
        <ClassificationBadge
          category="TECHNICAL_QUESTION"
          priority="MEDIUM"
          confidence={0.95}
          tags={['password-reset', 'technical']}
        />
      );

      expect(screen.getByText('Technical Question')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('95% Confidence')).toBeInTheDocument();
      expect(screen.getByText('password-reset')).toBeInTheDocument();
    });

    it('renders banner variant with category and reasoning', () => {
      render(
        <ClassificationBadge
          category="GENERAL_QUESTION"
          confidence={0.90}
          reasoning="Matches certificate inquiry"
          variant="banner"
        />
      );

      expect(screen.getByText(/AI Classified: GENERAL QUESTION/i)).toBeInTheDocument();
      expect(screen.getByText(/90% Confidence/i)).toBeInTheDocument();
      expect(screen.getByText('Matches certificate inquiry')).toBeInTheDocument();
    });

    it('renders Escalated badge when isEscalated is true', () => {
      render(<ClassificationBadge isEscalated={true} />);
      expect(screen.getByText('Escalated')).toBeInTheDocument();
    });

    it('renders Escalation alert banner with role="alert"', () => {
      render(<ClassificationBadge isEscalated={true} variant="banner" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Escalation Rule Triggered/i)).toBeInTheDocument();
    });

    it('renders compact badge variant', () => {
      render(<ClassificationBadge confidence={0.88} variant="compact" />);
      expect(screen.getByText('88%')).toBeInTheDocument();
    });
  });

  describe('ClassificationCard Component', () => {
    const mockClassifiedTicket: Ticket = {
      id: 501,
      subject: 'Video is buffering',
      body: 'Videos are buffering on Chrome.',
      studentName: 'Alice Johnson',
      studentEmail: 'alice@example.com',
      status: 'OPEN',
      category: 'TECHNICAL_QUESTION',
      priority: 'MEDIUM',
      summary: '• Video playback buffering on Chrome\n• Recommended cache clearing',
      aiDraftResponse: 'Hello Alice,\n\nPlease try clearing your browser cache.',
      createdAt: '2026-03-10T10:00:00.000Z',
      updatedAt: '2026-03-10T10:05:00.000Z',
    };

    const mockUnclassifiedTicket: Ticket = {
      id: 502,
      subject: 'Need refund for course',
      body: 'I want a refund for Python course within 30 days.',
      studentName: 'Bob Smith',
      studentEmail: 'bob@example.com',
      status: 'NEW',
      category: null,
      priority: 'LOW',
      summary: null,
      aiDraftResponse: null,
      createdAt: '2026-03-10T10:00:00.000Z',
      updatedAt: '2026-03-10T10:05:00.000Z',
    };

    it('renders classified ticket metadata, draft response, and re-classify button', () => {
      renderWithQuery(<ClassificationCard ticket={mockClassifiedTicket} />);

      expect(screen.getByText('AI Ticket Classification')).toBeInTheDocument();
      expect(screen.getByText('Classified')).toBeInTheDocument();
      expect(screen.getByText('Technical Question')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText(/Please try clearing your browser cache/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Re-Classify Ticket/i })).toBeInTheDocument();
    });

    it('triggers re-classification mutation when Re-Classify button is clicked', async () => {
      const user = userEvent.setup();
      (classificationApi.classifyTicket as any).mockResolvedValueOnce({
        ticketId: 501,
        success: true,
        category: 'TECHNICAL_QUESTION',
        priority: 'MEDIUM',
        summary: '• Video buffering',
        aiDraftResponse: 'Hello Alice...',
        confidence: 0.95,
        reasoning: 'Technical keywords',
        tags: ['video-playback'],
        dryRun: false,
        updated: true,
      });

      renderWithQuery(<ClassificationCard ticket={mockClassifiedTicket} />);

      const reclassifyBtn = screen.getByRole('button', { name: /Re-Classify Ticket/i });
      await user.click(reclassifyBtn);

      await waitFor(() => {
        expect(classificationApi.classifyTicket).toHaveBeenCalledWith(501, { force: true });
      });
    });

    it('renders unclassified state with alert banner and action buttons', () => {
      renderWithQuery(<ClassificationCard ticket={mockUnclassifiedTicket} />);

      expect(screen.getByText('Ticket is unclassified')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Live Preview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Classify Ticket/i })).toBeInTheDocument();
    });

    it('triggers live preview evaluation when Live Preview button is clicked', async () => {
      const user = userEvent.setup();
      (classificationApi.evaluate as any).mockResolvedValueOnce({
        category: 'REFUND_REQUEST',
        priority: 'HIGH',
        summary: '• Refund request for Python',
        aiDraftResponse: 'Hello Bob,\n\nWe have received your refund request.',
        confidence: 0.95,
        reasoning: 'Classified as REFUND_REQUEST based on 30-day guarantee keywords.',
        tags: ['refund', 'billing'],
        isEscalated: false,
      });

      renderWithQuery(<ClassificationCard ticket={mockUnclassifiedTicket} />);

      const previewBtn = screen.getByRole('button', { name: /Live Preview/i });
      await user.click(previewBtn);

      await waitFor(() => {
        expect(classificationApi.evaluate).toHaveBeenCalledWith({
          subject: mockUnclassifiedTicket.subject,
          body: mockUnclassifiedTicket.body,
          studentName: mockUnclassifiedTicket.studentName,
          studentEmail: mockUnclassifiedTicket.studentEmail,
        });
        expect(screen.getByText(/Predicted Classification \(95% Confidence\)/i)).toBeInTheDocument();
        expect(screen.getByText('Refund Request')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
      });
    });

    it('executes classification when Classify Ticket button is clicked', async () => {
      const user = userEvent.setup();
      const onClassifiedMock = vi.fn();
      (classificationApi.classifyTicket as any).mockResolvedValueOnce({
        ticketId: 502,
        success: true,
        category: 'REFUND_REQUEST',
        priority: 'HIGH',
        summary: '• Refund request',
        aiDraftResponse: 'Hello Bob...',
        confidence: 0.95,
        reasoning: 'Refund keywords',
        tags: ['refund'],
        dryRun: false,
        updated: true,
      });

      renderWithQuery(
        <ClassificationCard ticket={mockUnclassifiedTicket} onClassified={onClassifiedMock} />
      );

      const classifyBtn = screen.getByRole('button', { name: /Classify Ticket/i });
      await user.click(classifyBtn);

      await waitFor(() => {
        expect(classificationApi.classifyTicket).toHaveBeenCalledWith(502, { force: false });
        expect(onClassifiedMock).toHaveBeenCalled();
      });
    });

    it('copies draft reply to clipboard when Copy Draft is clicked', async () => {
      const user = userEvent.setup();
      const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

      renderWithQuery(<ClassificationCard ticket={mockClassifiedTicket} />);

      const copyBtn = screen.getByRole('button', { name: /Copy Draft/i });
      await user.click(copyBtn);

      expect(writeTextSpy).toHaveBeenCalledWith(mockClassifiedTicket.aiDraftResponse);
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    it('displays error banner if classification mutation fails', async () => {
      const user = userEvent.setup();
      (classificationApi.classifyTicket as any).mockRejectedValueOnce(
        new Error('Network error: server unreachable')
      );

      renderWithQuery(<ClassificationCard ticket={mockUnclassifiedTicket} />);

      const classifyBtn = screen.getByRole('button', { name: /Classify Ticket/i });
      await user.click(classifyBtn);

      await waitFor(() => {
        expect(screen.getByText('Network error: server unreachable')).toBeInTheDocument();
      });
    });
  });

  describe('BatchClassifyModal Component', () => {
    it('does not render when isOpen is false', () => {
      renderWithQuery(<BatchClassifyModal isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByText('Batch Ticket Classification')).not.toBeInTheDocument();
    });

    it('renders modal dialog when isOpen is true and submits batch classification', async () => {
      const user = userEvent.setup();
      const onCloseMock = vi.fn();
      const onSuccessMock = vi.fn();

      (classificationApi.batchClassify as any).mockResolvedValueOnce({
        totalProcessed: 2,
        classifiedCount: 2,
        updatedCount: 2,
        skippedCount: 0,
        failedCount: 0,
        dryRun: false,
        results: [
          {
            ticketId: 101,
            success: true,
            category: 'GENERAL_QUESTION',
            priority: 'LOW',
            confidence: 0.95,
            updated: true,
            dryRun: false,
          },
          {
            ticketId: 102,
            success: true,
            category: 'TECHNICAL_QUESTION',
            priority: 'MEDIUM',
            confidence: 0.90,
            updated: true,
            dryRun: false,
          },
        ],
      });

      renderWithQuery(
        <BatchClassifyModal isOpen={true} onClose={onCloseMock} onSuccess={onSuccessMock} />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Batch Ticket Classification')).toBeInTheDocument();

      // Submit batch
      const runBtn = screen.getByRole('button', { name: /Run Batch Classification/i });
      await user.click(runBtn);

      await waitFor(() => {
        expect(classificationApi.batchClassify).toHaveBeenCalledWith({
          statusFilter: 'UNCLASSIFIED',
          force: false,
          limit: 25,
          dryRun: false,
        });
        expect(onSuccessMock).toHaveBeenCalled();
        expect(screen.getByText('Batch Execution Outcomes')).toBeInTheDocument();
        expect(screen.getByText('#101')).toBeInTheDocument();
        expect(screen.getByText('#102')).toBeInTheDocument();
      });

      // Reset on Run Another Batch
      const anotherBtn = screen.getByRole('button', { name: /Run Another Batch/i });
      await user.click(anotherBtn);

      expect(screen.getByRole('button', { name: /Run Batch Classification/i })).toBeInTheDocument();
    });
  });
});
