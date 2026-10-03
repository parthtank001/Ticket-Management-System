import React from 'react';
import { AuthUser } from '../lib/auth-client';
import { useDashboardStats } from '../lib/hooks/useDashboard';
import {
  Ticket,
  ShieldCheck,
  Headphones,
  Bot,
  Zap,
  Clock,
  Inbox,
  BarChart3,
} from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { ErrorMessage } from './ErrorMessage';
import { TicketsBarChart } from './TicketsBarChart';

interface HomePageProps {
  user: AuthUser;
  onNavigate?: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN';
  const { data: stats, isLoading, isError, error, refetch } = useDashboardStats();

  return (
    <div className="max-w-6xl mx-auto py-5 px-4 sm:px-6 lg:px-8 font-sans space-y-6">
      {/* 1. Header & Welcome Bar */}
      <div className="bg-white dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium mb-2">
              {isAdmin ? <ShieldCheck className="h-3 w-3 text-indigo-600 dark:text-indigo-400" /> : <Headphones className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
              <span>{isAdmin ? 'Administrator Dashboard' : 'Support Agent Workspace'}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Live Ops</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Support Operations & AI Analytics
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
              Logged in as <span className="font-semibold text-slate-900 dark:text-slate-200">{user.name || user.email}</span> ({user.role})
            </p>
          </div>
        </div>
      </div>

      {/* Error state display */}
      {isError && (
        <div className="space-y-2">
          <ErrorMessage
            message={error instanceof Error ? error.message : 'Failed to load dashboard metrics'}
            variant="amber"
          />
          <button
            onClick={() => refetch()}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline ml-1 cursor-pointer"
          >
            Click here to retry
          </button>
        </div>
      )}

      {/* 2. Primary 5 KPI Metric Cards */}
      <section aria-labelledby="kpi-metrics-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="kpi-metrics-heading" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Key Performance Indicators</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                  <Skeleton className="h-7 w-7 rounded-md bg-slate-200 dark:bg-slate-800" />
                </div>
                <Skeleton className="h-6 w-14 rounded bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Total Tickets */}
            <div
              className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/50 rounded-xl p-3.5 sm:p-4 shadow-xs hover:shadow-sm dark:hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all group relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Tickets
                </span>
                <div className="h-7 w-7 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Ticket className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {stats.totalTickets.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  {stats.resolvedTickets + stats.closedTickets} completed · {stats.openTickets} pending
                </p>
              </div>
            </div>

            {/* 2. Open Tickets */}
            <div
              className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 hover:border-amber-500/50 rounded-xl p-3.5 sm:p-4 shadow-xs hover:shadow-sm dark:hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all group relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Open Tickets
                </span>
                <div className="h-7 w-7 rounded-md bg-amber-50 dark:bg-amber-950/70 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Inbox className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                  {stats.openTickets.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Active triage backlog
                </p>
              </div>
            </div>

            {/* 3. Number of Tickets Resolved by AI */}
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 hover:border-purple-500/50 rounded-xl p-3.5 sm:p-4 shadow-xs hover:shadow-sm dark:hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] transition-all group relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Resolved by AI
                </span>
                <div className="h-7 w-7 rounded-md bg-purple-50 dark:bg-purple-950/70 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-300 tracking-tight">
                  {stats.aiResolvedTickets.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Knowledge Base automated
                </p>
              </div>
            </div>

            {/* 4. % of Tickets Resolved by AI */}
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/50 rounded-xl p-3.5 sm:p-4 shadow-xs hover:shadow-sm dark:hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all group relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  % Resolved by AI
                </span>
                <div className="h-7 w-7 rounded-md bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <Zap className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {stats.aiResolvedPercentage}%
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 dark:bg-emerald-400 h-1 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    style={{ width: `${Math.min(100, Math.max(0, stats.aiResolvedPercentage))}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {stats.aiResolvedPercentageOfResolved}% of completed tickets
                </p>
              </div>
            </div>

            {/* 5. Average Resolution Time */}
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 hover:border-sky-500/50 rounded-xl p-3.5 sm:p-4 shadow-xs hover:shadow-sm dark:hover:shadow-[0_0_15px_rgba(14,165,233,0.15)] transition-all group relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Avg Resolution Time
                </span>
                <div className="h-7 w-7 rounded-md bg-sky-50 dark:bg-sky-950/70 border border-sky-200/80 dark:border-sky-800/60 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:bg-sky-600 group-hover:text-white transition-all">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {stats.avgResolutionTimeFormatted || '0s'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate" title={`AI: ${stats.aiAvgResolutionTimeFormatted} · Agent: ${stats.humanAvgResolutionTimeFormatted}`}>
                  AI: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.aiAvgResolutionTimeFormatted}</span> · Staff: <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.humanAvgResolutionTimeFormatted}</span>
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* 3. 30-Day Daily Ticket Volume Bar Chart */}
      <section aria-labelledby="tickets-trend-heading">
        <TicketsBarChart data={stats?.ticketsPerDay} isLoading={isLoading} />
      </section>
    </div>
  );
};

export default HomePage;
