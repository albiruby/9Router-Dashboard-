"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  CircleNotch,
  Gauge,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { ProviderIcon } from "@/components/provider-icon";
import { cn } from "@/lib/cn";
import { handleUnauthorized } from "@/lib/client";
import {
  formatCompact,
  formatCost,
  formatDateTime,
  formatInt,
  formatPercent,
  timeAgo,
} from "@/lib/format";
import type { QuotaItem, QuotaResponse, Stats, UiProvider } from "@/lib/types";

interface QuotaState {
  status: "idle" | "loading" | "success" | "error";
  data?: QuotaResponse;
  error?: string;
}

interface ProviderDrawerProps {
  provider: UiProvider;
  stats: Stats | null;
  onClose: () => void;
}

function matchesProvider(value: string, provider: UiProvider): boolean {
  const key = (value || "").toLowerCase();
  return key === provider.id.toLowerCase() || key === provider.name.toLowerCase();
}

function quotaItems(data: QuotaResponse | undefined): QuotaItem[] {
  if (!data) return [];
  if (Array.isArray(data.quotas)) return data.quotas;
  if (Array.isArray(data.windows)) return data.windows;
  return [];
}

function resetDate(value: QuotaItem["resetAt"]): string {
  if (!value) return "";
  const timestamp =
    typeof value === "number"
      ? value < 1_000_000_000_000
        ? value * 1000
        : value
      : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  return `Reset ${formatDateTime(timestamp)}`;
}

function QuotaBar({ quota }: { quota: QuotaItem }) {
  const total = typeof quota.total === "number" ? quota.total : 0;
  const used = typeof quota.used === "number" ? quota.used : 0;
  const unlimited = total <= 0;
  const remaining = unlimited
    ? 100
    : typeof quota.remainingPercentage === "number"
      ? quota.remainingPercentage
      : ((total - used) / total) * 100;
  const remainingPct = Math.min(100, Math.max(0, remaining));
  const tone =
    remainingPct > 50 ? "bg-green" : remainingPct > 20 ? "bg-amber" : "bg-red";
  const textTone =
    remainingPct > 50 ? "text-green" : remainingPct > 20 ? "text-amber" : "text-red";
  const reset = resetDate(quota.resetAt);

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-xs font-medium text-ink">
          {quota.name || quota.label || "Kuota"}
        </p>
        <p className={cn("shrink-0 font-mono text-[11px]", textTone)}>
          {unlimited ? "Tanpa batas" : `${formatPercent(remainingPct)} tersisa`}
        </p>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", tone)}
          style={{ width: `${unlimited ? 100 : remainingPct}%` }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-ink-faint">
        <span>
          {unlimited
            ? "Tidak ada batas yang dilaporkan"
            : `${formatInt(used)} / ${formatInt(total)} terpakai`}
        </span>
        {reset ? <span>{reset}</span> : null}
      </div>
    </div>
  );
}

export function ProviderDrawer({ provider, stats, onClose }: ProviderDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const [quota, setQuota] = useState<Record<string, QuotaState>>({});

  useEffect(() => {
    previousFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => closeRef.current?.focus(), 40);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus.current instanceof HTMLElement) {
        previousFocus.current.focus();
      }
    };
  }, [onClose]);

  const models = useMemo(() => {
    if (!stats) return [];
    return Object.values(stats.byModel)
      .filter((entry) => matchesProvider(entry.provider, provider))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 6);
  }, [stats, provider]);

  async function loadQuota(connectionId: string) {
    setQuota((current) => ({
      ...current,
      [connectionId]: { status: "loading", data: current[connectionId]?.data },
    }));

    try {
      const response = await fetch(`/api/live/quota/${encodeURIComponent(connectionId)}`, {
        cache: "no-store",
      });
      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }
      const data = (await response.json().catch(() => null)) as
        | QuotaResponse
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error((data as { error?: string } | null)?.error || "Gagal memuat kuota.");
      }
      setQuota((current) => ({
        ...current,
        [connectionId]: { status: "success", data: data as QuotaResponse },
      }));
    } catch (cause) {
      setQuota((current) => ({
        ...current,
        [connectionId]: {
          status: "error",
          data: current[connectionId]?.data,
          error: cause instanceof Error ? cause.message : "Gagal memuat kuota.",
        },
      }));
    }
  }

  const active = provider.activeCount > 0;
  const tokenTotal = provider.promptTokens + provider.completionTokens;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-drawer-title"
        className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[16px] border border-line bg-surface shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[460px] md:rounded-none md:border-y-0 md:border-r-0"
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <ProviderIcon
            name={provider.name}
            icon={provider.icon}
            color={provider.color}
            size={40}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <h2 id="provider-drawer-title" className="truncate text-base font-semibold">
              {provider.name}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    provider.error
                      ? "bg-red"
                      : active
                        ? "animate-pulse-soft"
                        : provider.lastUsed
                          ? "bg-ink-faint"
                          : "bg-line-strong"
                  )}
                  style={active && !provider.error ? { backgroundColor: provider.color } : undefined}
                  aria-hidden="true"
                />
                {provider.error
                  ? "Error pada request terakhir"
                  : active
                    ? `${provider.activeCount} request aktif`
                    : provider.lastUsed
                      ? `Terakhir ${timeAgo(provider.lastUsed)}`
                      : "Belum dipakai"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {provider.connections.length > 0
                  ? `${provider.connections.length} koneksi`
                  : "Tanpa koneksi tersimpan"}
              </span>
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup detail provider"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px] border border-line bg-surface-2 text-ink-muted transition-colors hover:border-line-strong hover:bg-white/5 hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
            <Metric label="Request" value={formatCompact(provider.requests)} title={formatInt(provider.requests)} />
            <Metric
              label="Token masuk"
              value={formatCompact(provider.promptTokens)}
              title={formatInt(provider.promptTokens)}
            />
            <Metric
              label="Token keluar"
              value={formatCompact(provider.completionTokens)}
              title={formatInt(provider.completionTokens)}
            />
            <Metric
              label="Token cached"
              value={formatCompact(provider.cachedTokens)}
              title={formatInt(provider.cachedTokens)}
            />
            <Metric
              label="Estimasi biaya"
              value={formatCost(provider.cost)}
              title={formatCost(provider.cost)}
            />
            <Metric label="Total token" value={formatCompact(tokenTotal)} title={formatInt(tokenTotal)} />
          </div>

          <section className="mt-6" aria-labelledby="drawer-models-heading">
            <div className="flex items-center justify-between gap-2">
              <h3 id="drawer-models-heading" className="text-xs font-semibold">
                Model teratas
              </h3>
              <span className="font-mono text-[10px] text-ink-faint">{models.length}</span>
            </div>
            {models.length === 0 ? (
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                Belum ada model yang tercatat untuk provider ini pada periode terpilih.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-line/70 rounded-[10px] border border-line">
                {models.map((model) => {
                  const share =
                    provider.requests > 0 ? (model.requests / provider.requests) * 100 : 0;
                  return (
                    <li key={`${model.rawModel}-${model.provider}`} className="px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 truncate font-mono text-[11px] text-ink">
                          {model.rawModel}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-ink-muted">
                          {formatCompact(model.requests)} req
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(2, share))}%`,
                            backgroundColor: provider.color,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-ink-faint">
                        {formatCompact(model.promptTokens + model.completionTokens)} token ·{" "}
                        {formatCost(model.cost)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="mt-6" aria-labelledby="drawer-connections-heading">
            <div className="flex items-center gap-2">
              <Gauge size={15} className="text-ink-muted" aria-hidden="true" />
              <h3 id="drawer-connections-heading" className="text-xs font-semibold">
                Koneksi dan kuota
              </h3>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
              Kuota dimuat langsung dari provider saat diminta. Beberapa provider tidak
              melaporkan kuota langganan.
            </p>

            {provider.connections.length === 0 ? (
              <p className="mt-3 rounded-[9px] border border-line bg-surface-2 px-3 py-3 text-xs leading-relaxed text-ink-muted">
                Provider ini tercatat dari riwayat usage, tetapi tidak ada koneksi tersimpan di
                9Router.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {provider.connections.map((connection) => {
                  const state = quota[connection.id];
                  const items = quotaItems(state?.data);
                  const message = state?.data?.message || state?.data?.error;
                  return (
                    <li
                      key={connection.id}
                      className="rounded-[10px] border border-line bg-surface-2 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {connection.name || connection.email || "Koneksi tanpa nama"}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-ink-faint">
                            {[connection.email, connection.authType]
                              .filter(Boolean)
                              .join(" · ") || "Tidak ada detail autentikasi"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void loadQuota(connection.id)}
                          disabled={state?.status === "loading"}
                          className="flex h-9 shrink-0 items-center gap-1.5 rounded-[7px] border border-line bg-surface px-2.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:cursor-wait disabled:opacity-70"
                        >
                          {state?.status === "loading" ? (
                            <CircleNotch size={13} className="animate-spin" aria-hidden="true" />
                          ) : state?.status === "success" || state?.status === "error" ? (
                            <ArrowClockwise size={13} aria-hidden="true" />
                          ) : (
                            <Gauge size={13} aria-hidden="true" />
                          )}
                          {state?.status === "loading"
                            ? "Memuat"
                            : state?.status === "success" || state?.status === "error"
                              ? "Muat ulang"
                              : "Cek kuota"}
                        </button>
                      </div>

                      {state?.status === "loading" && !state.data ? (
                        <div className="mt-3">
                          <div className="skeleton h-3 w-2/3 rounded" />
                          <div className="skeleton mt-2 h-1.5 w-full rounded-full" />
                        </div>
                      ) : null}

                      {state?.error ? (
                        <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-red">
                          <WarningCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                          {state.error}
                        </p>
                      ) : null}

                      {items.length > 0 ? (
                        <div className="mt-1 divide-y divide-line/60">
                          {items.map((item, index) => (
                            <QuotaBar key={`${item.name || item.label || "quota"}-${index}`} quota={item} />
                          ))}
                        </div>
                      ) : message && state?.status !== "loading" ? (
                        <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">{message}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="border-t border-line px-5 py-3">
          <p className="text-[10px] leading-relaxed text-ink-faint">
            Detail dihitung dari data usage 9Router pada periode yang dipilih di dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className="min-w-0 bg-surface-2 px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">{label}</p>
      <p className="mt-1 truncate font-mono text-sm text-ink" title={title}>
        {value}
      </p>
    </div>
  );
}
