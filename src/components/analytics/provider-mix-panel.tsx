"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { formatCompact, formatInt, formatPercent } from "@/lib/format";
import { providerMeta } from "@/lib/providers";
import { Panel } from "@/components/analytics/panel";
import { Skeleton } from "@/components/skeleton";
import type { Stats } from "@/lib/types";

interface ProviderMixPanelProps {
  stats: Stats | null;
  loading: boolean;
}

interface MixRow {
  id: string;
  name: string;
  color: string;
  requests: number;
  tokens: number;
}

const DONUT_SIZE = 164;
const DONUT_RADIUS = 54;
const DONUT_STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

export function ProviderMixPanel({ stats, loading }: ProviderMixPanelProps) {
  const rows = useMemo<MixRow[]>(() => {
    if (!stats) return [];
    const list = Object.entries(stats.byProvider).map(([id, bucket]) => {
      const meta = providerMeta(id);
      return {
        id,
        name: meta.name,
        color: meta.color,
        requests: bucket.requests,
        tokens: bucket.promptTokens + bucket.completionTokens,
      };
    });
    return list.sort((a, b) => b.requests - a.requests);
  }, [stats]);

  const totalRequests = rows.reduce((sum, row) => sum + row.requests, 0);
  const topRows = rows.slice(0, 6);
  const restRequests = rows.slice(6).reduce((sum, row) => sum + row.requests, 0);
  const segments = [
    ...topRows,
    ...(restRequests > 0
      ? [{ id: "__rest", name: "Lainnya", color: "#6b7484", requests: restRequests, tokens: 0 }]
      : []),
  ];

  const cacheShare =
    stats && stats.totalCachedTokens + stats.totalPromptTokens > 0
      ? (stats.totalCachedTokens / (stats.totalCachedTokens + stats.totalPromptTokens)) * 100
      : 0;

  const hasData = totalRequests > 0;

  return (
    <Panel
      title="Sebaran provider"
      hint={hasData ? `${rows.length} provider memakai periode ini` : "Periode terpilih"}
    >
      {loading && !stats ? (
        <Skeleton className="h-[240px] w-full" />
      ) : !hasData ? (
        <div className="flex h-[240px] items-center justify-center rounded-[10px] border border-dashed border-line">
          <p className="text-xs text-ink-muted">Belum ada request tercatat.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <svg
                width={DONUT_SIZE}
                height={DONUT_SIZE}
                viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
                role="img"
                aria-label="Distribusi request per provider"
              >
                <g transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}>
                  <circle
                    cx={DONUT_SIZE / 2}
                    cy={DONUT_SIZE / 2}
                    r={DONUT_RADIUS}
                    fill="none"
                    stroke="#161a21"
                    strokeWidth={DONUT_STROKE}
                  />
                  {segments.reduce<{ offset: number; nodes: React.ReactNode[] }>(
                    (acc, segment) => {
                      const share = segment.requests / totalRequests;
                      const length = share * CIRCUMFERENCE;
                      acc.nodes.push(
                        <circle
                          key={segment.id}
                          cx={DONUT_SIZE / 2}
                          cy={DONUT_SIZE / 2}
                          r={DONUT_RADIUS}
                          fill="none"
                          stroke={segment.color}
                          strokeWidth={DONUT_STROKE}
                          strokeDasharray={`${Math.max(0, length - 2)} ${CIRCUMFERENCE - Math.max(0, length - 2)}`}
                          strokeDashoffset={-acc.offset}
                          strokeLinecap="butt"
                        />
                      );
                      acc.offset += length;
                      return acc;
                    },
                    { offset: 0, nodes: [] }
                  ).nodes}
                </g>
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-lg font-medium leading-none">
                  {formatInt(totalRequests)}
                </span>
                <span className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                  request
                </span>
              </div>
            </div>

            <ul className="min-w-0 flex-1 space-y-2">
              {segments.slice(0, 7).map((segment) => {
                const share = totalRequests > 0 ? (segment.requests / totalRequests) * 100 : 0;
                return (
                  <li key={segment.id} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2 w-2 shrink-0 rounded-[3px]"
                      style={{ backgroundColor: segment.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-ink-muted">{segment.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-ink">
                      {formatInt(segment.requests)}
                    </span>
                    <span className="w-10 shrink-0 text-right font-mono text-[10px] text-ink-faint">
                      {formatPercent(share)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
                Porsi token cache
              </p>
              <p className="font-mono text-xs text-blue">{formatPercent(cacheShare)}</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#161a21]">
              <div
                className={cn("h-full rounded-full bg-blue transition-[width] duration-700 ease-out")}
                style={{ width: `${Math.min(100, Math.max(0, cacheShare))}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">
              {formatCompact(stats?.totalCachedTokens ?? 0)} token cache dari{" "}
              {formatCompact(
                (stats?.totalCachedTokens ?? 0) + (stats?.totalPromptTokens ?? 0)
              )}{" "}
              token masuk periode ini.
            </p>
          </div>
        </>
      )}
    </Panel>
  );
}
