"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { formatCompact, formatCost, formatInt } from "@/lib/format";
import { Panel } from "@/components/analytics/panel";
import { Skeleton } from "@/components/skeleton";
import type { ChartPoint } from "@/lib/types";

type Metric = "requests" | "tokens" | "cost";

const METRICS: { value: Metric; label: string; color: string }[] = [
  { value: "requests", label: "Request", color: "#f6b73c" },
  { value: "tokens", label: "Token", color: "#5cc8ff" },
  { value: "cost", label: "Biaya", color: "#63e6a5" },
];

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 200;
const PLOT_HEIGHT = 188;
const GRID_RATIOS = [0.25, 0.5, 0.75];

function formatValue(metric: Metric, value: number): string {
  if (metric === "cost") return formatCost(value);
  if (metric === "tokens") return formatCompact(value);
  return formatInt(value);
}

interface TrendPanelProps {
  points: ChartPoint[] | null;
  loading: boolean;
}

export function TrendPanel({ points, loading }: TrendPanelProps) {
  const [metric, setMetric] = useState<Metric>("requests");
  const [hover, setHover] = useState<number | null>(null);

  const data = useMemo(() => points ?? [], [points]);
  const activeMetric = METRICS.find((item) => item.value === metric) ?? METRICS[0];

  const values = useMemo(() => data.map((point) => point[metric]), [data, metric]);
  const total = useMemo(() => values.reduce((sum, value) => sum + value, 0), [values]);
  const maxValue = useMemo(() => Math.max(0, ...values), [values]);
  const peakIndex = maxValue > 0 ? values.indexOf(maxValue) : -1;
  const bucketUnit = data.length === 24 ? "jam" : "hari";
  const hasData = data.length > 0;

  return (
    <Panel
      title="Tren penggunaan"
      hint={hasData ? `${data.length} titik data · per ${bucketUnit}` : "Mengikuti periode terpilih"}
      action={
        <div className="flex items-center gap-1" role="group" aria-label="Metrik grafik">
          {METRICS.map((item) => {
            const active = item.value === metric;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setMetric(item.value)}
                aria-pressed={active}
                className={cn(
                  "h-9 shrink-0 rounded-[7px] px-2.5 text-[11px] font-medium transition-colors",
                  active ? "bg-white/[0.07] text-ink" : "text-ink-muted hover:bg-white/5 hover:text-ink"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      }
    >
      {loading && !hasData ? (
        <Skeleton className="h-[248px] w-full" />
      ) : !hasData ? (
        <div className="flex h-[248px] items-center justify-center rounded-[10px] border border-dashed border-line">
          <p className="text-xs text-ink-muted">Belum ada data pada periode ini.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <p className="flex items-baseline gap-2">
              <span
                className="font-mono text-3xl font-medium leading-none"
                style={{ color: activeMetric.color }}
              >
                {formatValue(metric, total)}
              </span>
              <span className="text-[11px] text-ink-muted">
                total {activeMetric.label.toLowerCase()}
              </span>
            </p>
            {peakIndex >= 0 ? (
              <p className="text-[11px] text-ink-muted">
                Puncak{" "}
                <span className="font-mono text-ink">{formatValue(metric, maxValue)}</span> pada{" "}
                <span className="font-mono text-ink">{data[peakIndex]?.label}</span>
              </p>
            ) : null}
          </div>

          <div className="relative mt-3">
            {hover !== null && data[hover] ? (
              <div
                className="pointer-events-none absolute left-0 top-0 z-10 rounded-[8px] border border-line bg-surface-2/95 px-2.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur"
                role="status"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                  {data[hover].label}
                </p>
                <p className="mt-0.5 font-mono text-xs text-ink">
                  {formatValue(metric, values[hover])}
                </p>
                <p className="mt-0.5 text-[10px] text-ink-muted">
                  {formatInt(data[hover].requests)} req · {formatCompact(data[hover].tokens)} token ·{" "}
                  {formatCost(data[hover].cost)}
                </p>
              </div>
            ) : null}

            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              preserveAspectRatio="none"
              className="block h-[200px] w-full"
              role="img"
              aria-label={`Grafik ${activeMetric.label.toLowerCase()} per ${bucketUnit} selama periode terpilih`}
            >
              {GRID_RATIOS.map((ratio) => (
                <line
                  key={ratio}
                  x1={0}
                  x2={CHART_WIDTH}
                  y1={CHART_HEIGHT - ratio * PLOT_HEIGHT}
                  y2={CHART_HEIGHT - ratio * PLOT_HEIGHT}
                  stroke="#1c212a"
                  strokeDasharray="3 6"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <line
                x1={0}
                x2={CHART_WIDTH}
                y1={CHART_HEIGHT - 1}
                y2={CHART_HEIGHT - 1}
                stroke="#2a313d"
                vectorEffect="non-scaling-stroke"
              />

              {data.map((point, index) => {
                const value = values[index];
                const slotWidth = CHART_WIDTH / data.length;
                const height =
                  maxValue > 0 ? Math.max(value > 0 ? 2 : 0, (value / maxValue) * PLOT_HEIGHT) : 0;
                const dimmed = hover !== null && hover !== index;
                return (
                  <g key={`${point.label}-${index}`}>
                    <rect
                      x={index * slotWidth + slotWidth * 0.16}
                      y={CHART_HEIGHT - height}
                      width={slotWidth * 0.68}
                      height={height}
                      rx={2}
                      fill={activeMetric.color}
                      opacity={dimmed ? 0.35 : 0.92}
                    />
                    <rect
                      x={index * slotWidth}
                      y={0}
                      width={slotWidth}
                      height={CHART_HEIGHT}
                      fill="transparent"
                      onMouseEnter={() => setHover(index)}
                      onMouseLeave={() => setHover((current) => (current === index ? null : current))}
                    />
                  </g>
                );
              })}
            </svg>

            <div className="relative mt-1 h-4">
              {data.map((point, index) => {
                const step = Math.max(1, Math.ceil(data.length / 6));
                if (index % step !== 0 && index !== data.length - 1) return null;
                return (
                  <span
                    key={`${point.label}-axis-${index}`}
                    className="absolute top-0 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.06em] text-ink-faint"
                    style={{ left: `${((index + 0.5) / data.length) * 100}%` }}
                  >
                    {point.label}
                  </span>
                );
              })}
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}
