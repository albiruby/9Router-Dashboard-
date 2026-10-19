"use client";

import { ArrowClockwise } from "@phosphor-icons/react";
import { AnimatedNumber } from "@/components/animated-number";
import { cn } from "@/lib/cn";
import { formatCompact, formatCost, formatInt } from "@/lib/format";
import { Skeleton } from "@/components/skeleton";
import type { Stats } from "@/lib/types";

interface StatStripProps {
  stats: Stats | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function StatStrip({ stats, loading, error, onRetry }: StatStripProps) {
  const showSkeleton = loading && !stats;

  if (error && !stats) {
    return (
      <section className="panel flex flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-sm font-medium">Statistik belum tersedia</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{error}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="flex h-11 items-center gap-2 rounded-[9px] border border-line bg-surface-2 px-4 text-sm font-medium transition-colors hover:border-line-strong hover:bg-white/5"
        >
          <ArrowClockwise size={15} aria-hidden="true" />
          Coba lagi
        </button>
      </section>
    );
  }

  const items = [
    {
      label: "Request",
      raw: stats?.totalRequests ?? 0,
      format: formatInt,
      color: "text-ink",
      note: "periode terpilih",
      title: stats ? formatInt(stats.totalRequests) : undefined,
    },
    {
      label: "Token masuk",
      raw: stats?.totalPromptTokens ?? 0,
      format: formatCompact,
      color: "text-cyan",
      note: "prompt",
      title: stats ? formatInt(stats.totalPromptTokens) : undefined,
    },
    {
      label: "Token cached",
      raw: stats?.totalCachedTokens ?? 0,
      format: formatCompact,
      color: "text-blue",
      note: "cache hit",
      title: stats ? formatInt(stats.totalCachedTokens) : undefined,
    },
    {
      label: "Token keluar",
      raw: stats?.totalCompletionTokens ?? 0,
      format: formatCompact,
      color: "text-green",
      note: "completion",
      title: stats ? formatInt(stats.totalCompletionTokens) : undefined,
    },
    {
      label: "Estimasi biaya",
      raw: stats?.totalCost ?? 0,
      format: formatCost,
      color: "text-amber",
      note: "USD",
      title: stats ? formatCost(stats.totalCost) : undefined,
    },
  ];

  return (
    <section
      aria-label="Statistik penggunaan"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-3 xl:grid-cols-5"
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "min-w-0 bg-surface px-4 py-4 sm:px-5",
            index === 4 && "col-span-2 sm:col-span-1"
          )}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
            {item.label}
          </p>

          {showSkeleton ? (
            <Skeleton className="mt-2.5 h-7 w-3/4" />
          ) : (
            <AnimatedNumber
              value={item.raw}
              format={item.format}
              title={item.title}
              className={cn("mt-2 block font-mono text-[26px] font-medium leading-none", item.color)}
            />
          )}

          <p className="mt-2 text-[10px] text-ink-faint">{item.note}</p>
        </div>
      ))}
    </section>
  );
}
