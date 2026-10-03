import React, { useState, useMemo } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { AuthUser } from '../lib/auth-client';
import type { Ticket } from '../lib/types';
import { useTickets } from '../lib/hooks/useTickets';
import { TicketsTable } from './TicketsTable';
import { TicketDetailModal } from './TicketDetailModal';
import { BatchAutoResolveModal } from './BatchAutoResolveModal';
import { BatchClassifyModal } from './BatchClassifyModal';
import {
  Search,
  X,
  Bot,
  Brain,
} from 'lucide-react';

interface TicketsPageProps {
  user?: AuthUser;
  onNavigate?: (path: string) => void;
}

export const TicketsPage: React.FC<TicketsPageProps> = ({ user, onNavigate }) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Pagination States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Combine sorting, active filter, and pagination parameters for reactive React Query caching
  const serverQueryParams = useMemo(() => {
    const primary = sorting && sorting.length > 0 ? sorting[0] : null;
 
    return {
      sortBy: primary ? primary.id : 'createdAt',
      sortOrder: primary && !primary.desc ? ('asc' as const) : ('desc' as const),
      search: searchQuery.trim() || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      page,
      pageSize,
    };
  }, [sorting, searchQuery, statusFilter, categoryFilter, page, pageSize]);

  const { data, isLoading } = useTickets(serverQueryParams);

  // Defensive data extraction supporting both PaginatedTicketsResponse and raw Ticket[]
  const tickets: Ticket[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.tickets || [];
  }, [data]);

  const totalCount = useMemo(() => {
    if (!data) return 0;
    if (Array.isArray(data)) return data.length;
    return typeof data.total === 'number' ? data.total : tickets.length;
  }, [data, tickets.length]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    if (Array.isArray(data)) return Math.ceil(data.length / pageSize) || 1;
    return typeof data.totalPages === 'number' ? data.totalPages : Math.ceil(totalCount / pageSize) || 1;
  }, [data, totalCount, pageSize]);

  const currentPage = useMemo(() => {
    if (!data) return page;
    if (Array.isArray(data)) return page;
    return typeof data.page === 'number' ? data.page : page;
  }, [data, page]);

  // Modals state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBatchClassifyOpen, setIsBatchClassifyOpen] = useState(false);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (statusFilter !== 'ALL') count++;
    if (categoryFilter !== 'ALL') count++;
    return count;
  }, [searchQuery, statusFilter, categoryFilter]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setPage(1);
  };

  // Handle table header sort toggles from TanStack table
  const handleSortingChange: React.Dispatch<React.SetStateAction<SortingState>> = (updater) => {
    setSorting(updater);
    setPage(1);
  };

  // Keep selectedTicket synchronized with updated data
  const currentSelectedTicket = useMemo(() => {
    if (!selectedTicket) return null;
    return tickets.find((t) => t.id === selectedTicket.id) || selectedTicket;
  }, [tickets, selectedTicket]);

  const handleSelectTicket = (ticket: Ticket) => {
    if (onNavigate) {
      onNavigate(`/tickets/${ticket.id}`);
    } else {
      setSelectedTicket(ticket);
      setIsDetailOpen(true);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4 px-4 sm:px-6 font-sans space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <h1 aria-label="Ticket" className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>Tickets</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBatchClassifyOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 rounded-md text-[11px] font-bold transition-all shadow-xs dark:shadow-[0_0_10px_rgba(168,85,247,0.12)] cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Batch Classify</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBatchModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 rounded-md text-[11px] font-bold transition-all shadow-xs dark:shadow-[0_0_10px_rgba(99,102,241,0.12)] cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Batch Auto-Resolve</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 rounded-lg p-1.5 shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] w-fit">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Search Input */}
          <div className="relative w-44 sm:w-52 flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search tickets..."
              className="w-full pl-8 pr-7 py-1 text-[11px] bg-slate-50 dark:bg-slate-950/70 hover:bg-white dark:hover:bg-slate-950 focus:bg-white dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 placeholder:text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors h-7"
              aria-label="Search tickets"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-0.5 rounded-full"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              aria-label="Filter by status"
              className="h-7 text-[11px] bg-slate-50 dark:bg-slate-950/70 hover:bg-white dark:hover:bg-slate-950 focus:bg-white dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="PROCESSING">Processing</option>
              <option value="NEW">New</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              aria-label="Filter by category"
              className="h-7 text-[11px] bg-slate-50 dark:bg-slate-950/70 hover:bg-white dark:hover:bg-slate-950 focus:bg-white dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="GENERAL_QUESTION">General Question</option>
              <option value="TECHNICAL_QUESTION">Technical Question</option>
              <option value="REFUND_REQUEST">Refund Request</option>
              <option value="UNCATEGORIZED">Uncategorized</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Tickets Table with TanStack Sorting & Pagination */}
      <TicketsTable
        tickets={tickets}
        isLoading={isLoading}
        onSelectTicket={handleSelectTicket}
        onNavigate={onNavigate}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        hasActiveFilters={activeFiltersCount > 0}
        onClearFilters={handleClearFilters}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          pageSize,
          onPageChange: setPage,
        }}
      />

      {/* Ticket Detail & Thread Modal */}
      <TicketDetailModal
        ticket={currentSelectedTicket}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTicket(null);
        }}
      />

      {/* Batch Auto-Resolve Modal */}
      <BatchAutoResolveModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
      />

      {/* Batch Ticket Classification Modal */}
      <BatchClassifyModal
        isOpen={isBatchClassifyOpen}
        onClose={() => setIsBatchClassifyOpen(false)}
      />
    </div>
  );
};

