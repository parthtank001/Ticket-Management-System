import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200 dark:bg-slate-800/80", className)}
      {...props}
    />
  );
}

function TicketDetailSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("max-w-3xl mx-auto py-4 px-3 sm:px-4 font-sans space-y-3", className)}
      {...props}
    >
      <div className="flex items-center space-x-2">
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-start">
        <div className="md:col-span-2 space-y-3">
          <div className="bg-white dark:bg-[#0D1527]/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 space-y-3">
            <Skeleton className="h-5 w-3/4 rounded" />
            <Skeleton className="h-3.5 w-1/2 rounded" />
          </div>
          <div className="bg-white dark:bg-[#0D1527]/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 space-y-2.5">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        </div>
        <div className="md:col-span-1 space-y-3">
          <div className="bg-white dark:bg-[#0D1527]/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export { Skeleton, TicketDetailSkeleton, TicketDetailSkeleton as TicketDetailPageSkeleton };
