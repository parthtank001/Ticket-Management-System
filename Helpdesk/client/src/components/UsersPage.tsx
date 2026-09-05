import React from 'react';
import { AuthUser } from '../lib/auth-client';
import { useUsers } from '../lib/hooks/useUsers';
import {
  Shield,
  UserCheck,
  Mail,
  Calendar,
  AlertCircle,
  Loader2,
  Users,
} from 'lucide-react';

interface UsersPageProps {
  user: AuthUser;
}

export const UsersPage: React.FC<UsersPageProps> = ({ user: currentUser }) => {
  const { data: users = [], isLoading, error } = useUsers();

  // Get User Initials for Avatar
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
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">
        Users
      </h1>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 flex items-center justify-between bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-xs">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span className="text-sm font-medium">{error instanceof Error ? error.message : 'Failed to load users directory.'}</span>
          </div>
        </div>
      )}

      {/* Users Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No users found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are no user records to display.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="py-3.5 pl-6 pr-4">Name</th>
                  <th scope="col" className="px-4 py-3.5">Email</th>
                  <th scope="col" className="px-4 py-3.5">Role</th>
                  <th scope="col" className="py-3.5 pl-4 pr-6">Date Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {users.map((item) => {
                  const isSelf = item.id === currentUser.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* 1. Name Column */}
                      <td className="py-3.5 pl-6 pr-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 ${
                              item.role === 'ADMIN'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {getInitials(item.name)}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">
                              {item.name}
                            </span>
                            {isSelf && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Email Column */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{item.email}</span>
                        </div>
                      </td>

                      {/* 3. Role Column */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.role === 'ADMIN' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
                            <Shield className="h-3.5 w-3.5 text-indigo-600" />
                            <span>ADMIN</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
                            <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                            <span>AGENT</span>
                          </span>
                        )}
                      </td>

                      {/* 4. Date Created Column */}
                      <td className="py-3.5 pl-4 pr-6 whitespace-nowrap text-xs text-slate-600 font-medium">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatDate(item.createdAt)}</span>
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
    </div>
  );
};
