import React, { useState, useMemo } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { AuthUser } from '../lib/auth-client';
import type { Ticket } from '../lib/types';
import { useTickets } from '../lib/hooks/useTickets';
import { TicketsTable } from './TicketsTable';
import { TicketDetailModal } from './TicketDetailModal';
import { CreateTicketModal } from './CreateTicketModal';

interface TicketsPageProps {
  user?: AuthUser;
}

export const TicketsPage: React.FC<TicketsPageProps> = () => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);

  // Extract server-side sort parameters from TanStack Table's sorting state
  const serverSortParams = useMemo(() => {
    if (!sorting || sorting.length === 0) {
      return { sortBy: 'createdAt', sortOrder: 'desc' as const };
    }
    const primary = sorting[0];
    return {
      sortBy: primary.id,
      sortOrder: primary.desc ? ('desc' as const) : ('asc' as const),
    };
  }, [sorting]);

  const { data: tickets = [], isLoading, refetch } = useTickets(serverSortParams);

  // Modals state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
    <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 font-sans">
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-base font-bold text-slate-900 tracking-tight">
          Ticket
        </h1>
      </div>

      {/* Main Tickets Table with TanStack Sorting */}
      <TicketsTable
        tickets={tickets}
        isLoading={isLoading}
        onSelectTicket={handleSelectTicket}
        sorting={sorting}
        onSortingChange={handleSortingChange}
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
