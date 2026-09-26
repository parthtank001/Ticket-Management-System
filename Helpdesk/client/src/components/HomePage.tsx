import React from 'react';
import { AuthUser } from '../lib/auth-client';
import { useDashboardStats } from '../lib/hooks/useDashboard';
import {
  Ticket,
  ArrowRight,
  ShieldCheck,
  Headphones,
  Bot,
  Zap,
  Clock,
  Inbox,
  Sparkles,
  BarChart3,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { ErrorMessage } from './ErrorMessage';
import { TicketsBarChart } from './TicketsBarChart';

interface HomePageProps {
  user: AuthUser;
  onNavigate?: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ user, onNavigate }) => {
  const isAdmin = user.role === 'ADMIN';
  const { data: stats, isLoading, isError, error, refetch } = useDashboardStats();

  return (
    <div className="max-w-6xl mx-auto py-5 px-4 sm:px-6 lg:px-8 font-sans space-y-6">
      {/* 1. Header & Welcome Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-[11px] font-medium mb-2">
              {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <Headphones className="h-3 w-3" />}
              <span>{isAdmin ? 'Administrator Dashboard' : 'Support Agent Workspace'}</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-700 font-medium">Live Ops</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Support Operations & AI Analytics
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Logged in as <span className="font-semibold text-slate-800">{user.name || user.email}</span> ({user.role})
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
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline ml-1"
          >
            Click here to retry
          </button>
        </div>
      )}

      {/* 2. Primary 5 KPI Metric Cards */}
      <section aria-labelledby="kpi-metrics-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="kpi-metrics-heading" className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
            <span>Key Performance Indicators</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Real-time telemetry</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-16 rounded" />
                  <Skeleton className="h-7 w-7 rounded-md" />
                </div>
                <Skeleton className="h-6 w-14 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Total Tickets */}
            <div
              onClick={() => onNavigate?.('/tickets')}
              className="bg-white border border-slate-200/80 hover:border-indigo-300 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Tickets
                </span>
                <div className="h-7 w-7 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Ticket className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {stats.totalTickets.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  {stats.resolvedTickets + stats.closedTickets} completed · {stats.openTickets} pending
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-indigo-600">
                <span>View Queue</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* 2. Open Tickets */}
            <div
              onClick={() => onNavigate?.('/tickets')}
              className="bg-white border border-slate-200/80 hover:border-amber-300 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Open Tickets
                </span>
                <div className="h-7 w-7 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Inbox className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight">
                  {stats.openTickets.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  Active triage backlog
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-amber-600">
                <span>Needs Attention</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* 3. Number of Tickets Resolved by AI */}
            <div className="bg-white border border-slate-200/80 hover:border-purple-300 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all group relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Resolved by AI
                </span>
                <div className="h-7 w-7 rounded-md bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">
                  {stats.aiResolvedTickets.toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  Knowledge Base automated
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center space-x-1 text-[11px] font-medium text-purple-600">
                <Sparkles className="h-3 w-3" />
                <span>Zero staff effort</span>
              </div>
            </div>

            {/* 4. % of Tickets Resolved by AI */}
            <div className="bg-white border border-slate-200/80 hover:border-emerald-300 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all group relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  % Resolved by AI
                </span>
                <div className="h-7 w-7 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Zap className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
                  {stats.aiResolvedPercentage}%
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, stats.aiResolvedPercentage))}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  {stats.aiResolvedPercentageOfResolved}% of completed tickets
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center space-x-1 text-[11px] font-medium text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                <span>AI Efficiency Rate</span>
              </div>
            </div>

            {/* 5. Average Resolution Time */}
            <div className="bg-white border border-slate-200/80 hover:border-sky-300 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all group relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Avg Resolution Time
                </span>
                <div className="h-7 w-7 rounded-md bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {stats.avgResolutionTimeFormatted || '0s'}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium truncate" title={`AI: ${stats.aiAvgResolutionTimeFormatted} · Agent: ${stats.humanAvgResolutionTimeFormatted}`}>
                  AI: <span className="font-semibold text-emerald-600">{stats.aiAvgResolutionTimeFormatted}</span> · Staff: <span className="font-semibold text-slate-700">{stats.humanAvgResolutionTimeFormatted}</span>
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-sky-600">
                <span>Speed Benchmark</span>
                <CheckCircle2 className="h-3 w-3" />
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
