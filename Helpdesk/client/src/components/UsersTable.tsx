import React from 'react';
import { Role } from '@helpdesk/core';
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
  // Avatar Initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Format creation timestamp
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-lg shadow-xs overflow-hidden">
      {isLoading ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                <th scope="col" className="py-2 pl-3.5 pr-2.5">Name</th>
                <th scope="col" className="px-2.5 py-2">Email</th>
                <th scope="col" className="px-2.5 py-2">Role</th>
                <th scope="col" className="py-2 pl-2.5 pr-3.5">Date Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-slate-50/30">
                  {/* 1. Name Column Skeleton */}
                  <td className="py-1.5 pl-3.5 pr-2.5 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-6 w-6 rounded-md shrink-0" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  </td>

                  {/* 2. Email Column Skeleton */}
                  <td className="px-2.5 py-1.5 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
                      <Skeleton className="h-3 w-32 rounded" />
                    </div>
                  </td>

                  {/* 3. Role Column Skeleton */}
                  <td className="px-2.5 py-1.5 whitespace-nowrap">
                    <Skeleton className="h-4 w-14 rounded" />
                  </td>

                  {/* 4. Date Created Column Skeleton */}
                  <td className="py-1.5 pl-2.5 pr-3.5 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : users.length === 0 ? (
        <div className="py-10 text-center px-4">
          <div className="mx-auto h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1.5">
            <Users className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-800">No users found</h3>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
            There are no user records to display.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                <th scope="col" className="py-2 pl-3.5 pr-2.5">Name</th>
                <th scope="col" className="px-2.5 py-2">Email</th>
                <th scope="col" className="px-2.5 py-2">Role</th>
                <th scope="col" className="py-2 pl-2.5 pr-3.5">Date Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {users.map((item) => {
                const isSelf = item.id === currentUser.id;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* 1. Name Column */}
                    <td className="py-1.5 pl-3.5 pr-2.5 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`h-6 w-6 rounded-md flex items-center justify-center font-bold text-[9px] shadow-2xs shrink-0 ${
                            item.role === Role.ADMIN
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {getInitials(item.name)}
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-[11px] text-slate-900">
                            {item.name}
                          </span>
                          {isSelf && (
                            <span className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Email Column */}
                    <td className="px-2.5 py-1.5 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-[11px] text-slate-600">
                        <Mail className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                        <span>{item.email}</span>
                      </div>
                    </td>

                    {/* 3. Role Column */}
                    <td className="px-2.5 py-1.5 whitespace-nowrap">
                      {item.role === Role.ADMIN ? (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
                          <Shield className="h-2.5 w-2.5 text-indigo-600" />
                          <span>{Role.ADMIN}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
                          <UserCheck className="h-2.5 w-2.5 text-blue-600" />
                          <span>{Role.AGENT}</span>
                        </span>
                      )}
                    </td>

                    {/* 4. Date Created Column */}
                    <td className="py-1.5 pl-2.5 pr-3.5 whitespace-nowrap text-[11px] text-slate-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-2.5 w-2.5 text-slate-400" />
                          <span>{formatDate(item.createdAt)}</span>
                        </div>

                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={() => onEditUser(item)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                            title="Edit user"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>

                          {!isSelf && item.role !== Role.ADMIN && (
                            <button
                              onClick={() => onDeleteUser({ id: item.id, name: item.name })}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                              title="Delete user"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="h-3 w-3" />
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
