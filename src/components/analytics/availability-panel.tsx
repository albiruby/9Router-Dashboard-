"use client";

import { CheckCircle, Prohibit, WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { providerMeta } from "@/lib/providers";
import { Panel } from "@/components/analytics/panel";
import { Skeleton } from "@/components/skeleton";
import type { AvailabilityResponse } from "@/lib/types";

interface AvailabilityPanelProps {
  availability: AvailabilityResponse | null;
  loading: boolean;
}

function untilText(until?: string | number): string {
  if (!until) return "";
  const target = typeof until === "number" ? until : new Date(until).getTime();
  if (!Number.isFinite(target)) return "";
  const remaining = target - Date.now();
  if (remaining <= 0) return "segera berakhir";
  const minutes = Math.ceil(remaining / 60000);
  if (minutes < 60) return `±${minutes} mnt lagi`;
  const hours = Math.floor(minutes / 60);
  return `±${hours} jam ${minutes % 60} mnt lagi`;
}

export function AvailabilityPanel({ availability, loading }: AvailabilityPanelProps) {
  const entries = availability?.models ?? [];

  return (
    <Panel title="Cooldown model" hint="Kunci sementara dan provider tidak tersedia">
      {loading && !availability ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2">
          <CheckCircle size={22} className="text-green" aria-hidden="true" />
          <p className="text-xs text-ink-muted">Semua model tersedia. Tidak ada cooldown aktif.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.slice(0, 8).map((entry, index) => {
            const meta = providerMeta(entry.provider);
            const cooldown = entry.status === "cooldown";
            return (
              <li
                key={`${entry.provider}-${entry.model}-${entry.connectionId}-${index}`}
                className="rounded-[9px] border border-line bg-surface-2/60 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]",
                      cooldown
                        ? "border-amber/30 bg-amber/10 text-amber"
                        : "border-red/30 bg-red/10 text-red"
                    )}
                  >
                    {cooldown ? (
                      <WarningCircle size={10} aria-hidden="true" />
                    ) : (
                      <Prohibit size={10} aria-hidden="true" />
                    )}
                    {cooldown ? "Cooldown" : "Offline"}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-ink">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: meta.color }}
                      aria-hidden="true"
                    />
                    {meta.name}
                  </span>
                  {entry.until ? (
                    <span className="ml-auto font-mono text-[10px] text-ink-faint">
                      {untilText(entry.until)}
                    </span>
                  ) : null}
                </div>
                <p
                  className="mt-1.5 truncate font-mono text-[11px] text-ink-muted"
                  title={`${entry.model} · ${entry.connectionName}`}
                >
                  {entry.model === "__all" ? "semua model" : entry.model}
                  <span className="text-ink-faint"> · {entry.connectionName}</span>
                </p>
                {entry.lastError ? (
                  <p className="mt-1 truncate text-[10px] text-red/80" title={entry.lastError}>
                    {entry.lastError}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
