"use client";

import { useEffect, useRef } from "react";
import {
  BellRinging,
  BellSlash,
  Flask,
  MagnifyingGlass,
  Pause,
  Play,
  SignOut,
  X,
} from "@phosphor-icons/react";
import { AppNav } from "@/components/app-nav";
import { Brand } from "@/components/brand";
import { cn } from "@/lib/cn";
import type { StreamStatus } from "@/hooks/use-live-stats";
import type { Period } from "@/lib/types";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hari ini" },
  { value: "24h", label: "24 jam" },
  { value: "7d", label: "7 hari" },
  { value: "30d", label: "30 hari" },
  { value: "60d", label: "60 hari" },
  { value: "all", label: "Semua" },
];

interface HeaderProps {
  period?: Period;
  onPeriodChange?: (period: Period) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  paused?: boolean;
  onTogglePaused?: () => void;
  status?: StreamStatus;
  mock: boolean;
  notifications?: {
    supported: boolean;
    enabled: boolean;
    toggle: () => void;
  };
  meta?: string;
  onLogout: () => void;
}

function statusInfo(status: StreamStatus, paused: boolean) {
  if (paused) {
    return { label: "Dijeda", dot: "bg-ink-faint", text: "text-ink-muted" };
  }
  if (status === "live") {
    return { label: "Live", dot: "bg-green animate-pulse-soft", text: "text-green" };
  }
  if (status === "connecting") {
    return { label: "Menghubungkan", dot: "bg-amber animate-pulse-soft", text: "text-amber" };
  }
  return { label: "Menyambung ulang", dot: "bg-amber animate-pulse-soft", text: "text-amber" };
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function Header({
  period,
  onPeriodChange,
  query,
  onQueryChange,
  paused,
  onTogglePaused,
  status,
  mock,
  notifications,
  meta,
  onLogout,
}: HeaderProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const statusMeta = status ? statusInfo(status, Boolean(paused)) : null;
  const showSearch = typeof query === "string" && typeof onQueryChange === "function";
  const showControls = Boolean(period && onPeriodChange) || showSearch || Boolean(meta);

  useEffect(() => {
    if (!showSearch) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || isTypingTarget(event.target)) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSearch]);

  return (
    <header className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 md:px-5">
        <Brand />

        <AppNav />

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {mock ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-[6px] border border-amber/25 bg-amber/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-amber"
              title="Data contoh, bukan dari instance 9Router"
            >
              <Flask size={12} aria-hidden="true" />
              Mode demo
            </span>
          ) : null}

          {statusMeta ? (
            <span
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-line bg-surface-2 px-2.5"
              role="status"
              aria-live="polite"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} aria-hidden="true" />
              <span
                className={cn("font-mono text-[10px] uppercase tracking-[0.08em]", statusMeta.text)}
              >
                {statusMeta.label}
              </span>
            </span>
          ) : null}

          {onTogglePaused && paused !== undefined ? (
            <button
              type="button"
              onClick={onTogglePaused}
              aria-pressed={paused}
              className="flex h-11 items-center gap-2 rounded-[9px] border border-line bg-surface-2 px-3 text-xs font-medium text-ink transition-colors hover:border-line-strong hover:bg-white/5"
            >
              {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
              {paused ? "Lanjutkan" : "Jeda"}
            </button>
          ) : null}

          {notifications?.supported ? (
            <button
              type="button"
              onClick={notifications.toggle}
              aria-pressed={notifications.enabled}
              title={
                notifications.enabled
                  ? "Matikan notifikasi desktop"
                  : "Notifikasi desktop saat provider error"
              }
              aria-label={
                notifications.enabled
                  ? "Matikan notifikasi desktop"
                  : "Aktifkan notifikasi desktop saat provider error"
              }
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-[9px] border bg-surface-2 transition-colors hover:border-line-strong hover:bg-white/5",
                notifications.enabled
                  ? "border-amber/40 text-amber"
                  : "border-line text-ink-muted hover:text-ink"
              )}
            >
              {notifications.enabled ? (
                <BellRinging size={16} aria-hidden="true" />
              ) : (
                <BellSlash size={16} aria-hidden="true" />
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onLogout}
            title="Keluar"
            aria-label="Keluar dari dashboard"
            className="flex h-11 w-11 items-center justify-center rounded-[9px] border border-line bg-surface-2 text-ink-muted transition-colors hover:border-line-strong hover:bg-white/5 hover:text-ink"
          >
            <SignOut size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {showControls ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 md:px-5">
          {period && onPeriodChange ? (
            <div
              className="scrollbar-thin flex items-center gap-1 overflow-x-auto"
              role="group"
              aria-label="Periode statistik"
            >
              {PERIODS.map((option) => {
                const active = period === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onPeriodChange(option.value)}
                    aria-pressed={active}
                    className={cn(
                      "h-11 shrink-0 rounded-[7px] px-3 text-xs font-medium transition-colors",
                      active
                        ? "bg-amber/15 text-amber"
                        : "text-ink-muted hover:bg-white/5 hover:text-ink"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {query !== undefined && onQueryChange ? (
            <div className="relative ml-auto w-full sm:w-[240px]">
              <label htmlFor="dashboard-search" className="sr-only">
                Cari model atau provider
              </label>
              <MagnifyingGlass
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                id="dashboard-search"
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Cari model atau provider"
                className="h-11 w-full rounded-[9px] border border-line bg-surface-2 pl-9 pr-11 text-xs text-ink placeholder:text-ink-faint focus:border-amber/60 [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => onQueryChange("")}
                  aria-label="Bersihkan pencarian"
                  className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-[9px] text-ink-muted transition-colors hover:text-ink"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-[4px] border border-line px-1.5 py-0.5 font-mono text-[9px] text-ink-faint sm:block">
                  /
                </kbd>
              )}
            </div>
          ) : null}

          {meta && !(query !== undefined && onQueryChange) ? (
            <p className="ml-auto font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">
              {meta}
            </p>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
