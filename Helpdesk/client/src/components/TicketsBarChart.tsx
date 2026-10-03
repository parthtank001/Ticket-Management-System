import React, { useState } from 'react';
import { BarChart2, Calendar, TrendingUp, Sparkles } from 'lucide-react';
import { DailyTicketCount } from '../lib/types';
import { Skeleton } from './ui/skeleton';

interface TicketsBarChartProps {
  data?: DailyTicketCount[];
  isLoading?: boolean;
}

export const TicketsBarChart: React.FC<TicketsBarChartProps> = ({ data = [], isLoading = false }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
            <Skeleton className="h-3 w-64 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
        <Skeleton className="h-48 sm:h-56 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  const daysData = data && data.length > 0 ? data : [];
  const totalVolume = daysData.reduce((acc, curr) => acc + curr.count, 0);
  const avgPerDay = daysData.length > 0 ? (totalVolume / daysData.length).toFixed(1) : '0.0';
  const maxCount = Math.max(1, ...daysData.map((d) => d.count));
  const peakDay = daysData.reduce(
    (max, d) => (d.count > max.count ? d : max),
    daysData[0] || { date: '', formattedDate: '', count: 0 }
  );

  // Y-axis tick milestones
  const yTicks = [
    maxCount,
    Math.ceil(maxCount * 0.66),
    Math.ceil(maxCount * 0.33),
    0,
  ];

  return (
    <div
      className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-4"
      aria-label="30-day ticket volume bar chart"
    >
      {/* 1. Header & Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BarChart2 className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Tickets Created Per Day (Past 30 Days)
            </h3>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-normal">
            Daily inbound volume distribution and workload patterns over the last 30 days
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Total 30-Day Volume Pill */}
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Total:</span>
            <span className="font-bold text-slate-900 dark:text-white">{totalVolume.toLocaleString()}</span>
          </div>

          {/* Daily Average Pill */}
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
            <span className="text-slate-500 dark:text-slate-400">Daily Avg:</span>
            <span className="font-bold text-slate-900 dark:text-white">{avgPerDay}</span>
          </div>

          {/* Peak Day Pill */}
          {peakDay.count > 0 && (
            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">
              <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Peak: {peakDay.count} ({peakDay.formattedDate})</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Bar Chart */}
      <div className="relative pt-6 pb-2">
        {/* Y-Axis Grid Guidelines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-2">
          {yTicks.map((tick, idx) => (
            <div key={idx} className="w-full flex items-center">
              <span className="w-7 text-[10px] text-slate-400 dark:text-slate-500 font-medium text-right pr-2">
                {tick}
              </span>
              <div className="flex-1 border-b border-slate-200/80 dark:border-slate-800/70 border-dashed"></div>
            </div>
          ))}
        </div>

        {/* 30-Day Bars Container */}
        <div className="relative pl-7 h-44 sm:h-52 flex items-end justify-between gap-1 sm:gap-1.5">
          {daysData.map((item, index) => {
            const heightPercent = maxCount > 0 && item.count > 0
              ? Math.max(8, Math.round((item.count / maxCount) * 100))
              : 3;
            const isHovered = hoveredIndex === index;
            const isPeak = item.count === maxCount && item.count > 0;

            return (
              <div
                key={item.date || index}
                className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Floating Tooltip */}
                <div
                  className={`absolute bottom-full mb-2 z-20 pointer-events-none transition-all duration-150 transform ${
                    isHovered
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-1 scale-95'
                  }`}
                >
                  <div className="bg-slate-900 dark:bg-slate-950 text-white text-[10px] rounded-md px-2.5 py-1.5 shadow-lg whitespace-nowrap border border-slate-700 flex flex-col items-center">
                    <span className="font-bold text-indigo-300">
                      {item.count} {item.count === 1 ? 'ticket' : 'tickets'}
                    </span>
                    <span className="text-slate-400 text-[9px]">{item.formattedDate}</span>
                    <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-slate-950 rotate-45 -mb-1 mt-0.5 border-r border-b border-slate-700"></div>
                  </div>
                </div>

                {/* The Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-sm transition-all duration-200 ${
                    item.count > 0
                      ? isPeak
                        ? 'bg-gradient-to-t from-indigo-700 to-indigo-500 dark:from-indigo-600 dark:to-indigo-400 group-hover:from-indigo-600 group-hover:to-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                        : 'bg-indigo-500/80 dark:bg-indigo-500/70 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-400 group-hover:shadow-[0_0_8px_rgba(99,102,241,0.25)]'
                      : 'bg-slate-100 dark:bg-slate-800/60 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/80'
                  } ${isHovered ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : ''}`}
                ></div>
              </div>
            );
          })}
        </div>

        {/* 3. X-Axis Timeline Labels */}
        <div className="pl-7 pt-2 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-medium">
          {daysData.length >= 30 ? (
            <>
              <span>{daysData[0]?.formattedDate}</span>
              <span className="hidden sm:inline">{daysData[7]?.formattedDate}</span>
              <span>{daysData[14]?.formattedDate}</span>
              <span className="hidden sm:inline">{daysData[21]?.formattedDate}</span>
              <span>Today ({daysData[daysData.length - 1]?.formattedDate})</span>
            </>
          ) : (
            <>
              <span>{daysData[0]?.formattedDate || '30 days ago'}</span>
              <span>Today</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketsBarChart;
