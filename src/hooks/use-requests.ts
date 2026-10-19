"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, handleUnauthorized } from "@/lib/client";
import { buildRequestParams, type RequestRange } from "@/lib/request-query";
import type { RequestDetailPage } from "@/lib/types";

export interface RequestsParams {
  range: RequestRange;
  provider: string;
  model: string;
  status: string;
  page: number;
  pageSize: number;
}

export function useRequests(params: RequestsParams) {
  const { range, provider, model, status, page, pageSize } = params;
  const [data, setData] = useState<RequestDetailPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    setLoading(true);

    try {
      const search = buildRequestParams({
        range,
        provider: provider || undefined,
        model: model || undefined,
        status: status || undefined,
        page,
        pageSize,
      });
      const response = await fetch(`/api/live/requests?${search.toString()}`, {
        cache: "no-store",
      });
      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }
      const payload = (await response.json().catch(() => null)) as
        | RequestDetailPage
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(
          (payload as { error?: string } | null)?.error || "Gagal memuat detail request."
        );
      }
      if (requestId !== latestRequest.current) return;
      setData(payload as RequestDetailPage);
      setError(null);
    } catch (cause) {
      if (requestId !== latestRequest.current) return;
      setError(errorMessage(cause, "Gagal memuat detail request."));
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [range, provider, model, status, page, pageSize]);

  useEffect(() => {
    // Runs an async fetch; all state updates wait for the response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
