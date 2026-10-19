"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  DownloadSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { Header } from "@/components/dashboard/header";
import { RequestDrawer } from "@/components/requests/request-drawer";
import { Skeleton } from "@/components/skeleton";
import { useProviders } from "@/hooks/use-providers";
import { useRequests } from "@/hooks/use-requests";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/cn";
import { formatClock, formatCompact, formatDuration, formatInt, formatPercent, timeAgo } from "@/lib/format";
import { providerMeta } from "@/lib/providers";
import {
  buildRequestParams,
  isRequestError,
  REQUEST_PAGE_SIZES,
  REQUEST_RANGES,
  REQUEST_STATUS_OPTIONS,
  type RequestRange,
} from "@/lib/request-query";
import type { RequestDetail } from "@/lib/types";

function StatusChip({ failed, status }: { failed: boolean; status?: string | null }) {
  const known = Boolean(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em]",
        failed
          ? "border-red/25 bg-red/10 text-red"
          : known
            ? "border-green/25 bg-green/10 text-green"
            : "border-line bg-surface-2 text-ink-muted"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          failed ? "bg-red" : known ? "bg-green" : "bg-ink-faint"
        )}
        aria-hidden="true"
      />
      {failed ? "Gagal" : known ? "Sukses" : "N/A"}
    </span>
  );
}

function textValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "—";
}

const selectClass =
  "h-9 rounded-[7px] border border-line bg-surface-2 px-2 text-[11px] text-ink transition-colors hover:border-line-strong focus:border-amber/60";

const subscribeNever = () => () => {};

function clientSnapshot(): boolean {
  return true;
}

function serverSnapshot(): boolean {
  return false;
}

export function RequestsShell() {
  const [range, setRange] = useState<RequestRange>("24h");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<RequestDetail | null>(null);
  const [modelOptions, setModelOptions] = useState<string[]>([]);

  const { data, loading, error, refresh } = useRequests({
    range,
    provider,
    model,
    status,
    page,
    pageSize,
  });
  const { data: providerData } = useProviders();
  const { mock, logout } = useSession();

  useEffect(() => {
    let cancelled = false;
    async function loadModelOptions() {
      try {
        const response = await fetch("/api/live/stats?period=7d", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          byModel?: Record<string, { rawModel?: string }>;
        };
        const names = new Set<string>();
        for (const entry of Object.values(payload.byModel ?? {})) {
          if (entry?.rawModel) names.add(entry.rawModel);
        }
        if (!cancelled) setModelOptions([...names].sort((a, b) => a.localeCompare(b)));
      } catch {
        // Suguhan model bersifat opsional; abaikan kegagalan.
      }
    }
    // Runs an async fetch; the state update waits for the response.
    void loadModelOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const providerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const connection of providerData?.connections ?? []) {
      if (!map.has(connection.provider)) {
        map.set(connection.provider, providerMeta(connection.provider, connection.name).name);
      }
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [providerData]);

  const connectionNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const connection of providerData?.connections ?? []) {
      map.set(connection.id, connection.name || connection.email || connection.provider);
    }
    return map;
  }, [providerData]);

  const isClient = useSyncExternalStore(subscribeNever, clientSnapshot, serverSnapshot);

  const exportQuery = useMemo(() => {
    if (!isClient) return "";
    return buildRequestParams({
      range,
      provider: provider || undefined,
      model: model || undefined,
      status: status || undefined,
    }).toString();
  }, [isClient, range, provider, model, status]);

  const details = data?.details ?? [];
  const pagination = data?.pagination;
  const totalItems = pagination?.totalItems ?? 0;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const firstIndex = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastIndex = Math.min(page * pageSize, totalItems);

  function onRangeChange(value: RequestRange) {
    setRange(value);
    setPage(1);
  }
  function onProviderChange(value: string) {
    setProvider(value);
    setPage(1);
  }
  function onModelChange(value: string) {
    setModel(value);
    setPage(1);
  }
  function onStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }
  function onPageSizeChange(value: number) {
    setPageSize(value);
    setPage(1);
  }

  return (
    <main className="mx-auto flex w-full max-w-[1560px] flex-col gap-4 px-3 py-4 sm:px-5 md:px-6 md:py-5">
      <h1 className="sr-only">Detail request 9Router</h1>

      <Header
        mock={mock}
        meta="Observability request · data diambil langsung dari 9Router"
        onLogout={() => void logout()}
      />

      <div className="panel flex flex-wrap items-center gap-x-2 gap-y-2.5 px-3 py-2.5 md:px-4">
        <div
          className="scrollbar-thin flex items-center gap-1 overflow-x-auto"
          role="group"
          aria-label="Rentang waktu"
        >
          {REQUEST_RANGES.map((option) => {
            const active = range === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onRangeChange(option.value)}
                aria-pressed={active}
                className={cn(
                  "h-9 shrink-0 rounded-[7px] px-2.5 text-[11px] font-medium transition-colors",
                  active ? "bg-amber/15 text-amber" : "text-ink-muted hover:bg-white/5 hover:text-ink"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <span className="hidden h-5 w-px bg-line sm:block" aria-hidden="true" />

        <label className="flex items-center gap-1.5">
          <span className="text-[10px] text-ink-faint">Provider</span>
          <select
            value={provider}
            onChange={(event) => onProviderChange(event.target.value)}
            className={selectClass}
          >
            <option value="">Semua</option>
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="text-[10px] text-ink-faint">Model</span>
          <select
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
            className={cn(selectClass, "max-w-[220px]")}
          >
            <option value="">Semua</option>
            {modelOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <span className="text-[10px] text-ink-faint">Status</span>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className={selectClass}
          >
            {REQUEST_STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="flex h-9 items-center gap-1.5 rounded-[7px] border border-line bg-surface-2 px-2.5 text-[11px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-white/5"
          >
            <ArrowClockwise size={13} className={loading ? "animate-spin" : undefined} aria-hidden="true" />
            Muat ulang
          </button>
          <a
            href={`/api/live/requests/export?format=csv&${exportQuery}`}
            className="flex h-9 items-center gap-1.5 rounded-[7px] border border-line bg-surface-2 px-2.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:bg-white/5 hover:text-ink"
            title="Unduh hasil filter sebagai CSV"
          >
            <DownloadSimple size={13} aria-hidden="true" />
            CSV
          </a>
          <a
            href={`/api/live/requests/export?format=json&${exportQuery}`}
            className="hidden h-9 items-center gap-1.5 rounded-[7px] border border-line bg-surface-2 px-2.5 text-[11px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:bg-white/5 hover:text-ink sm:flex"
            title="Unduh hasil filter sebagai JSON"
          >
            <DownloadSimple size={13} aria-hidden="true" />
            JSON
          </a>
        </div>
      </div>

      {error ? (
        <div className="panel flex flex-wrap items-center justify-between gap-3 border-amber/20 px-4 py-3">
          <p className="flex items-center gap-2 text-xs leading-relaxed text-ink-muted">
            <WarningCircle size={16} className="shrink-0 text-amber" aria-hidden="true" />
            {error}
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="flex h-9 items-center gap-1.5 rounded-[7px] border border-line bg-surface-2 px-2.5 text-[11px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-white/5"
          >
            <ArrowClockwise size={13} aria-hidden="true" />
            Coba lagi
          </button>
        </div>
      ) : null}

      <div className="panel overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full border-collapse text-left md:min-w-[920px]">
            <thead>
              <tr className="border-b border-line text-[9px] uppercase tracking-[0.1em] text-ink-faint">
                <th className="px-4 py-2.5 font-medium">Waktu</th>
                <th className="px-3 py-2.5 font-medium">Model</th>
                <th className="px-3 py-2.5 font-medium">Provider</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell">Akun</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">TTFT</th>
                <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Total</th>
                <th className="hidden px-3 py-2.5 text-right font-medium md:table-cell">Token</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {details.map((detail, index) => {
                const connectionName = detail.connectionId
                  ? connectionNames.get(detail.connectionId)
                  : undefined;
                const providerInfo = providerMeta(detail.provider || "", connectionName);
                const failed = isRequestError(detail.status);
                const prompt = detail.tokens?.prompt_tokens ?? 0;
                const completion = detail.tokens?.completion_tokens ?? 0;
                const cached = detail.tokens?.cached_tokens ?? 0;

                return (
                  <tr
                    key={detail.id ?? `${detail.timestamp}-${index}`}
                    onClick={() => setSelected(detail)}
                    className="cursor-pointer border-b border-line/60 transition-colors last:border-b-0 hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <p className="font-mono text-[11px] text-ink">{formatClock(detail.timestamp)}</p>
                      <p className="text-[10px] text-ink-faint">{timeAgo(detail.timestamp)}</p>
                    </td>
                    <td className="max-w-[150px] px-3 py-2.5 md:max-w-[230px]">
                      <p className="truncate font-mono text-[11px] text-ink" title={detail.model || undefined}>
                        {detail.model || "—"}
                      </p>
                      <p className="truncate text-[10px] text-ink-faint">{textValue(detail.endpoint)}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: providerInfo.color }}
                          aria-hidden="true"
                        />
                        {providerInfo.name}
                      </span>
                    </td>
                    <td
                      className="hidden max-w-[170px] truncate px-3 py-2.5 text-[11px] text-ink-muted md:table-cell"
                      title={connectionName || undefined}
                    >
                      {connectionName || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusChip failed={failed} status={detail.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[11px] text-ink-muted">
                      {formatDuration(detail.latency?.ttft)}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 text-right font-mono text-[11px] text-ink-muted sm:table-cell">
                      {formatDuration(detail.latency?.total)}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 text-right md:table-cell">
                      <p className="font-mono text-[11px] text-ink-muted">
                        {formatCompact(prompt)} → {formatCompact(completion)}
                      </p>
                      {cached > 0 ? (
                        <p className="text-[10px] text-cyan">
                          cached {formatPercent((cached / Math.max(1, prompt)) * 100)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(detail);
                        }}
                        aria-label={`Lihat detail ${detail.model || "request"}`}
                        className="h-8 rounded-[7px] border border-line bg-surface-2 px-2.5 text-[10px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}

              {loading && details.length === 0
                ? Array.from({ length: 6 }, (_, index) => (
                    <tr key={`skeleton-${index}`} className="border-b border-line/60 last:border-b-0">
                      <td className="px-4 py-3"><Skeleton className="h-3.5 w-16" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3.5 w-32 md:w-40" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3.5 w-20" /></td>
                      <td className="hidden px-3 py-3 md:table-cell"><Skeleton className="h-3.5 w-24" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3.5 w-16" /></td>
                      <td className="px-3 py-3"><Skeleton className="ml-auto h-3.5 w-12" /></td>
                      <td className="hidden px-3 py-3 sm:table-cell"><Skeleton className="ml-auto h-3.5 w-14" /></td>
                      <td className="hidden px-3 py-3 md:table-cell"><Skeleton className="ml-auto h-3.5 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="ml-auto h-3.5 w-12" /></td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>

        {!loading && details.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-14 text-center">
            <p className="text-sm text-ink">Tidak ada request untuk filter ini.</p>
            <p className="max-w-md text-[11px] leading-relaxed text-ink-faint">
              Jika kamu yakin ada trafik, pastikan observability 9Router aktif
              (enableObservability / ENABLE_REQUEST_LOGS) dan coba perluas rentang waktu.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5 text-[11px] text-ink-muted md:px-4">
          <p>
            {totalItems === 0 ? (
              "Tidak ada request"
            ) : (
              <>
                Menampilkan{" "}
                <span className="font-mono text-ink">
                  {formatInt(firstIndex)}–{formatInt(lastIndex)}
                </span>{" "}
                dari <span className="font-mono text-ink">{formatInt(totalItems)}</span> request
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[10px] text-ink-faint">
              Baris
              <select
                value={pageSize}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
                className="h-8 rounded-[7px] border border-line bg-surface-2 px-1.5 font-mono text-[11px] text-ink"
              >
                {REQUEST_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!pagination?.hasPrev || loading}
              aria-label="Halaman sebelumnya"
              className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-line bg-surface-2 text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CaretLeft size={13} aria-hidden="true" />
            </button>
            <span className="font-mono text-[10px] text-ink-faint">
              Hal {formatInt(Math.min(page, totalPages))} / {formatInt(totalPages)}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={!pagination?.hasNext || loading}
              aria-label="Halaman berikutnya"
              className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-line bg-surface-2 text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CaretRight size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-[10px] leading-relaxed text-ink-faint">
        <span>
          {mock
            ? "Mode demo · data contoh, bukan dari instance 9Router."
            : "Detail request dibaca langsung dari instance 9Router Anda (percakapan diredaksi oleh 9Router)."}
        </span>
        <span className="font-mono uppercase tracking-[0.08em]">Observability</span>
      </footer>

      {selected ? (
        <RequestDrawer
          detail={selected}
          connectionName={
            selected.connectionId ? connectionNames.get(selected.connectionId) : undefined
          }
          onClose={() => setSelected(null)}
        />
      ) : null}
    </main>
  );
}
