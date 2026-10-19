"use client";

import { useMemo } from "react";
import { formatCompact, formatCost, formatInt, timeAgo } from "@/lib/format";
import type { ProviderStyleLookup } from "@/lib/providers";
import { Panel } from "@/components/analytics/panel";
import { Skeleton } from "@/components/skeleton";
import type { Stats } from "@/lib/types";

interface ModelLeaderboardProps {
  stats: Stats | null;
  loading: boolean;
  providerStyle: ProviderStyleLookup;
}

export function ModelLeaderboard({ stats, loading, providerStyle }: ModelLeaderboardProps) {
  const rows = useMemo(() => {
    if (!stats) return [];
    return Object.values(stats.byModel)
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 12);
  }, [stats]);

  return (
    <Panel
      title="Model teratas"
      hint={rows.length > 0 ? `Diurutkan dari ${Object.keys(stats?.byModel ?? {}).length} model` : "Periode terpilih"}
      bodyClassName="px-0 py-0 md:px-0"
    >
      {loading && !stats ? (
        <div className="space-y-2 px-4 py-4 md:px-5">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-xs text-ink-muted">Belum ada pemakaian model pada periode ini.</p>
        </div>
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-left text-xs sm:min-w-[420px]">
            <thead>
              <tr className="border-b border-line font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
                <th scope="col" className="px-4 py-2.5 font-medium md:px-5">
                  Model
                </th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">
                  Provider
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Req
                </th>
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium md:table-cell">
                  Token
                </th>
                <th scope="col" className="hidden px-3 py-2.5 text-right font-medium lg:table-cell">
                  Biaya
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium md:px-5">
                  Terakhir
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const style = providerStyle(row.provider);
                return (
                  <tr
                    key={`${row.rawModel}-${row.provider}`}
                    className="border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="max-w-[220px] px-4 py-2.5 md:px-5">
                      <span
                        className="block truncate font-mono text-[11px] text-ink"
                        title={row.rawModel}
                      >
                        {row.rawModel}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2.5 sm:table-cell">
                      <span className="flex items-center gap-1.5 text-ink-muted">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: style.color }}
                          aria-hidden="true"
                        />
                        <span className="max-w-[140px] truncate">{style.name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[11px] text-ink">
                      {formatInt(row.requests)}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right font-mono text-[11px] text-ink-muted md:table-cell">
                      {formatCompact(row.promptTokens + row.completionTokens)}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right font-mono text-[11px] text-amber lg:table-cell">
                      {formatCost(row.cost)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[10px] text-ink-faint md:px-5">
                      {timeAgo(row.lastUsed)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
