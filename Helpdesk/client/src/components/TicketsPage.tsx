import React, { useState, useMemo } from 'react';
import { AuthUser } from '../lib/auth-client';
import type {
  Ticket,
  TicketStatus,
  Priority,
  Category,
} from '../lib/types';
import { useTickets, useAgents } from '../lib/hooks/useTickets';
import { TicketsTable } from './TicketsTable';
import { TicketDetailModal } from './TicketDetailModal';
import { CreateTicketModal } from './CreateTicketModal';
import {
  Search,
  Plus,
  RotateCw,
  SlidersHorizontal,
  Ticket as TicketIcon,
  CheckCircle2,
  Clock,
  Filter,
  X,
  ArrowUpDown,
} from 'lucide-react';

interface TicketsPageProps {
  user: AuthUser;
}

type SortOption = 'newest' | 'oldest' | 'priority_desc' | 'priority_asc' | 'id_desc';

const PRIORITY_ORDER: Record<Priority, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const TicketsPage: React.FC<TicketsPageProps> = ({ user }) => {
  const { data: tickets = [], isLoading, isFetching, refetch } = useTickets();
  const { data: agents = [] } = useAgents();

  // State filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TicketStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | Priority>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | Category | 'UNCATEGORIZED'>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<'ALL' | 'ME' | 'UNASSIGNED' | string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('newest'); // Default: newest first

  // Modals state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Status counts for tab counters
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: tickets.length,
      OPEN: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    tickets.forEach((t) => {
      if (t.status === 'OPEN') counts.OPEN++;
      if (t.status === 'RESOLVED') counts.RESOLVED++;
      if (t.status === 'CLOSED') counts.CLOSED++;
    });
    return counts;
  }, [tickets]);

  // Filter and Sort tickets (Sorted by newest first by default)
  const filteredAndSortedTickets = useMemo(() => {
    return tickets
      .filter((t) => {
        // Status filter
        if (statusFilter !== 'ALL' && t.status !== statusFilter) {
          return false;
        }

        // Priority filter
        if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) {
          return false;
        }

        // Category filter
        if (categoryFilter === 'UNCATEGORIZED' && t.category !== null) {
          return false;
        }
        if (categoryFilter !== 'ALL' && categoryFilter !== 'UNCATEGORIZED' && t.category !== categoryFilter) {
          return false;
        }

        // Assignee filter
        if (assigneeFilter === 'ME' && t.assignedAgentId !== user.id) {
          return false;
        }
        if (assigneeFilter === 'UNASSIGNED' && t.assignedAgentId !== null) {
          return false;
        }
        if (assigneeFilter !== 'ALL' && assigneeFilter !== 'ME' && assigneeFilter !== 'UNASSIGNED' && t.assignedAgentId !== assigneeFilter) {
          return false;
        }

        // Search term filter (matches subject, studentName, studentEmail, id)
        if (searchTerm.trim()) {
          const lower = searchTerm.trim().toLowerCase();
          const matchId = String(t.id).includes(lower);
          const matchSubject = t.subject.toLowerCase().includes(lower);
          const matchName = t.studentName.toLowerCase().includes(lower);
          const matchEmail = t.studentEmail.toLowerCase().includes(lower);
          if (!matchId && !matchSubject && !matchName && !matchEmail) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'newest': // Default: newest first
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'oldest':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'priority_desc':
            return (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
          case 'priority_asc':
            return (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0);
          case 'id_desc':
            return b.id - a.id;
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [tickets, statusFilter, priorityFilter, categoryFilter, assigneeFilter, searchTerm, sortBy, user.id]);

  // Keep selectedTicket synchronized with updated data
  const currentSelectedTicket = useMemo(() => {
    if (!selectedTicket) return null;
    return tickets.find((t) => t.id === selectedTicket.id) || selectedTicket;
  }, [tickets, selectedTicket]);

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    assigneeFilter !== 'ALL';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setCategoryFilter('ALL');
    setAssigneeFilter('ALL');
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 font-sans space-y-6">
      {/* Top Header & Stat Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <TicketIcon className="h-6 w-6 text-indigo-600" />
            <span>Welcome to the Helpdesk, {user.name}!</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <span className="font-semibold text-slate-700">{user.email}</span> • Manage, triage, and respond to inbound student support inquiries
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            title="Refresh tickets list"
          >
            <RotateCw className={`h-3.5 w-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>New Ticket</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Toolbar Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Tickets ({statusCounts.ALL})
            </button>
            <button
              onClick={() => setStatusFilter('OPEN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                statusFilter === 'OPEN'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>Open ({statusCounts.OPEN})</span>
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                statusFilter === 'RESOLVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Resolved ({statusCounts.RESOLVED})</span>
            </button>
            <button
              onClick={() => setStatusFilter('CLOSED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'CLOSED'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Closed ({statusCounts.CLOSED})</span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline-block">
              Sort by:
            </span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold cursor-pointer appearance-none pr-7"
              >
                <option value="newest">Newest First (Default)</option>
                <option value="oldest">Oldest First</option>
                <option value="priority_desc">Highest Priority</option>
                <option value="priority_asc">Lowest Priority</option>
                <option value="id_desc">Ticket ID</option>
              </select>
              <ArrowUpDown className="h-3 w-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Search & Secondary Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by subject, student, email, or #ID..."
              className="w-full text-xs rounded-xl border border-slate-200 pl-9 pr-3 py-2 bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="GENERAL_QUESTION">General Question</option>
              <option value="TECHNICAL_QUESTION">Technical Question</option>
              <option value="REFUND_REQUEST">Refund Request</option>
              <option value="UNCATEGORIZED">Uncategorized</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium cursor-pointer"
            >
              <option value="ALL">All Assignees</option>
              <option value="ME">Assigned to Me</option>
              <option value="UNASSIGNED">Unassigned</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Action */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>
            Showing <strong className="text-slate-800">{filteredAndSortedTickets.length}</strong> of{' '}
            <strong className="text-slate-800">{tickets.length}</strong> tickets
            {sortBy === 'newest' && ' (Sorted by newest first)'}
          </span>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center space-x-1"
            >
              <X className="h-3 w-3" />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tickets Table */}
      <TicketsTable
        tickets={filteredAndSortedTickets}
        isLoading={isLoading}
        onSelectTicket={handleSelectTicket}
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

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
