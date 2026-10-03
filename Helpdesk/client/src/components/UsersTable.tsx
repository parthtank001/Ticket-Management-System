import React from 'react';
import type { Role } from '@helpdesk/core';
import { AuthUser } from '../lib/auth-client';
import { ManagedUser } from '../lib/users-api';
import {
  Shield,
  UserCheck,
  Mail,
  Calendar,
  Users,
  Trash2,
  Pencil,
} from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { getInitials, formatDateOnly as formatDate } from '../lib/utils';

export interface UsersTableProps {
  users: ManagedUser[];
  currentUser: AuthUser;
  isLoading?: boolean;
  onEditUser: (user: ManagedUser) => void;
  onDeleteUser: (user: { id: string; name: string }) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  users,
  currentUser,
  isLoading = false,
  onEditUser,
  onDeleteUser,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-xs overflow-hidden">
      {isLoading ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th scope="col" className="py-2.5 pl-3.5 pr-2.5">Name</th>
                <th scope="col" className="px-2.5 py-2.5">Email</th>
                <th scope="col" className="px-2.5 py-2.5">Role</th>
                <th scope="col" className="py-2.5 pl-2.5 pr-3.5">Date Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  {/* 1. Name Column Skeleton */}
                  <td className="py-2.5 pl-3.5 pr-2.5 whitespace-nowrap">
                    <div className="flex items-center space-x-2.5">
                      <Skeleton className="h-6 w-6 rounded-md shrink-0 bg-slate-200 dark:bg-slate-800" />
                      <Skeleton className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </td>

                  {/* 2. Email Column Skeleton */}
                  <td className="px-2.5 py-2.5 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0 bg-slate-200 dark:bg-slate-800" />
                      <Skeleton className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </td>

                  {/* 3. Role Column Skeleton */}
                  <td className="px-2.5 py-2.5 whitespace-nowrap">
                    <Skeleton className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                  </td>

                  {/* 4. Date Created Column Skeleton */}
                  <td className="py-2.5 pl-2.5 pr-3.5 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0 bg-slate-200 dark:bg-slate-800" />
                      <Skeleton className="h-3.5 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center px-4">
          <div className="mx-auto h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-2">
            <Users className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">No users found</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-0.5">
            There are no user records to display.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th scope="col" className="py-2.5 pl-3.5 pr-2.5">Name</th>
                <th scope="col" className="px-2.5 py-2.5">Email</th>
                <th scope="col" className="px-2.5 py-2.5">Role</th>
                <th scope="col" className="py-2.5 pl-2.5 pr-3.5">Date Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
              {users.map((item) => {
                const isSelf = item.id === currentUser.id;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* 1. Name Column */}
                    <td className="py-2.5 pl-3.5 pr-2.5 whitespace-nowrap">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`h-6 w-6 rounded-md flex items-center justify-center font-bold text-[9px] shadow-xs shrink-0 ${
                            item.role === 'ADMIN'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {getInitials(item.name)}
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {item.name}
                          </span>
                          {isSelf && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Email Column */}
                    <td className="px-2.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <Mail className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span>{item.email}</span>
                      </div>
                    </td>

                    {/* 3. Role Column */}
                    <td className="px-2.5 py-2.5 whitespace-nowrap">
                      {item.role === 'ADMIN' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs">
                          <Shield className="h-2.5 w-2.5 text-indigo-600 dark:text-indigo-400" />
                          <span>ADMIN</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 dark:bg-blue-950/70 text-sky-700 dark:text-blue-300 border border-sky-200 dark:border-blue-800/60 shadow-2xs">
                          <UserCheck className="h-2.5 w-2.5 text-sky-600 dark:text-blue-400" />
                          <span>AGENT</span>
                        </span>
                      )}
                    </td>

                    {/* 4. Date Created Column */}
                    <td className="py-2.5 pl-2.5 pr-3.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                          <span>{formatDate(item.createdAt)}</span>
                        </div>

                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={() => onEditUser(item)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                            title="Edit user"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {!isSelf && item.role !== 'ADMIN' && (
                            <button
                              onClick={() => onDeleteUser({ id: item.id, name: item.name })}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-all cursor-pointer"
                              title="Delete user"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsersTable;
