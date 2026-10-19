"use client";

import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { ProviderIcon } from "@/components/provider-icon";
import { Skeleton } from "@/components/skeleton";
import { cn } from "@/lib/cn";
import { formatCompact, formatInt, timeAgo } from "@/lib/format";
import type { UiProvider } from "@/lib/types";

interface ProviderGridProps {
  providers: UiProvider[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (id: string) => void;
  hasQuery: boolean;
}

export function ProviderGrid({
  providers,
  loading,
  error,
  onRetry,
  onSelect,
  hasQuery,
}: ProviderGridProps) {
  return (
    <section aria-labelledby="provider-health-heading">
      <div className="flex flex-wrap items-end justify-between gap-2 pb-3">
        <div>
          <h2 id="provider-health-heading" className="text-sm font-semibold">
            Kesehatan provider
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Pemakaian per provider pada periode ini. Klik kartu untuk detail dan kuota.
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          {providers.length} provider
        </span>
      </div>

      {loading && providers.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-[132px] rounded-[12px]" />
          ))}
        </div>
      ) : error && providers.length === 0 ? (
        <div className="panel flex flex-col items-start gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Daftar provider belum tersedia</p>
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
        </div>
      ) : providers.length === 0 ? (
        <div className="panel flex items-center gap-3 px-4 py-5 text-sm text-ink-muted">
          <WarningCircle size={18} className="shrink-0 text-ink-faint" aria-hidden="true" />
          {hasQuery
            ? "Tidak ada provider yang cocok dengan pencarian."
            : "Belum ada provider yang bisa ditampilkan."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {providers.map((provider) => {
            const active = provider.activeCount > 0;
            const tokenTotal = provider.promptTokens + provider.completionTokens;
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => onSelect(provider.id)}
                className={cn(
                  "group flex min-w-0 flex-col rounded-[12px] border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong hover:bg-surface-2/60"
                )}
                style={{
                  borderColor: provider.error
                    ? "rgba(255,107,107,0.4)"
                    : active
                      ? `${provider.color}66`
                      : undefined,
                }}
                aria-label={`Buka detail ${provider.name}`}
              >
                <div className="flex w-full items-start gap-3">
                  <ProviderIcon name={provider.name} icon={provider.icon} color={provider.color} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{provider.name}</span>
                      {active ? (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full animate-pulse-soft"
                          style={{ backgroundColor: provider.color }}
                          aria-label="Memiliki request aktif"
                        />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                      {provider.error
                        ? "Error pada request terakhir"
                        : active
                          ? `${provider.activeCount} request aktif`
                          : provider.lastUsed
                            ? `Terakhir ${timeAgo(provider.lastUsed)}`
                            : "Belum dipakai pada periode ini"}
                    </span>
                  </span>
                  {provider.error ? (
                    <span className="shrink-0 rounded-[5px] border border-red/30 bg-red/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-red">
                      Error
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid w-full grid-cols-3 gap-2 border-t border-line/70 pt-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">
                      Request
                    </p>
                    <p
                      className="mt-1 truncate font-mono text-[13px] text-ink"
                      title={formatInt(provider.requests)}
                    >
                      {formatCompact(provider.requests)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">
                      Token
                    </p>
                    <p
                      className="mt-1 truncate font-mono text-[13px] text-ink"
                      title={formatInt(tokenTotal)}
                    >
                      {formatCompact(tokenTotal)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">
                      Biaya
                    </p>
                    <p className="mt-1 truncate font-mono text-[13px] text-ink">
                      ${provider.cost.toFixed(2)}
                    </p>
                  </div>
                </div>

                <span className="mt-3 flex w-full items-center justify-between text-[10px] text-ink-faint">
                  <span>
                    {provider.connections.length > 0
                      ? `${provider.connections.length} koneksi`
                      : "Koneksi tidak tersimpan"}
                  </span>
                  <span className="font-mono uppercase tracking-[0.08em] opacity-70 transition-opacity group-hover:opacity-100">
                    Detail
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
