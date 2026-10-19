"use client";

import { useMemo, useState } from "react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { formatCompact, formatInt, timeAgo } from "@/lib/format";
import { providerMeta } from "@/lib/providers";
import { Skeleton } from "@/components/skeleton";
import type { RecentRequest, UiProvider } from "@/lib/types";

interface LiveFeedProps {
  recentRequests: RecentRequest[];
  providers: UiProvider[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  paused: boolean;
  hasQuery: boolean;
}

export function LiveFeed({
  recentRequests,
  providers,
  loading,
  error,
  onRetry,
  paused,
  hasQuery,
}: LiveFeedProps) {
  const [filter, setFilter] = useState<"all" | "error">("all");

  const lookup = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const provider of providers) {
      map.set(provider.id.toLowerCase(), { name: provider.name, color: provider.color });
    }
    return map;
  }, [providers]);

  const rows = useMemo(() => {
    if (filter === "all") return recentRequests;
    return recentRequests.filter((request) => {
      const status = (request.status || "").toLowerCase();
      return status === "error" || status === "failed";
    });
  }, [recentRequests, filter]);

  const errorCount = recentRequests.filter((request) => {
    const status = (request.status || "").toLowerCase();
    return status === "error" || status === "failed";
  }).length;

  const showSkeleton = loading && recentRequests.length === 0;

  return (
    <section className="panel flex h-[520px] flex-col overflow-hidden lg:h-[598px] xl:h-[658px]">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5">
        <div>
          <h2 className="text-sm font-semibold">Request terbaru</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {recentRequests.length} request · {errorCount} error
          </p>
        </div>
        {paused ? (
          <span className="rounded-[6px] border border-line bg-surface-2 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-muted">
            Dijeda
          </span>
        ) : (
          <span className="flex items-center gap-1.5 pt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse-soft" aria-hidden="true" />
            Live
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-line px-3 py-2">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          Semua
        </FilterButton>
        <FilterButton active={filter === "error"} onClick={() => setFilter("error")}>
          Error {errorCount > 0 ? `(${errorCount})` : ""}
        </FilterButton>
      </div>

      <p className="sr-only" aria-live="polite">
        {recentRequests.length} request terbaru. {errorCount} error.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {showSkeleton ? (
          <ul className="divide-y divide-line/70" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
              <li key={index} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </li>
            ))}
          </ul>
        ) : error && recentRequests.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-red/30 bg-red/10 text-red">
              <WarningCircle size={19} aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium">Feed belum bisa dimuat</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 flex h-11 items-center gap-2 rounded-[9px] border border-line bg-surface-2 px-4 text-sm font-medium transition-colors hover:border-line-strong hover:bg-white/5"
            >
              <ArrowClockwise size={15} aria-hidden="true" />
              Coba lagi
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-2 font-mono text-xs text-ink-faint">
              0
            </span>
            <p className="mt-3 text-sm font-medium">
              {hasQuery
                ? "Tidak ada request yang cocok"
                : filter === "error"
                  ? "Tidak ada request error"
                  : "Belum ada request pada periode ini"}
            </p>
            <p className="mt-1 max-w-[30ch] text-xs leading-relaxed text-ink-muted">
              {hasQuery
                ? "Coba kata kunci model atau provider yang lain."
                : "Request akan muncul di sini saat 9Router mulai memproses traffic."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line/70">
            {rows.map((request, index) => {
              const provider = lookup.get(request.provider.toLowerCase());
              const meta = provider || providerMeta(request.provider);
              const status = (request.status || "").toLowerCase();
              const failed = status === "error" || status === "failed";
              return (
                <li
                  key={`${request.timestamp}-${request.model}-${request.provider}-${index}`}
                  className="animate-row-in px-4 py-2.5 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate font-mono text-[12px] text-ink">
                      {request.model}
                    </span>
                    <span
                      className="shrink-0 font-mono text-[10px] text-ink-faint"
                      title={new Date(request.timestamp).toLocaleString("id-ID")}
                    >
                      {timeAgo(request.timestamp)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-ink-muted">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: meta.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{meta.name}</span>
                    </span>
                    <span
                      className="font-mono text-cyan/90"
                      title={`${formatInt(request.promptTokens)} token masuk`}
                    >
                      in {formatCompact(request.promptTokens)}
                    </span>
                    <span
                      className="font-mono text-green/90"
                      title={`${formatInt(request.completionTokens)} token keluar`}
                    >
                      out {formatCompact(request.completionTokens)}
                    </span>
                    {failed ? (
                      <span className="inline-flex items-center gap-1 font-mono text-red">
                        <span className="h-1 w-1 rounded-full bg-red" aria-hidden="true" />
                        error
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[10px] text-ink-faint">
        <span>20 request terakhir</span>
        <span className="font-mono">
          {recentRequests[0] ? `Terakhir ${timeAgo(recentRequests[0].timestamp)}` : "Menunggu data"}
        </span>
      </div>
    </section>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 rounded-[6px] px-2.5 text-[11px] font-medium transition-colors",
        active ? "bg-white/[0.06] text-ink" : "text-ink-muted hover:bg-white/[0.03] hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}
