import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  isLoading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  itemLabel = 'tickets',
  isLoading = false,
}) => {
  // If no items exist, don't show pagination controls
  if (totalCount === 0) {
    return null;
  }

  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  const startItem = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalCount);

  return (
    <div
      data-testid="pagination-container"
      className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-3.5 bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 rounded-lg shadow-xs text-xs text-slate-600 dark:text-slate-300"
    >
      {/* 1. Item Count Summary */}
      <div
        data-testid="pagination-summary"
        className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"
      >
        Showing <span className="font-semibold text-slate-900 dark:text-white">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-900 dark:text-white">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-900 dark:text-white">{totalCount}</span> {itemLabel}
      </div>

      {/* 2. Controls Right Section: Linear/SaaS Navigation Pill Group */}
      <div className="flex items-center gap-2">
        <nav
          role="navigation"
          aria-label="Pagination"
          className="flex items-center gap-1.5"
        >
          {/* First Page Button (Quick Jump) */}
          {safeTotalPages > 2 && (
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={safeCurrentPage <= 1 || isLoading}
              aria-label="First page"
              title="First page"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Previous Page Button */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1 || isLoading}
            aria-label="Previous page"
            title="Previous page"
            className="h-7 px-2.5 inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {/* SaaS Central Page Badge */}
          <div
            data-testid="pagination-page-indicator"
            className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium select-none"
          >
            <span>
              Page <span className="font-semibold text-slate-900 dark:text-white">{safeCurrentPage}</span> of{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{safeTotalPages}</span>
            </span>
          </div>

          {/* Next Page Button */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= safeTotalPages || isLoading}
            aria-label="Next page"
            title="Next page"
            className="h-7 px-2.5 inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Last Page Button (Quick Jump) */}
          {safeTotalPages > 2 && (
            <button
              type="button"
              onClick={() => onPageChange(safeTotalPages)}
              disabled={safeCurrentPage >= safeTotalPages || isLoading}
              aria-label="Last page"
              title="Last page"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          )}
        </nav>
      </div>
    </div>
  );
};

export default Pagination;
