import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketsBarChart } from '../TicketsBarChart';
import type { DailyTicketCount } from '../../lib/types';

describe('TicketsBarChart Component Unit Tests', () => {
  const mockDailyData: DailyTicketCount[] = [
    { date: '2026-08-28', formattedDate: 'Aug 28', count: 0 },
    { date: '2026-08-29', formattedDate: 'Aug 29', count: 3 },
    { date: '2026-08-30', formattedDate: 'Aug 30', count: 12 }, // Peak
    { date: '2026-08-31', formattedDate: 'Aug 31', count: 5 },
    { date: '2026-09-01', formattedDate: 'Sep 1', count: 7 },
  ];

  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(<TicketsBarChart isLoading={true} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders title, summary pills (Total, Daily Avg, Peak), and daily bar elements', () => {
    render(<TicketsBarChart data={mockDailyData} isLoading={false} />);

    // Title & Subtitle
    expect(screen.getByText('Tickets Created Per Day (Past 30 Days)')).toBeInTheDocument();
    expect(screen.getByText(/Daily inbound volume distribution/i)).toBeInTheDocument();

    // Summary calculations (0 + 3 + 12 + 5 + 7 = 27 total, 27 / 5 = 5.4 avg)
    expect(screen.getByText('27')).toBeInTheDocument();
    expect(screen.getByText('5.4')).toBeInTheDocument();
    expect(screen.getByText(/Peak: 12 \(Aug 30\)/i)).toBeInTheDocument();
  });

  it('handles empty data gracefully without crashing', () => {
    render(<TicketsBarChart data={[]} isLoading={false} />);

    expect(screen.getByText('Tickets Created Per Day (Past 30 Days)')).toBeInTheDocument();
    expect(screen.getByText('0.0')).toBeInTheDocument();
  });

  it('displays tooltip with count and formatted date on bar hover', async () => {
    const user = userEvent.setup();
    render(<TicketsBarChart data={mockDailyData} isLoading={false} />);

    const peakBarContainer = screen.getByText('Aug 30').closest('div[class*="group"]');
    expect(peakBarContainer).toBeInTheDocument();

    await user.hover(peakBarContainer!);
    expect(screen.getByText('12 tickets')).toBeInTheDocument();
  });
});
