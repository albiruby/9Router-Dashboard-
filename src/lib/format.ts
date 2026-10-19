const intFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const compactFormatter = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatInt(value: number | null | undefined): string {
  return intFormatter.format(Math.max(0, Math.round(value ?? 0)));
}

export function formatCompact(value: number | null | undefined): string {
  return compactFormatter.format(Math.max(0, value ?? 0));
}

export function formatCost(value: number | null | undefined): string {
  const amount = Math.max(0, value ?? 0);
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value: number | null | undefined): string {
  const safe = Math.min(100, Math.max(0, value ?? 0));
  return `${Math.round(safe)}%`;
}

export function formatDuration(value: number | null | undefined): string {
  const ms = Math.max(0, value ?? 0);
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} dtk`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes} mnt ${seconds} dtk`;
}

export function timeAgo(timestamp: string | number | null | undefined, now = Date.now()): string {
  if (!timestamp) return "";
  const then = typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 5) return "baru saja";
  if (seconds < 60) return `${seconds} dtk lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hr lalu`;
}

export function formatClock(timestamp: string | number | null | undefined): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDateTime(timestamp: string | number | null | undefined): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(label: string): string {
  const parts = label
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
