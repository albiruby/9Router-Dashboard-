"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { AnimatedNumber } from "@/components/animated-number";
import { Skeleton } from "@/components/skeleton";
import { cn } from "@/lib/cn";
import { formatCompact, formatCost, formatInt } from "@/lib/format";
import type { MinuteBucket, Stats } from "@/lib/types";

const EMPTY_BUCKET: MinuteBucket = {
  requests: 0,
  promptTokens: 0,
  completionTokens: 0,
  cost: 0,
};

interface PulsePanelProps {
  stats: Stats | null;
  loading: boolean;
}

export function PulsePanel({ stats, loading }: PulsePanelProps) {
  const buckets =
    stats?.last10Minutes && stats.last10Minutes.length > 0
      ? stats.last10Minutes
      : Array.from({ length: 10 }, () => EMPTY_BUCKET);
  const current = buckets[buckets.length - 1];
  const maxRequests = Math.max(1, ...buckets.map((bucket) => bucket.requests));
  const activeTotal = (stats?.activeRequests ?? []).reduce(
    (sum, request) => sum + (request.count || 1),
    0
  );
  const tokensThisMinute = (current?.promptTokens ?? 0) + (current?.completionTokens ?? 0);
  const showSkeleton = loading && !stats;
  const errorProvider = stats?.errorProvider || "";

  return (
    <section
      aria-label="Denyut aktivitas 10 menit terakhir"
      className="panel flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-5"
    >
      <div className="flex shrink-0 items-center gap-3">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            showSkeleton
              ? "bg-line-strong"
              : errorProvider
                ? "bg-red animate-pulse-soft"
                : activeTotal > 0
                  ? "bg-amber animate-pulse-soft"
                  : "bg-ink-faint"
          )}
          aria-hidden="true"
        />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Denyut
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            {showSkeleton ? (
              <Skeleton className="h-5 w-9" />
            ) : (
              <AnimatedNumber
                value={activeTotal}
                format={formatInt}
                className={cn(
                  "font-mono text-xl font-medium leading-none",
                  activeTotal > 0 ? "text-amber" : "text-ink"
                )}
              />
            )}
            <span className="text-[11px] text-ink-muted">aktif</span>
          </div>
        </div>
      </div>

      <div className="order-last w-full min-w-0 flex-1 basis-full sm:order-none sm:basis-auto">
        <div
          className="flex h-11 items-end gap-[3px]"
          role="img"
          aria-label="Request per menit selama 10 menit terakhir"
        >
          {showSkeleton
            ? Array.from({ length: 10 }, (_, bar) => (
                <Skeleton key={bar} className="h-full w-full flex-1 rounded-[2px]" />
              ))
            : buckets.map((bucket, index) => {
                const isNow = index === buckets.length - 1;
                const active = bucket.requests > 0;
                return (
                  <span
                    key={index}
                    title={`${formatInt(bucket.requests)} request`}
                    className={cn(
                      "w-full flex-1 rounded-[2px] transition-[height,background-color] duration-700 ease-out",
                      isNow && active && "animate-bar-pulse"
                    )}
                    style={{
                      height: `${Math.max(8, (bucket.requests / maxRequests) * 100)}%`,
                      backgroundColor: isNow
                        ? active
                          ? "#f6b73c"
                          : "#2a313d"
                        : active
                          ? "rgba(246, 183, 60, 0.45)"
                          : "#191e26",
                    }}
                  />
                );
              })}
        </div>
        <div className="mt-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
          <span>10 menit lalu</span>
          <span>kini</span>
        </div>
      </div>

      <dl className="flex shrink-0 items-center gap-4 sm:gap-5">
        <div>
          <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
            Req/menit
          </dt>
          <dd className="mt-1 font-mono text-sm leading-none text-ink">
            {showSkeleton ? <Skeleton className="h-4 w-8" /> : formatInt(current?.requests ?? 0)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
            Token/menit
          </dt>
          <dd className="mt-1 font-mono text-sm leading-none text-ink">
            {showSkeleton ? <Skeleton className="h-4 w-10" /> : formatCompact(tokensThisMinute)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
            Biaya/menit
          </dt>
          <dd className="mt-1 font-mono text-sm leading-none text-amber">
            {showSkeleton ? <Skeleton className="h-4 w-12" /> : formatCost(current?.cost ?? 0)}
          </dd>
        </div>
      </dl>

      {errorProvider ? (
        <span className="animate-pulse-soft inline-flex shrink-0 items-center gap-1.5 rounded-[7px] border border-red/30 bg-red/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-red">
          <WarningCircle size={13} aria-hidden="true" />
          Eror · {errorProvider}
        </span>
      ) : null}
    </section>
  );
}
