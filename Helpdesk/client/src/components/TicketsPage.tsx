import React, { useState, useMemo } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { AuthUser } from '../lib/auth-client';
import type { Ticket } from '../lib/types';
import { useTickets } from '../lib/hooks/useTickets';
import { TicketsTable } from './TicketsTable';
import { TicketDetailModal } from './TicketDetailModal';
import {
  Search,
  X,
} from 'lucide-react';

interface TicketsPageProps {
  user?: AuthUser;
}

export const TicketsPage: React.FC<TicketsPageProps> = ({ user }) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Combine sorting and active filter parameters for reactive React Query caching
  const serverQueryParams = useMemo(() => {
    const primary = sorting && sorting.length > 0 ? sorting[0] : null;
    return {
      sortBy: primary ? primary.id : 'createdAt',
      sortOrder: primary && !primary.desc ? ('asc' as const) : ('desc' as const),
      search: searchQuery.trim() || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
    };
  }, [sorting, searchQuery, statusFilter, categoryFilter]);

  const { data: tickets = [], isLoading } = useTickets(serverQueryParams);

  // Modals state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (statusFilter !== 'ALL') count++;
    if (categoryFilter !== 'ALL') count++;
    return count;
  }, [searchQuery, statusFilter, categoryFilter]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
  };

  // Handle table header sort toggles from TanStack table
  const handleSortingChange: React.Dispatch<React.SetStateAction<SortingState>> = (updater) => {
    setSorting(updater);
  };

  // Keep selectedTicket synchronized with updated data
  const currentSelectedTicket = useMemo(() => {
    if (!selectedTicket) return null;
    return tickets.find((t) => t.id === selectedTicket.id) || selectedTicket;
  }, [tickets, selectedTicket]);

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto py-4 px-4 sm:px-6 font-sans space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-slate-900 tracking-tight">
          Ticket
        </h1>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-md p-1 shadow-xs w-fit">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Search Input */}
          <div className="relative w-48 sm:w-56">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets by subject, sender, #ID..."
              className="w-full pl-7 pr-7 py-1 text-xs bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors h-7"
              aria-label="Search tickets"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
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
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="h-7 text-xs bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="h-7 text-xs bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium cursor-pointer"
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

      {/* Main Tickets Table with TanStack Sorting */}
      <TicketsTable
        tickets={tickets}
        isLoading={isLoading}
        onSelectTicket={handleSelectTicket}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        hasActiveFilters={activeFiltersCount > 0}
        onClearFilters={handleClearFilters}
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
    </div>
  );
};

