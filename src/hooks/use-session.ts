"use client";

import { useCallback, useEffect, useState } from "react";
import { handleUnauthorized } from "@/lib/client";
import type { SessionInfo } from "@/lib/types";

export function useSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: SessionInfo) => {
        if (!active) return;
        setSession(data);
        if (!data.authenticated) {
          void handleUnauthorized();
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/session", { method: "DELETE" });
    } catch {
      // The redirect below still ends the local view of the session.
    }
    window.location.replace("/login");
  }, []);

  return { session, mock: Boolean(session?.mock), logout };
}
