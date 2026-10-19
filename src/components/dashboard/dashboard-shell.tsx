"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { Header } from "@/components/dashboard/header";
import { PulsePanel } from "@/components/dashboard/pulse-panel";
import { StatStrip } from "@/components/dashboard/stat-strip";
import { Topology } from "@/components/dashboard/topology";
import { LiveFeed } from "@/components/dashboard/live-feed";
import { ProviderGrid } from "@/components/dashboard/provider-grid";
import { ProviderDrawer } from "@/components/dashboard/provider-drawer";
import { useDesktopNotifications } from "@/hooks/use-desktop-notifications";
import { useLiveStats } from "@/hooks/use-live-stats";
import { useProviders } from "@/hooks/use-providers";
import { useSession } from "@/hooks/use-session";
import { providerIcon, providerMeta } from "@/lib/providers";
import type {
  Period,
  ProviderConnection,
  Stats,
  UiProvider,
  UsageBucket,
} from "@/lib/types";

function bucketLookup(stats: Stats | null): Map<string, UsageBucket> {
  const map = new Map<string, UsageBucket>();
  if (!stats) return map;
  for (const [key, bucket] of Object.entries(stats.byProvider)) {
    map.set(key.toLowerCase(), bucket);
  }
  return map;
}

export function DashboardShell() {
  const [period, setPeriod] = useState<Period>("today");
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { stats, loading, error, status, retry } = useLiveStats(period, paused);
  const notifications = useDesktopNotifications(stats?.errorProvider ?? "");
  const { mock, logout } = useSession();
  const {
    data: providerData,
    loading: providersLoading,
    error: providersError,
    reload: reloadProviders,
  } = useProviders();

  const togglePaused = useCallback(() => setPaused((value) => !value), []);
  const openProvider = useCallback((id: string) => setSelectedId(id), []);
  const closeProvider = useCallback(() => setSelectedId(null), []);

  const uiProviders = useMemo(() => {
    if (!providerData) return [];

    const nodeNames = new Map<string, string>();
    for (const node of providerData.nodes) {
      if (node.name) nodeNames.set(node.id, node.name);
    }

    const connectionsByProvider = new Map<string, ProviderConnection[]>();
    for (const connection of providerData.connections) {
      const key = connection.provider.toLowerCase();
      const list = connectionsByProvider.get(key) || [];
      list.push(connection);
      connectionsByProvider.set(key, list);
    }

    const providerIds = new Map<string, string>();
    for (const [key, connections] of connectionsByProvider) {
      if (connections[0]?.provider) providerIds.set(key, connections[0].provider);
    }
    if (stats) {
      for (const key of Object.keys(stats.byProvider)) {
        const normalized = key.toLowerCase();
        if (!providerIds.has(normalized)) providerIds.set(normalized, key);
      }
      for (const request of stats.recentRequests) {
        const normalized = request.provider.toLowerCase();
        if (!providerIds.has(normalized)) providerIds.set(normalized, request.provider);
      }
    }

    const buckets = bucketLookup(stats);
    const activeByKey = new Map<string, number>();
    for (const request of stats?.activeRequests ?? []) {
      const key = request.provider.toLowerCase();
      activeByKey.set(key, (activeByKey.get(key) || 0) + (request.count || 1));
    }

    const lastByKey = new Map<string, string>();
    for (const request of stats?.recentRequests ?? []) {
      const key = request.provider.toLowerCase();
      if (!lastByKey.has(key)) lastByKey.set(key, request.timestamp);
    }

    const errorKey = (stats?.errorProvider || "").toLowerCase();

    const list: UiProvider[] = [];
    for (const [normalized, id] of providerIds) {
      const connections = connectionsByProvider.get(normalized) || [];
      const meta = providerMeta(id, nodeNames.get(id) || connections[0]?.name);
      const bucket = buckets.get(normalized);
      const keys = [normalized, meta.name.toLowerCase()];
      const lastUsed = keys.map((key) => lastByKey.get(key)).find(Boolean) || null;
      const error = Boolean(errorKey) && keys.includes(errorKey);
      const activeCount = keys.reduce((sum, key) => sum + (activeByKey.get(key) || 0), 0);

      list.push({
        id,
        name: meta.name,
        color: meta.color,
        icon: providerIcon(id),
        connections,
        requests: bucket?.requests ?? 0,
        promptTokens: bucket?.promptTokens ?? 0,
        completionTokens: bucket?.completionTokens ?? 0,
        cachedTokens: bucket?.cachedTokens ?? 0,
        cost: bucket?.cost ?? 0,
        lastUsed,
        activeCount,
        error,
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [providerData, stats]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredProviders = useMemo(() => {
    if (!normalizedQuery) return uiProviders;
    return uiProviders.filter((provider) => {
      if (
        provider.name.toLowerCase().includes(normalizedQuery) ||
        provider.id.toLowerCase().includes(normalizedQuery)
      ) {
        return true;
      }
      return provider.connections.some((connection) => {
        const haystack = `${connection.name || ""} ${connection.email || ""}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    });
  }, [uiProviders, normalizedQuery]);

  const matchIds = useMemo(
    () => (normalizedQuery ? new Set(filteredProviders.map((provider) => provider.id)) : null),
    [filteredProviders, normalizedQuery]
  );

  const providerNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const provider of uiProviders) map.set(provider.id.toLowerCase(), provider.name);
    return map;
  }, [uiProviders]);

  const filteredRecent = useMemo(() => {
    const recent = stats?.recentRequests ?? [];
    if (!normalizedQuery) return recent;
    return recent.filter((request) => {
      const providerName = providerNames.get(request.provider.toLowerCase()) || "";
      return (
        request.model.toLowerCase().includes(normalizedQuery) ||
        request.provider.toLowerCase().includes(normalizedQuery) ||
        providerName.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [stats?.recentRequests, normalizedQuery, providerNames]);

  const selectedProvider = useMemo(
    () => (selectedId ? uiProviders.find((provider) => provider.id === selectedId) || null : null),
    [selectedId, uiProviders]
  );

  return (
    <main className="mx-auto flex w-full max-w-[1560px] flex-col gap-4 px-3 py-4 sm:px-5 md:px-6 md:py-5">
      <h1 className="sr-only">9Router Pulse, dashboard lalu lintas AI</h1>

      <Header
        period={period}
        onPeriodChange={setPeriod}
        query={query}
        onQueryChange={setQuery}
        paused={paused}
        onTogglePaused={togglePaused}
        status={status}
        mock={mock}
        notifications={notifications}
        onLogout={() => void logout()}
      />

      <PulsePanel stats={stats} loading={loading} />

      <StatStrip stats={stats} loading={loading} error={error} onRetry={retry} />

      {error && stats ? (
        <div className="panel flex flex-wrap items-center justify-between gap-3 border-amber/20 px-4 py-3">
          <p className="flex items-center gap-2 text-xs leading-relaxed text-ink-muted">
            <WarningCircle size={16} className="shrink-0 text-amber" aria-hidden="true" />
            Pembaruan live sempat gagal. Angka terakhir tetap ditampilkan.
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

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Topology
          providers={uiProviders}
          activeRequests={stats?.activeRequests ?? []}
          recentRequests={stats?.recentRequests ?? []}
          errorProvider={stats?.errorProvider ?? ""}
          matchIds={matchIds}
          providersLoading={providersLoading}
          providersError={providersError}
          onRetryProviders={reloadProviders}
          onSelectProvider={openProvider}
        />

        <LiveFeed
          recentRequests={filteredRecent}
          providers={uiProviders}
          loading={loading}
          error={error}
          onRetry={retry}
          paused={paused}
          hasQuery={Boolean(normalizedQuery)}
        />
      </div>

      <ProviderGrid
        providers={filteredProviders}
        loading={providersLoading}
        error={providersError}
        onRetry={reloadProviders}
        onSelect={openProvider}
        hasQuery={Boolean(normalizedQuery)}
      />

      <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-[10px] leading-relaxed text-ink-faint">
        <span>
          {mock
            ? "Mode demo · data contoh, bukan dari instance 9Router."
            : "Data dibaca langsung dari instance 9Router Anda."}
        </span>
        <span className="font-mono uppercase tracking-[0.08em]">
          {paused ? "Siaran dijeda" : "Diperbarui otomatis"}
        </span>
      </footer>

      {selectedProvider ? (
        <ProviderDrawer provider={selectedProvider} stats={stats} onClose={closeProvider} />
      ) : null}
    </main>
  );
}
