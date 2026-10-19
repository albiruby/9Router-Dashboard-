"use client";

import { useMemo } from "react";
import { formatCompact, formatCost, formatInt } from "@/lib/format";
import { Panel } from "@/components/analytics/panel";
import { Skeleton } from "@/components/skeleton";
import type { Stats } from "@/lib/types";

interface EndpointsPanelProps {
  stats: Stats | null;
  loading: boolean;
}

interface EndpointRow {
  endpoint: string;
  requests: number;
  tokens: number;
  cost: number;
  models: number;
}

export function EndpointsPanel({ stats, loading }: EndpointsPanelProps) {
  const rows = useMemo<EndpointRow[]>(() => {
    if (!stats?.byEndpoint) return [];
    const map = new Map<string, EndpointRow & { modelSet: Set<string> }>();
    for (const entry of Object.values(stats.byEndpoint)) {
      const key = entry.endpoint || "Tidak dikenal";
      const row =
        map.get(key) ??
        ({
          endpoint: key,
          requests: 0,
          tokens: 0,
          cost: 0,
          models: 0,
          modelSet: new Set<string>(),
        } satisfies EndpointRow & { modelSet: Set<string> });
      row.requests += entry.requests;
      row.tokens += entry.promptTokens + entry.completionTokens;
      row.cost += entry.cost;
      row.modelSet.add(entry.rawModel);
      row.models = row.modelSet.size;
      map.set(key, row);
    }
    return Array.from(map.values())
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 8);
  }, [stats]);

  const maxRequests = Math.max(1, ...rows.map((row) => row.requests));

  return (
    <Panel title="Endpoint" hint="Titik masuk request yang dipakai klien">
      {loading && !stats ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-xs text-ink-muted">Belum ada data endpoint pada periode ini.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const share = (row.requests / maxRequests) * 100;
            return (
              <li key={row.endpoint}>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink" title={row.endpoint}>
                    {row.endpoint}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-ink">
                    {formatInt(row.requests)}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#161a21]">
                  <div
                    className="h-full rounded-full bg-cyan/70 transition-[width] duration-700 ease-out"
                    style={{ width: `${share}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-ink-faint">
                  {row.models} model · {formatCompact(row.tokens)} token ·{" "}
                  <span className="text-amber">{formatCost(row.cost)}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
