"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  ViewportPortal,
  getBezierPath,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowsIn,
  ArrowsOut,
  Broadcast,
  CornersOut,
  Crosshair,
  Minus,
  Plugs,
  Plus,
  WarningCircle,
} from "@phosphor-icons/react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/cn";
import { formatCompact, initials, timeAgo } from "@/lib/format";
import { providerMeta } from "@/lib/providers";
import { Skeleton } from "@/components/skeleton";
import type { ActiveRequest, RecentRequest, UiProvider } from "@/lib/types";

const PROVIDER_WIDTH = 178;
const PROVIDER_HEIGHT = 56;
const ROUTER_SIZE = 148;

interface RouterNodeData extends Record<string, unknown> {
  activeCount: number;
}

interface ProviderNodeData extends Record<string, unknown> {
  provider: UiProvider;
  active: boolean;
  last: boolean;
  error: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
}

interface FlowEdgeData extends Record<string, unknown> {
  active: boolean;
  last: boolean;
  error: boolean;
  dimmed: boolean;
  color: string;
  activeCount: number;
  reducedMotion: boolean;
}

function ProviderNode({ data }: NodeProps) {
  const nodeData = data as unknown as ProviderNodeData;
  const { provider, active, last, error, dimmed, onSelect } = nodeData;
  const [iconFailed, setIconFailed] = useState(false);

  const borderColor = error
    ? "rgba(255,107,107,0.55)"
    : active
      ? `${provider.color}99`
      : last
        ? "rgba(246,183,60,0.5)"
        : undefined;

  const statusLabel = error
    ? "Error"
    : active
      ? "Aktif"
      : provider.lastUsed
        ? timeAgo(provider.lastUsed)
        : "Belum dipakai";

  return (
    <div
      className={cn(
        "group relative rounded-[12px] border border-line bg-surface-2 transition-[border-color,box-shadow,opacity] duration-300",
        dimmed ? "opacity-30" : "opacity-100"
      )}
      style={{
        width: PROVIDER_WIDTH,
        height: PROVIDER_HEIGHT,
        borderColor,
        boxShadow: error
          ? "0 0 26px rgba(255, 107, 107, 0.28)"
          : active
            ? `0 0 0 1px ${provider.color}2e, 0 0 24px ${provider.color}1a`
            : undefined,
      }}
    >
      {error ? (
        <>
          <span
            className="animate-shockwave pointer-events-none absolute -inset-2 rounded-[16px] border border-red/50"
            aria-hidden="true"
          />
          <span
            className="animate-shockwave pointer-events-none absolute -inset-2 rounded-[16px] border border-red/35 [animation-delay:0.55s]"
            aria-hidden="true"
          />
        </>
      ) : null}
      <button
        type="button"
        onClick={() => onSelect(provider.id)}
        className="flex h-full w-full items-center gap-2.5 rounded-[11px] px-3 text-left focus-visible:outline-offset-4"
        aria-label={`Buka detail ${provider.name}. ${active ? `${provider.activeCount} request aktif.` : "Tidak ada request aktif."}`}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/5"
          style={{ backgroundColor: `${provider.color}1a` }}
        >
          {provider.icon && !iconFailed ? (
            // Provider logos are local assets from the 9Router project (MIT).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={provider.icon}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 object-contain"
              onError={() => setIconFailed(true)}
            />
          ) : (
            <span className="font-mono text-[10px] font-semibold" style={{ color: provider.color }}>
              {initials(provider.name)}
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-tight text-ink">
            {provider.name}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[10px] leading-tight text-ink-muted">
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                error
                  ? "bg-red"
                  : active
                    ? "animate-pulse-soft"
                    : provider.lastUsed
                      ? "bg-ink-faint"
                      : "bg-line-strong"
              )}
              style={active && !error ? { backgroundColor: provider.color } : undefined}
              aria-hidden="true"
            />
            <span className="truncate">{statusLabel}</span>
          </span>
        </span>

        {active ? (
          <span
            className="shrink-0 rounded-[6px] px-1.5 py-0.5 font-mono text-[10px] font-semibold"
            style={{ backgroundColor: `${provider.color}24`, color: provider.color }}
          >
            {provider.activeCount}
          </span>
        ) : (
          <span className="shrink-0 font-mono text-[10px] text-ink-faint">
            {formatCompact(provider.requests)}
          </span>
        )}
      </button>

      <Handle type="target" id="left" position={Position.Left} isConnectable={false} />
      <Handle type="target" id="right" position={Position.Right} isConnectable={false} />
      <Handle type="target" id="top" position={Position.Top} isConnectable={false} />
      <Handle type="target" id="bottom" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}

function RouterNode({ data }: NodeProps) {
  const nodeData = data as unknown as RouterNodeData;
  const reducedMotion = usePrefersReducedMotion();
  const active = nodeData.activeCount > 0;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: ROUTER_SIZE, height: ROUTER_SIZE }}
    >
      <div
        className={cn(
          "absolute -inset-4 rounded-full border border-dashed border-amber/20",
          !reducedMotion && "animate-core-sweep"
        )}
        aria-hidden="true"
      />
      <div className="absolute inset-0 rounded-full border border-line-strong/80" aria-hidden="true" />
      <div
        className="absolute inset-[9px] rounded-full border border-line bg-surface"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(246,183,60,0.12) 0%, rgba(12,14,18,0.98) 62%)",
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-[26px] rounded-full border border-amber/15" aria-hidden="true" />
      {active ? (
        <div
          className="animate-ring-breathe absolute inset-0 rounded-full border border-amber/35"
          aria-hidden="true"
        />
      ) : null}

      <div className="relative z-10 flex flex-col items-center">
        {/* 9Router mark, sourced from the 9Router project (MIT). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nine-router.svg" alt="" width={28} height={28} className="h-7 w-7" />
        <span className="mt-2 text-[13px] font-semibold leading-none">9Router</span>
        <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
          Pusat
        </span>
      </div>

      {active ? (
        <span className="absolute -right-1 -top-1 z-20 flex h-6 min-w-6 items-center justify-center rounded-full border border-amber/40 bg-[#1b1508] px-1.5 font-mono text-[10px] font-semibold text-amber">
          {nodeData.activeCount}
        </span>
      ) : null}

      <Handle type="source" id="left" position={Position.Left} isConnectable={false} />
      <Handle type="source" id="right" position={Position.Right} isConnectable={false} />
      <Handle type="source" id="top" position={Position.Top} isConnectable={false} />
      <Handle type="source" id="bottom" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}

function FlowEdgeComponent(props: EdgeProps) {
  const data = props.data as unknown as FlowEdgeData | undefined;
  const [path] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });

  if (!data) return null;

  const stroke = data.error
    ? "#ff6b6b"
    : data.active
      ? data.color
      : data.last
        ? "#f6b73c"
        : "#394152";

  const particleCount = Math.min(6, 2 + data.activeCount);

  return (
    <g style={{ opacity: data.dimmed ? 0.12 : 1 }}>
      {data.active && !data.error ? (
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={8}
          strokeLinecap="round"
          opacity={0.16}
        />
      ) : null}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={data.active ? 2 : data.last ? 1.4 : 1}
        strokeLinecap="round"
        strokeDasharray={data.active ? undefined : data.error ? "4 6" : "2 8"}
        opacity={data.active ? 0.95 : data.error ? 0.7 : data.last ? 0.65 : 0.5}
      />
      {data.active && !data.error && !data.reducedMotion
        ? Array.from({ length: particleCount }, (_, index) => (
            <g key={index}>
              <animateMotion
                dur={`${1.5 + index * 0.18}s`}
                begin={`${index * 0.22}s`}
                repeatCount="indefinite"
                path={path}
              />
              <circle r={4.4} fill={stroke} opacity={0.22} />
              <circle r={2.1} fill="#ffffff" opacity={0.92} />
            </g>
          ))
        : null}
    </g>
  );
}

const nodeTypes: NodeTypes = {
  provider: ProviderNode,
  router: RouterNode,
};

const edgeTypes: EdgeTypes = {
  flow: FlowEdgeComponent,
};

interface Orbit {
  rx: number;
  ry: number;
}

function buildLayout(
  providers: UiProvider[],
  activeRequests: ActiveRequest[],
  recentRequests: RecentRequest[],
  errorProvider: string,
  matchIds: Set<string> | null,
  reducedMotion: boolean,
  onSelect: (id: string) => void
) {
  const activeCounts = new Map<string, number>();
  for (const request of activeRequests) {
    const key = request.provider.toLowerCase();
    activeCounts.set(key, (activeCounts.get(key) || 0) + (request.count || 1));
  }
  const lastProvider = recentRequests[0]?.provider?.toLowerCase() || "";
  const errorKey = errorProvider.toLowerCase();
  const latestTime = recentRequests[0]?.timestamp;

  const count = providers.length;
  const innerCount = count > 8 ? Math.min(8, Math.max(4, Math.ceil(count / 2))) : count;
  const innerProviders = providers.slice(0, innerCount);
  const outerProviders = providers.slice(innerCount);

  const orbits: Orbit[] =
    outerProviders.length > 0
      ? [
          { rx: 320, ry: 190 },
          { rx: 540, ry: 330 },
        ]
      : [{ rx: Math.max(310, (count * (PROVIDER_WIDTH + 28)) / (2 * Math.PI)), ry: 0 }];

  if (orbits[0].ry === 0) {
    orbits[0].ry = orbits[0].rx * 0.62;
  }

  const nodes: Node[] = [
    {
      id: "router",
      type: "router",
      position: { x: -ROUTER_SIZE / 2, y: -ROUTER_SIZE / 2 },
      data: {
        activeCount: Array.from(activeCounts.values()).reduce((sum, value) => sum + value, 0),
      } satisfies RouterNodeData,
      draggable: false,
      selectable: false,
      focusable: false,
    },
  ];

  const edges: Edge[] = [];

  const placeRing = (items: UiProvider[], orbit: Orbit, ringIndex: number) => {
    const offset = -Math.PI / 2 + (ringIndex === 1 ? Math.PI / Math.max(items.length, 1) : 0);
    items.forEach((provider, index) => {
      const angle = offset + (index / Math.max(items.length, 1)) * Math.PI * 2;
      const x = orbit.rx * Math.cos(angle);
      const y = orbit.ry * Math.sin(angle);
      const key = provider.id.toLowerCase();
      const activeCount = activeCounts.get(key) || 0;
      const active = activeCount > 0;
      const error = Boolean(errorKey) && errorKey === key;
      const last =
        !active &&
        !error &&
        Boolean(lastProvider) &&
        lastProvider === key &&
        Boolean(latestTime);
      const dimmed = Boolean(matchIds) && !matchIds?.has(provider.id);

      const sourceHandle =
        Math.abs(x) > Math.abs(y) ? (x > 0 ? "right" : "left") : y > 0 ? "bottom" : "top";
      const targetHandle =
        Math.abs(x) > Math.abs(y) ? (x > 0 ? "left" : "right") : y > 0 ? "top" : "bottom";

      nodes.push({
        id: provider.id,
        type: "provider",
        position: { x: x - PROVIDER_WIDTH / 2, y: y - PROVIDER_HEIGHT / 2 },
        data: {
          provider,
          active,
          last,
          error,
          dimmed,
          onSelect,
        } satisfies ProviderNodeData,
        draggable: false,
        selectable: false,
        focusable: false,
      });

      edges.push({
        id: `edge-${provider.id}`,
        source: "router",
        target: provider.id,
        sourceHandle,
        targetHandle,
        type: "flow",
        data: {
          active,
          last,
          error,
          dimmed,
          color: provider.color,
          activeCount,
          reducedMotion,
        } satisfies FlowEdgeData,
        selectable: false,
        focusable: false,
      });
    });
  };

  placeRing(innerProviders, orbits[0], 0);
  if (outerProviders.length > 0) {
    placeRing(outerProviders, orbits[1], 1);
  }

  return { nodes, edges, orbits };
}

function RadarOrbits({ orbits }: { orbits: Orbit[] }) {
  return (
    <svg
      width={1}
      height={1}
      className="pointer-events-none overflow-visible"
      aria-hidden="true"
    >
      {orbits.map((orbit, index) => (
        <ellipse
          key={index}
          cx={0}
          cy={0}
          rx={orbit.rx}
          ry={orbit.ry}
          fill="none"
          stroke={index === 0 ? "rgba(232,235,241,0.075)" : "rgba(232,235,241,0.055)"}
          strokeWidth={1}
          strokeDasharray={index === 0 ? undefined : "3 10"}
        />
      ))}
      {orbits.map((orbit, index) =>
        Array.from({ length: 12 }, (_, tick) => {
          const angle = (tick / 12) * Math.PI * 2;
          const inner = index === 0 ? 0.985 : 0.99;
          const outer = 1.015;
          return (
            <line
              key={`${index}-${tick}`}
              x1={Math.cos(angle) * orbit.rx * inner}
              y1={Math.sin(angle) * orbit.ry * inner}
              x2={Math.cos(angle) * orbit.rx * outer}
              y2={Math.sin(angle) * orbit.ry * outer}
              stroke="rgba(232,235,241,0.09)"
              strokeWidth={1}
            />
          );
        })
      )}
      <circle cx={0} cy={0} r={196} fill="none" stroke="rgba(246,183,60,0.06)" />
    </svg>
  );
}

interface StageProps {
  providers: UiProvider[];
  activeRequests: ActiveRequest[];
  recentRequests: RecentRequest[];
  errorProvider: string;
  matchIds: Set<string> | null;
  onSelect: (id: string) => void;
  stageRef: React.RefObject<HTMLDivElement | null>;
}

function Stage({
  providers,
  activeRequests,
  recentRequests,
  errorProvider,
  matchIds,
  onSelect,
  stageRef,
}: StageProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [stageRef]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fitView({ padding: 0.16, duration: reducedMotion ? 0 : 500 });
    }, 80);
    return () => clearTimeout(timer);
  }, [providers.length, fitView, reducedMotion]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let lastWidth = stage.clientWidth;
    let lastHeight = stage.clientHeight;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      if (Math.abs(rect.width - lastWidth) < 40 && Math.abs(rect.height - lastHeight) < 40) {
        return;
      }
      lastWidth = rect.width;
      lastHeight = rect.height;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void fitView({ padding: 0.16, duration: reducedMotion ? 0 : 300 });
      }, 180);
    });

    observer.observe(stage);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [fitView, reducedMotion, stageRef]);

  const layout = useMemo(
    () =>
      buildLayout(
        providers,
        activeRequests,
        recentRequests,
        errorProvider,
        matchIds,
        reducedMotion,
        onSelect
      ),
    [providers, activeRequests, recentRequests, errorProvider, matchIds, reducedMotion, onSelect]
  );

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await stageRef.current?.requestFullscreen();
      }
    } catch {
      // Fullscreen can be blocked by browser policy. The stage stays usable.
    }
  };

  return (
    <div
      ref={stageRef}
      className="topology-stage relative h-[420px] overflow-hidden bg-[#080a0d] sm:h-[480px] xl:h-[540px]"
    >
      <div className="radar-grid pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="absolute inset-0">
        <ReactFlow
          nodes={layout.nodes}
          edges={layout.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.16 }}
          minZoom={0.3}
          maxZoom={1.8}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          panOnScroll
          zoomOnScroll
          zoomOnPinch
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
          aria-label="Peta aliran request 9Router ke provider"
        >
          <ViewportPortal>
            <RadarOrbits orbits={layout.orbits} />
          </ViewportPortal>
        </ReactFlow>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(7,8,10,0.72)_100%)]" />

      {fullscreen ? (
        <div className="pointer-events-none absolute left-5 top-4 z-20">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
            Peta aliran
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {providers.length} provider · {activeRequests.length} request aktif
          </p>
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 rounded-[10px] border border-line bg-surface/90 p-1 backdrop-blur">
        <ControlButton label="Perbesar" onClick={() => void zoomIn({ duration: 220 })}>
          <Plus size={16} />
        </ControlButton>
        <ControlButton label="Perkecil" onClick={() => void zoomOut({ duration: 220 })}>
          <Minus size={16} />
        </ControlButton>
        <ControlButton
          label="Sesuaikan tampilan"
          onClick={() => void fitView({ padding: 0.16, duration: reducedMotion ? 0 : 400 })}
        >
          <Crosshair size={16} />
        </ControlButton>
        <ControlButton
          label={fullscreen ? "Keluar layar penuh" : "Layar penuh"}
          onClick={() => void toggleFullscreen()}
        >
          {fullscreen ? <ArrowsIn size={16} /> : <ArrowsOut size={16} />}
        </ControlButton>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-20 hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint sm:flex">
        <CornersOut size={13} aria-hidden="true" />
        Geser dan perbesar peta
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-white/5 hover:text-ink focus-visible:outline-offset-1"
    >
      {children}
    </button>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-ink-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-px w-5 bg-amber" aria-hidden="true" />
        Terakhir
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-px w-5 bg-[#394152]" aria-hidden="true" />
        Siaga
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-px w-5 bg-red" aria-hidden="true" />
        Error
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-green" aria-hidden="true" />
        Aktif
      </span>
    </div>
  );
}

export interface TopologyProps {
  providers: UiProvider[];
  activeRequests: ActiveRequest[];
  recentRequests: RecentRequest[];
  errorProvider: string;
  matchIds: Set<string> | null;
  providersLoading: boolean;
  providersError: string | null;
  onRetryProviders: () => void;
  onSelectProvider: (id: string) => void;
}

export function Topology({
  providers,
  activeRequests,
  recentRequests,
  errorProvider,
  matchIds,
  providersLoading,
  providersError,
  onRetryProviders,
  onSelectProvider,
}: TopologyProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);

  const providerLookup = useMemo(() => {
    const map = new Map<string, UiProvider>();
    for (const provider of providers) map.set(provider.id.toLowerCase(), provider);
    return map;
  }, [providers]);

  const activeChips = activeRequests.slice(0, 5).map((request, index) => {
    const provider = providerLookup.get(request.provider.toLowerCase());
    const meta = provider ? null : providerMeta(request.provider);
    return {
      key: `${request.provider}-${request.model}-${index}`,
      model: request.model,
      providerName: provider?.name || meta?.name || request.provider,
      color: provider?.color || meta?.color || "#8b95a4",
      count: request.count,
    };
  });

  const latest = recentRequests[0];

  return (
    <section className="panel flex min-w-0 flex-col overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Broadcast size={15} className="text-amber" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Peta aliran</h2>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {providers.length} provider terhubung. Klik node untuk detail dan kuota.
          </p>
        </div>
        <Legend />
      </div>

      <div className="relative">
        <ReactFlowProvider>
          <Stage
            providers={providers}
            activeRequests={activeRequests}
            recentRequests={recentRequests}
            errorProvider={errorProvider}
            matchIds={matchIds}
            onSelect={onSelectProvider}
            stageRef={stageRef}
          />
        </ReactFlowProvider>

        {providersLoading && providers.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#080a0d]/85">
            <div className="relative h-20 w-20">
              <Skeleton className="absolute inset-0 rounded-full" />
              <Skeleton className="absolute inset-5 rounded-full" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Memuat topologi provider</p>
              <p className="mt-1 text-xs text-ink-muted">Menyiapkan node dan koneksi.</p>
            </div>
          </div>
        ) : null}

        {!providersLoading && providersError && providers.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#080a0d]/90 p-6">
            <div className="max-w-sm text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-red/30 bg-red/10 text-red">
                <WarningCircle size={19} aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium">Topologi tidak bisa dimuat</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{providersError}</p>
              <button
                type="button"
                onClick={onRetryProviders}
                className="mt-4 h-11 rounded-[9px] border border-line bg-surface-2 px-4 text-sm font-medium transition-colors hover:border-line-strong hover:bg-white/5"
              >
                Coba lagi
              </button>
            </div>
          </div>
        ) : null}

        {!providersLoading && !providersError && providers.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#080a0d]/80 p-6">
            <div className="max-w-sm text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-2 text-ink-muted">
                <Plugs size={19} aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium">Belum ada provider terhubung</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                Hubungkan provider di dashboard 9Router, lalu muat ulang daftar ini.
              </p>
              <button
                type="button"
                onClick={onRetryProviders}
                className="mt-4 h-11 rounded-[9px] border border-line bg-surface-2 px-4 text-sm font-medium transition-colors hover:border-line-strong hover:bg-white/5"
              >
                Muat ulang
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 sm:px-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          Sedang berjalan
        </span>
        {activeChips.length > 0 ? (
          activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex max-w-full items-center gap-1.5 rounded-[6px] border border-line bg-surface-2 px-2 py-1 text-[11px]"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: chip.color }}
                aria-hidden="true"
              />
              <span className="truncate font-mono text-[10px] text-ink">{chip.model}</span>
              <span className="truncate text-ink-muted">{chip.providerName}</span>
              {chip.count > 1 ? (
                <span className="font-mono text-[10px] text-amber">x{chip.count}</span>
              ) : null}
            </span>
          ))
        ) : (
          <span className="inline-flex items-center gap-2 text-[11px] text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" aria-hidden="true" />
            Siaga, menunggu request.
          </span>
        )}

        {latest ? (
          <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-ink-faint sm:flex">
            Terakhir
            <span className="font-mono text-[10px] text-ink-muted">{latest.model}</span>
            <span aria-hidden="true">·</span>
            {timeAgo(latest.timestamp)}
          </span>
        ) : null}
      </div>
    </section>
  );
}
