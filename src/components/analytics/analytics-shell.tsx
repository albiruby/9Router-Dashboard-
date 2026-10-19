"use client";

import { useMemo, useState } from "react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { AccountsPanel } from "@/components/analytics/accounts-panel";
import { AvailabilityPanel } from "@/components/analytics/availability-panel";
import { EndpointsPanel } from "@/components/analytics/endpoints-panel";
import { ModelLeaderboard } from "@/components/analytics/model-leaderboard";
import { ProviderMixPanel } from "@/components/analytics/provider-mix-panel";
import { TrendPanel } from "@/components/analytics/trend-panel";
import { Header } from "@/components/dashboard/header";
import { StatStrip } from "@/components/dashboard/stat-strip";
import { useAnalytics } from "@/hooks/use-analytics";
import { useProviders } from "@/hooks/use-providers";
import { useSession } from "@/hooks/use-session";
import { providerMeta, type ProviderStyleLookup } from "@/lib/providers";
import type { Period } from "@/lib/types";

export function AnalyticsShell() {
  const [period, setPeriod] = useState<Period>("today");
  const { stats, chart, availability, loading, error, retry } = useAnalytics(period);
  const { data: providerData } = useProviders();
  const { mock, logout } = useSession();

  const providerStyle = useMemo<ProviderStyleLookup>(() => {
    const map = new Map<string, { name: string; color: string }>();
    const nodeNames = new Map<string, string>();
    for (const node of providerData?.nodes ?? []) {
      if (node.name) nodeNames.set(node.id, node.name);
    }
    for (const connection of providerData?.connections ?? []) {
      const id = connection.provider;
      const meta = providerMeta(id, nodeNames.get(id) || connection.name);
      map.set(id.toLowerCase(), { name: meta.name, color: meta.color });
      map.set(meta.name.toLowerCase(), { name: meta.name, color: meta.color });
    }
    return (provider: string) => {
      const found = map.get((provider || "").toLowerCase());
      if (found) return found;
      const meta = providerMeta(provider);
      return { name: meta.name, color: meta.color };
    };
  }, [providerData]);

  return (
    <main className="mx-auto flex w-full max-w-[1560px] flex-col gap-4 px-3 py-4 sm:px-5 md:px-6 md:py-5">
      <h1 className="sr-only">Analitik penggunaan 9Router</h1>

      <Header
        period={period}
        onPeriodChange={setPeriod}
        mock={mock}
        meta="Diperbarui tiap 20 detik"
        onLogout={() => void logout()}
      />

      <StatStrip stats={stats} loading={loading} error={error} onRetry={retry} />

      {error && stats ? (
        <div className="panel flex flex-wrap items-center justify-between gap-3 border-amber/20 px-4 py-3">
          <p className="flex items-center gap-2 text-xs leading-relaxed text-ink-muted">
            <WarningCircle size={16} className="shrink-0 text-amber" aria-hidden="true" />
            Pembaruan analytics sempat gagal. Data terakhir tetap ditampilkan.
          </p>
          <button
            type="button"
            onClick={retry}
            className="flex h-9 items-center gap-1.5 rounded-[7px] border border-line bg-surface-2 px-2.5 text-[11px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-white/5"
          >
            <ArrowClockwise size={13} aria-hidden="true" />
            Coba lagi
          </button>
        </div>
      ) : null}

      <TrendPanel points={chart} loading={loading} />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,390px)_minmax(0,1fr)]">
        <ProviderMixPanel stats={stats} loading={loading} />
        <ModelLeaderboard stats={stats} loading={loading} providerStyle={providerStyle} />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <AccountsPanel stats={stats} loading={loading} providerStyle={providerStyle} />
        <EndpointsPanel stats={stats} loading={loading} />
        <AvailabilityPanel availability={availability} loading={loading} />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-[10px] leading-relaxed text-ink-faint">
        <span>
          {mock
            ? "Mode demo · data contoh, bukan dari instance 9Router."
            : "Data dibaca langsung dari instance 9Router Anda."}
        </span>
        <span className="font-mono uppercase tracking-[0.08em]">Diperbarui otomatis</span>
      </footer>
    </main>
  );
}
