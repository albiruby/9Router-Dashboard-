"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, handleUnauthorized } from "@/lib/client";
import type { AvailabilityResponse, ChartPoint, Period, Stats } from "@/lib/types";

const REFRESH_INTERVAL_MS = 20000;

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null;
  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error || fallback);
  }
  return payload as T;
}

export function useAnalytics(period: Period) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chart, setChart] = useState<ChartPoint[] | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [statsResponse, chartResponse, availabilityResponse] = await Promise.all([
        fetch(`/api/live/stats?period=${encodeURIComponent(period)}`, { cache: "no-store" }),
        fetch(`/api/live/chart?period=${encodeURIComponent(period)}`, { cache: "no-store" }),
        fetch("/api/live/availability", { cache: "no-store" }),
      ]);

      if (
        statsResponse.status === 401 ||
        chartResponse.status === 401 ||
        availabilityResponse.status === 401
      ) {
        await handleUnauthorized();
        return;
      }

      const [statsData, chartData, availabilityData] = await Promise.all([
        readJson<Stats>(statsResponse, "Gagal memuat statistik."),
        readJson<ChartPoint[]>(chartResponse, "Gagal memuat grafik penggunaan."),
        readJson<AvailabilityResponse>(availabilityResponse, "Gagal memuat ketersediaan model."),
      ]);

      setStats(statsData);
      setChart(Array.isArray(chartData) ? chartData : []);
      setAvailability(availabilityData);
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Gagal memuat data analitik."));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    // Runs an async fetch; all state updates wait for the response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  return { stats, chart, availability, loading, error, retry: load };
}
