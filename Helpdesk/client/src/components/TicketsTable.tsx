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
import { Skeleton } from './ui/skeleton';
import {
  MessageSquare,
  Inbox,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';

export interface TicketsTableProps {
  tickets: Ticket[];
  isLoading: boolean;
  onSelectTicket: (ticket: Ticket) => void;
  sorting?: SortingState;
  onSortingChange?: React.Dispatch<React.SetStateAction<SortingState>>;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export const TicketsTable: React.FC<TicketsTableProps> = ({
  tickets,
  isLoading,
  onSelectTicket,
  sorting: externalSorting,
  onSortingChange: externalOnSortingChange,
  hasActiveFilters = false,
  onClearFilters,
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
              <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] border border-indigo-100/80 shrink-0">
                #{ticket.id}
              </span>
              <div>
                <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {ticket.subject}
                </span>
                <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                  <span className="flex items-center space-x-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{ticket.messages?.length || 0}</span>
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
              <div className="font-semibold text-slate-800">
                {ticket.studentName}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
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
          const formattedDate = new Date(row.original.createdAt).toLocaleString(
            undefined,
            {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }
          );
          return (
            <div className="text-right text-[10px] text-slate-400 whitespace-nowrap">
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
      <div className="bg-white border border-slate-200/80 rounded-lg shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="py-2.5 px-3 flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-2.5 w-1/3">
                <Skeleton className="h-5 w-10 rounded" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-40 rounded" />
                  <Skeleton className="h-2.5 w-24 rounded" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4.5 w-14 rounded-full" />
                <Skeleton className="h-4.5 w-14 rounded-md" />
                <Skeleton className="h-4.5 w-20 rounded-md" />
              </div>
              <Skeleton className="h-3.5 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-lg p-8 text-center shadow-xs">
        <div className="mx-auto h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
          <Inbox className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 mb-1">
          {hasActiveFilters ? 'No Matching Tickets' : 'No Tickets Found'}
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-3">
          {hasActiveFilters
            ? 'No tickets match your search filters. Try adjusting your query or resetting filters.'
            : 'No tickets match your search filters, or no support inquiries have been submitted yet.'}
        </p>
        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear All Filters</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-lg shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-bold text-slate-500 uppercase tracking-wider"
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={`py-2 px-3 ${
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
                            // Let the click bubble to th or handle here
                            e.stopPropagation();
                            header.column.getToggleSortingHandler()?.(e);
                          }}
                          className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 -mx-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 group/sort focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 cursor-pointer ${
                            isSorted
                              ? 'text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 font-extrabold shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
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
                              <ArrowUp className="h-3 w-3 text-indigo-600 shrink-0" aria-label="sorted ascending" />
                            ) : isSorted === 'desc' ? (
                              <ArrowDown className="h-3 w-3 text-indigo-600 shrink-0" aria-label="sorted descending" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-slate-400 group-hover/sort:text-slate-700 shrink-0 transition-colors" />
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
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {table.getRowModel().rows.map((row) => {
              const ticket = row.original;
              return (
                <tr
                  key={row.id}
                  onClick={() => onSelectTicket(ticket)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`py-2.5 px-3 ${
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
  );
};

export default TicketsTable;
