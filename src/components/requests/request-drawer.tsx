"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import {
  formatCompact,
  formatDateTime,
  formatDuration,
  formatInt,
  timeAgo,
} from "@/lib/format";
import { providerMeta } from "@/lib/providers";
import { isRequestError } from "@/lib/request-query";
import type { RequestDetail } from "@/lib/types";

interface RequestDrawerProps {
  detail: RequestDetail;
  connectionName?: string;
  onClose: () => void;
}

function textValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.09em] text-ink-faint">{label}</p>
      <p className="mt-1 truncate font-mono text-sm text-ink" title={title}>
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 bg-surface px-3 py-2">
      <dt className="shrink-0 text-[11px] text-ink-faint">{label}</dt>
      <dd className="min-w-0 text-right text-[11px] text-ink-muted">{children}</dd>
    </div>
  );
}

export function RequestDrawer({ detail, connectionName, onClose }: RequestDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<Element | null>(null);

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

  const failed = isRequestError(detail.status);
  const known = Boolean(detail.status);
  const provider = providerMeta(detail.provider || "", connectionName);
  const prompt = detail.tokens?.prompt_tokens ?? 0;
  const completion = detail.tokens?.completion_tokens ?? 0;
  const cached = detail.tokens?.cached_tokens ?? 0;
  const totalTokens = detail.tokens?.total_tokens ?? prompt + completion;

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
        aria-labelledby="request-drawer-title"
        className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[16px] border border-line bg-surface shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[500px] md:rounded-none md:border-y-0 md:border-r-0"
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <span
            className={cn(
              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
              failed ? "bg-red" : known ? "bg-green" : "bg-ink-faint"
            )}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h2 id="request-drawer-title" className="truncate font-mono text-sm font-semibold">
              {detail.model || "Detail request"}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.08em]",
                  failed ? "text-red" : known ? "text-green" : "text-ink-faint"
                )}
              >
                {failed ? "Gagal" : known ? "Sukses" : "N/A"}
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatDateTime(detail.timestamp)}</span>
              <span aria-hidden="true">·</span>
              <span>{timeAgo(detail.timestamp)}</span>
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup detail request"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[9px] border border-line bg-surface-2 text-ink-muted transition-colors hover:border-line-strong hover:bg-white/5 hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line">
            <Metric label="TTFT" value={formatDuration(detail.latency?.ttft)} />
            <Metric label="Total durasi" value={formatDuration(detail.latency?.total)} />
            <Metric label="Token masuk" value={formatCompact(prompt)} title={formatInt(prompt)} />
            <Metric
              label="Token keluar"
              value={formatCompact(completion)}
              title={formatInt(completion)}
            />
            <Metric label="Token cached" value={formatCompact(cached)} title={formatInt(cached)} />
            <Metric
              label="Total token"
              value={formatCompact(totalTokens)}
              title={formatInt(totalTokens)}
            />
          </div>

          <h3 className="mt-5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
            Metadata
          </h3>
          <dl className="mt-2 divide-y divide-line overflow-hidden rounded-[10px] border border-line">
            <DetailRow label="Provider">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: provider.color }}
                  aria-hidden="true"
                />
                {provider.name}
              </span>
            </DetailRow>
            <DetailRow label="Model">
              <span className="font-mono">{detail.model || "—"}</span>
            </DetailRow>
            <DetailRow label="Akun">{connectionName || "—"}</DetailRow>
            <DetailRow label="ID koneksi">
              <span className="font-mono text-[11px]">{detail.connectionId || "—"}</span>
            </DetailRow>
            <DetailRow label="Endpoint">
              <span className="font-mono text-[11px]">{textValue(detail.endpoint)}</span>
            </DetailRow>
            <DetailRow label="ID request">
              <span className="font-mono text-[11px]">{detail.id || "—"}</span>
            </DetailRow>
          </dl>

          <h3 className="mt-5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
            Payload mentah
          </h3>
          <details className="mt-2 overflow-hidden rounded-[10px] border border-line bg-surface-2">
            <summary className="cursor-pointer select-none px-3 py-2 text-[11px] text-ink-muted transition-colors hover:text-ink">
              Tampilkan JSON — isi percakapan diredaksi oleh 9Router
            </summary>
            <pre className="scrollbar-thin max-h-[320px] overflow-auto border-t border-line px-3 py-2.5 font-mono text-[10px] leading-relaxed text-ink-muted">
              {JSON.stringify(detail, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
