import React from 'react';
import { AuthUser } from '../lib/auth-client';
import { Ticket, Users, ArrowRight, ShieldCheck, Headphones } from 'lucide-react';

interface HomePageProps {
  user: AuthUser;
  onNavigate?: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ user, onNavigate }) => {
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 font-sans">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-3">
              {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
              <span>{isAdmin ? 'Administrator Workspace' : 'Support Agent Workspace'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Welcome to the Helpdesk
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Logged in as <span className="font-semibold text-slate-800">{user.name || user.email}</span> ({user.role})
            </p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tickets Card */}
        <div
          onClick={() => onNavigate?.('/tickets')}
          className="bg-white border border-slate-200/80 hover:border-indigo-300 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Ticket className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Tickets
            </h2>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              View, sort, filter, and respond to incoming student support tickets and inquiries.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
            <span>Open Tickets Queue</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Users Card (for Admin) or Info Card (for Agent) */}
        {isAdmin ? (
          <div
            onClick={() => onNavigate?.('/users')}
            className="bg-white border border-slate-200/80 hover:border-indigo-300 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Users Directory
              </h2>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Manage support agents and administrator accounts with full role-based access control.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <span>Manage Staff</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 mb-3">
                <Headphones className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Agent Portal
              </h2>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                You are assigned to the support agent team. Access the tickets queue to manage student inquiries.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-medium text-slate-400">
              <span>Active Support Shift</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
