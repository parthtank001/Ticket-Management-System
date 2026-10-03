import React, { useState, useMemo } from 'react';
import {
  flexRender,
  type SortingState,
} from '@tanstack/react-table';
import {
  useLegacyTable as useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type LegacyColumnDef as ColumnDef,
} from '@tanstack/react-table/legacy';
import {
  Ticket,
  TicketStatus,
  Category,
} from '../lib/types';
import {
  TicketStatusBadge,
  TicketCategoryBadge,
} from './TicketBadges';
import { formatDateCompact } from '../lib/utils';
import { Skeleton } from './ui/skeleton';
import { Pagination } from './Pagination';
import {
  MessageSquare,
  Inbox,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';

export interface TicketsTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export interface TicketsTableProps {
  tickets: Ticket[];
  isLoading: boolean;
  onSelectTicket: (ticket: Ticket) => void;
  onNavigate?: (path: string) => void;
  sorting?: SortingState;
  onSortingChange?: React.Dispatch<React.SetStateAction<SortingState>>;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  pagination?: TicketsTablePaginationProps;
}

export const TicketsTable: React.FC<TicketsTableProps> = ({
  tickets,
  isLoading,
  onSelectTicket,
  onNavigate,
  sorting: externalSorting,
  onSortingChange: externalOnSortingChange,
  hasActiveFilters = false,
  onClearFilters,
  pagination,
}) => {
  const [internalSorting, setInternalSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);

  const sorting = externalSorting !== undefined ? externalSorting : internalSorting;
  const onSortingChange =
    externalOnSortingChange !== undefined ? externalOnSortingChange : setInternalSorting;

  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        id: 'subject',
        accessorKey: 'subject',
        header: 'Subject',
        cell: ({ row }) => {
          const ticket = row.original;
          return (
            <div className="flex items-start space-x-2.5">
              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-1.5 py-0.5 rounded text-[10px] border border-indigo-200/80 dark:border-indigo-800/60 shrink-0 shadow-xs dark:shadow-[0_0_8px_rgba(99,102,241,0.15)]">
                #{ticket.id}
              </span>
              <div>
                <a
                  href={`/tickets/${ticket.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (onNavigate) {
                      onNavigate(`/tickets/${ticket.id}`);
                    } else {
                      onSelectTicket(ticket);
                    }
                  }}
                  className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 hover:underline transition-colors line-clamp-1 cursor-pointer block"
                >
                  {ticket.subject}
                </a>
                <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                  <span className="flex items-center space-x-1">
                    <MessageSquare className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                    <span>{ticket.messages?.length || (ticket.body ? 1 : 0)}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'studentName',
        accessorKey: 'studentName',
        header: 'Sender',
        cell: ({ row }) => {
          const ticket = row.original;
          return (
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-200">
                {ticket.studentName}
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                {ticket.studentEmail}
              </div>
            </div>
          );
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <TicketStatusBadge status={row.original.status} size="sm" />
        ),
      },
      {
        id: 'category',
        accessorFn: (row) => row.category || '',
        header: 'Category',
        cell: ({ row }) => (
          <TicketCategoryBadge category={row.original.category} size="sm" />
        ),
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => {
          const formattedDate = formatDateCompact(row.original.createdAt);
          return (
            <div className="text-right text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
              {formattedDate}
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      sorting,
    },
    onSortingChange,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="py-2.5 px-3 flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-2.5 w-1/3">
                <Skeleton className="h-5 w-10 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                  <Skeleton className="h-2.5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4.5 w-14 rounded-full bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-4.5 w-14 rounded-md bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-4.5 w-20 rounded-md bg-slate-200 dark:bg-slate-800" />
              </div>
              <Skeleton className="h-3.5 w-20 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-8 text-center shadow-xs">
        <div className="mx-auto h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-2.5">
          <Inbox className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          {hasActiveFilters ? 'No Matching Tickets' : 'No Tickets Found'}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-3">
          {hasActiveFilters
            ? 'No tickets match your search filters. Try adjusting your query or resetting filters.'
            : 'No tickets match your search filters, or no support inquiries have been submitted yet.'}
        </p>
        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear All Filters</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const isSorted = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        scope="col"
                        className={`py-2.5 px-3.5 ${
                          header.column.id === 'createdAt' ? 'text-right' : ''
                        } ${
                          header.column.id === 'actions' ? 'px-2 text-center' : ''
                        } ${
                          canSort ? 'cursor-pointer select-none' : ''
                        }`}
                        aria-sort={
                          isSorted === 'asc'
                            ? 'ascending'
                            : isSorted === 'desc'
                            ? 'descending'
                            : undefined
                        }
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              header.column.getToggleSortingHandler()?.(e);
                            }}
                            className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 -mx-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 group/sort focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 cursor-pointer ${
                              isSorted
                                ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 font-extrabold shadow-xs dark:shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                            } ${header.column.id === 'createdAt' ? 'ml-auto justify-end' : ''}`}
                            title={`Sort by ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.column.id}`}
                          >
                            <span>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>
                            <span className="inline-flex items-center shrink-0">
                              {isSorted === 'asc' ? (
                                <ArrowUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" aria-label="sorted ascending" />
                              ) : isSorted === 'desc' ? (
                                <ArrowDown className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" aria-label="sorted descending" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 text-slate-400 dark:text-slate-500 group-hover/sort:text-slate-600 dark:group-hover/sort:text-slate-300 shrink-0 transition-colors" />
                              )}
                            </span>
                          </button>
                        ) : (
                          <div
                            className={`inline-flex items-center ${
                              header.column.id === 'createdAt' ? 'justify-end w-full' : ''
                            }`}
                          >
                            <span>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
              {table.getRowModel().rows.map((row) => {
                const ticket = row.original;
                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectTicket(ticket)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`py-2.5 px-3.5 ${
                          cell.column.id === 'createdAt'
                            ? 'text-right'
                            : ''
                        } ${
                          cell.column.id === 'actions' ? 'px-2 text-center' : ''
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && pagination.totalCount > 0 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          isLoading={isLoading}
          itemLabel="tickets"
        />
      )}
    </div>
  );
};

export default TicketsTable;
