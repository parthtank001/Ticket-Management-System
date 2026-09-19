import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  TicketStatusBadge,
  TicketPriorityBadge,
  TicketCategoryBadge,
  TicketSenderBadge,
} from '../TicketBadges';

describe('TicketBadges Components', () => {
  describe('TicketStatusBadge', () => {
    it('renders OPEN status correctly', () => {
      render(<TicketStatusBadge status="OPEN" />);
      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('renders RESOLVED status correctly', () => {
      render(<TicketStatusBadge status="RESOLVED" />);
      expect(screen.getByText('Resolved')).toBeInTheDocument();
    });

    it('renders CLOSED status correctly', () => {
      render(<TicketStatusBadge status="CLOSED" />);
      expect(screen.getByText('Closed')).toBeInTheDocument();
    });
  });

  describe('TicketPriorityBadge', () => {
    it('renders URGENT priority', () => {
      render(<TicketPriorityBadge priority="URGENT" />);
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('renders HIGH priority', () => {
      render(<TicketPriorityBadge priority="HIGH" />);
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('renders MEDIUM priority', () => {
      render(<TicketPriorityBadge priority="MEDIUM" />);
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('renders LOW priority', () => {
      render(<TicketPriorityBadge priority="LOW" />);
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  describe('TicketCategoryBadge', () => {
    it('renders TECHNICAL_QUESTION category badge', () => {
      render(<TicketCategoryBadge category="TECHNICAL_QUESTION" />);
      expect(screen.getByText('Technical Question')).toBeInTheDocument();
    });

    it('renders REFUND_REQUEST category badge', () => {
      render(<TicketCategoryBadge category="REFUND_REQUEST" />);
      expect(screen.getByText('Refund Request')).toBeInTheDocument();
    });

    it('renders GENERAL_QUESTION category badge', () => {
      render(<TicketCategoryBadge category="GENERAL_QUESTION" />);
      expect(screen.getByText('General Question')).toBeInTheDocument();
    });

    it('renders Uncategorized when category is null', () => {
      render(<TicketCategoryBadge category={null} />);
      expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    });
  });

  describe('TicketSenderBadge', () => {
    it('renders Student badge for STUDENT senderType', () => {
      render(<TicketSenderBadge senderType="STUDENT" />);
      expect(screen.getByText('Student')).toBeInTheDocument();
    });

    it('renders Support Agent badge for AGENT senderType', () => {
      render(<TicketSenderBadge senderType="AGENT" />);
      expect(screen.getByText('Support Agent')).toBeInTheDocument();
    });

    it('renders Internal Note badge when isInternalNote is true', () => {
      render(<TicketSenderBadge senderType="AGENT" isInternalNote={true} />);
      expect(screen.getByText('Internal Note')).toBeInTheDocument();
    });

    it('renders System badge for SYSTEM senderType', () => {
      render(<TicketSenderBadge senderType="SYSTEM" />);
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });
});
