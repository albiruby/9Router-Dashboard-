"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, handleUnauthorized } from "@/lib/client";
import type { LiveStatsPayload, Period, Stats } from "@/lib/types";

export type StreamStatus = "connecting" | "live" | "reconnecting" | "paused";

export function useLiveStats(period: Period, paused: boolean) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadedPeriod, setLoadedPeriod] = useState<Period | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("connecting");

  const periodRef = useRef(period);
  const pausedRef = useRef(paused);

  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const load = useCallback(async (target: Period) => {
    try {
      const response = await fetch(`/api/live/stats?period=${target}`, {
        cache: "no-store",
      });
      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }
      const data = (await response.json().catch(() => null)) as
        | Stats
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error((data as { error?: string } | null)?.error || "Gagal memuat statistik.");
      }
      const full = data as Stats;
      setStats(full);
      setError(null);
      setLoadedPeriod(target);
    } catch (cause) {
      setError(errorMessage(cause, "Gagal memuat statistik."));
      setLoadedPeriod(target);
    }
  }, []);

  useEffect(() => {
    // Runs an async fetch; all state updates wait for the response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(period);
  }, [period, load]);

  useEffect(() => {
    if (paused) return;

    let closed = false;
    let source: EventSource | null = null;

    const connect = () => {
      if (closed) return;
      source = new EventSource("/api/live/stream");

      source.onopen = () => {
        if (!closed) setStreamStatus("live");
      };

      source.onmessage = (event) => {
        if (closed) return;
        try {
          const payload = JSON.parse(event.data) as Partial<Stats> & LiveStatsPayload;
          setStats((previous) => {
            const base = previous ?? (payload as Stats);
            return {
              ...base,
              // last10Minutes is computed from a fixed 10-minute window upstream,
              // so it stays valid regardless of the selected period.
              last10Minutes: payload.last10Minutes ?? base.last10Minutes ?? [],
              activeRequests: payload.activeRequests ?? base.activeRequests ?? [],
              recentRequests: payload.recentRequests ?? base.recentRequests ?? [],
              errorProvider: payload.errorProvider ?? base.errorProvider ?? "",
              pending: payload.pending ?? base.pending ?? { byModel: {}, byAccount: {} },
            };
          });
          setStreamStatus("live");
        } catch {
          // Ignore a malformed frame and keep the stream alive.
        }
      };

      source.onerror = () => {
        if (!closed) setStreamStatus("reconnecting");
      };
    };

    connect();

    const watchdog = setInterval(() => {
      if (closed || pausedRef.current) return;
      if (!source || source.readyState === EventSource.CLOSED) {
        source?.close();
        connect();
      }
    }, 30000);

    const aggregatePoll = setInterval(() => {
      if (closed || pausedRef.current) return;
      void load(periodRef.current);
    }, 6000);

    return () => {
      closed = true;
      clearInterval(watchdog);
      clearInterval(aggregatePoll);
      source?.close();
    };
  }, [paused, load]);

  const refresh = useCallback(() => {
    void load(periodRef.current);
  }, [load]);

  return {
    stats,
    loading: loadedPeriod !== period,
    error,
    status: paused ? ("paused" as const) : streamStatus,
    refresh,
    retry: refresh,
  };
}
