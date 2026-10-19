"use client";

import { useMemo } from "react";
import { formatCompact, formatCost, formatInt } from "@/lib/format";
import type { ProviderStyleLookup } from "@/lib/providers";
import { Panel } from "@/components/analytics/panel";
import { Skeleton } from "@/components/skeleton";
import type { Stats } from "@/lib/types";

interface AccountsPanelProps {
  stats: Stats | null;
  loading: boolean;
  providerStyle: ProviderStyleLookup;
}

interface AccountRow {
  account: string;
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
  models: number;
}

export function AccountsPanel({ stats, loading, providerStyle }: AccountsPanelProps) {
  const rows = useMemo<AccountRow[]>(() => {
    if (!stats) return [];
    const map = new Map<string, AccountRow & { modelSet: Set<string> }>();
    for (const entry of Object.values(stats.byAccount)) {
      const key = entry.accountName || entry.connectionId || "Tanpa nama";
      const row =
        map.get(key) ??
        ({
          account: key,
          provider: entry.provider,
          requests: 0,
          tokens: 0,
          cost: 0,
          models: 0,
          modelSet: new Set<string>(),
        } satisfies AccountRow & { modelSet: Set<string> });
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
    <Panel title="Akun tersibuk" hint="Agregat semua model per akun">
      {loading && !stats ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-xs text-ink-muted">Belum ada aktivitas akun pada periode ini.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const style = providerStyle(row.provider);
            const share = (row.requests / maxRequests) * 100;
            return (
              <li key={row.account}>
                <div className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: style.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-ink" title={row.account}>
                    {row.account}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-ink">
                    {formatInt(row.requests)}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#161a21]">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${share}%`, backgroundColor: style.color, opacity: 0.75 }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-ink-faint">
                  {style.name} · {row.models} model · {formatCompact(row.tokens)} token ·{" "}
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
