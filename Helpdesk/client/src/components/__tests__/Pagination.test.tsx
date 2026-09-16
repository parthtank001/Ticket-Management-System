import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from '../Pagination';

describe('Pagination Component', () => {
  it('does not render anything when totalCount is 0', () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={0}
        totalCount={0}
        pageSize={10}
        onPageChange={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders item range summary accurately for first page', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={10}
        totalCount={95}
        pageSize={10}
        onPageChange={vi.fn()}
      />
    );

    const summary = screen.getByTestId('pagination-summary');
    expect(summary).toHaveTextContent('Showing 1 to 10 of 95 tickets');
  });

  it('renders item range summary accurately for last page with partial count', () => {
    render(
      <Pagination
        currentPage={10}
        totalPages={10}
        totalCount={95}
        pageSize={10}
        onPageChange={vi.fn()}
      />
    );

    const summary = screen.getByTestId('pagination-summary');
    expect(summary).toHaveTextContent('Showing 91 to 95 of 95 tickets');
  });

  it('disables First and Previous navigation buttons on page 1', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        totalCount={50}
        pageSize={10}
        onPageChange={vi.fn()}
      />
    );

    const firstBtn = screen.getByRole('button', { name: /first page/i });
    const prevBtn = screen.getByRole('button', { name: /previous page/i });
    const nextBtn = screen.getByRole('button', { name: /next page/i });
    const lastBtn = screen.getByRole('button', { name: /last page/i });

    expect(firstBtn).toBeDisabled();
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();
    expect(lastBtn).toBeEnabled();
  });

  it('disables Next and Last navigation buttons on the final page', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={5}
        totalCount={50}
        pageSize={10}
        onPageChange={vi.fn()}
      />
    );

    const firstBtn = screen.getByRole('button', { name: /first page/i });
    const prevBtn = screen.getByRole('button', { name: /previous page/i });
    const nextBtn = screen.getByRole('button', { name: /next page/i });
    const lastBtn = screen.getByRole('button', { name: /last page/i });

    expect(firstBtn).toBeEnabled();
    expect(prevBtn).toBeEnabled();
    expect(nextBtn).toBeDisabled();
    expect(lastBtn).toBeDisabled();
  });

  it('calls onPageChange with correct target page when navigation buttons are clicked', async () => {
    const user = userEvent.setup();
    const handlePageChange = vi.fn();

    render(
      <Pagination
        currentPage={3}
        totalPages={5}
        totalCount={50}
        pageSize={10}
        onPageChange={handlePageChange}
      />
    );

    // Click Next
    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(handlePageChange).toHaveBeenCalledWith(4);

    // Click Previous
    await user.click(screen.getByRole('button', { name: /previous page/i }));
    expect(handlePageChange).toHaveBeenCalledWith(2);

    // Click First
    await user.click(screen.getByRole('button', { name: /first page/i }));
    expect(handlePageChange).toHaveBeenCalledWith(1);

    // Click Last
    await user.click(screen.getByRole('button', { name: /last page/i }));
    expect(handlePageChange).toHaveBeenCalledWith(5);
  });

  it('renders page indicator badge showing current and total pages', () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={8}
        totalCount={120}
        pageSize={15}
        onPageChange={vi.fn()}
      />
    );

    const indicator = screen.getByTestId('pagination-page-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveTextContent('Page 3 of 8');
  });

  it('does not render a page size selector dropdown', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={4}
        totalCount={50}
        pageSize={15}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.queryByRole('combobox', { name: /rows per page/i })).not.toBeInTheDocument();
  });

  it('disables all buttons when isLoading is true', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalCount={50}
        pageSize={15}
        onPageChange={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.getByRole('button', { name: /first page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /last page/i })).toBeDisabled();
  });
});
