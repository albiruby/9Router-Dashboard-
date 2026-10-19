"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, handleUnauthorized } from "@/lib/client";
import type { ProvidersResponse } from "@/lib/types";

export function useProviders() {
  const [data, setData] = useState<ProvidersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/live/providers", { cache: "no-store" });
      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }
      const payload = (await response.json().catch(() => null)) as
        | ProvidersResponse
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(
          (payload as { error?: string } | null)?.error || "Gagal memuat daftar provider."
        );
      }
      setData(payload as ProvidersResponse);
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Gagal memuat daftar provider."));
    }
  }, []);

  useEffect(() => {
    // Runs an async fetch; all state updates wait for the response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const reload = useCallback(() => {
    void load();
  }, [load]);

  return { data, loading: data === null && error === null, error, reload };
}
