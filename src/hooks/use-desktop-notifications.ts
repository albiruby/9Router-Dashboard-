"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

const STORAGE_KEY = "pulse.notifications";

const preferenceListeners = new Set<() => void>();

function subscribePreference(callback: () => void) {
  preferenceListeners.add(callback);
  return () => preferenceListeners.delete(callback);
}

function emitPreferenceChange() {
  for (const listener of preferenceListeners) listener();
}

function getPreferenceSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getPreferenceServerSnapshot() {
  return false;
}

function subscribeCapability() {
  return () => {};
}

function getCapabilitySnapshot() {
  return typeof window !== "undefined" && "Notification" in window;
}

function getCapabilityServerSnapshot() {
  return false;
}

function permissionGranted() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

export function useDesktopNotifications(errorProvider: string) {
  const supported = useSyncExternalStore(
    subscribeCapability,
    getCapabilitySnapshot,
    getCapabilityServerSnapshot
  );
  const storedEnabled = useSyncExternalStore(
    subscribePreference,
    getPreferenceSnapshot,
    getPreferenceServerSnapshot
  );
  const enabled = supported && storedEnabled && permissionGranted();
  const lastErrorRef = useRef("");

  const toggle = useCallback(async () => {
    if (!supported) return;
    if (enabled) {
      try {
        window.localStorage.setItem(STORAGE_KEY, "0");
      } catch {
        // Preference is best-effort.
      }
      emitPreferenceChange();
      return;
    }
    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (permission === "granted") {
        try {
          window.localStorage.setItem(STORAGE_KEY, "1");
        } catch {
          // Preference is best-effort.
        }
        emitPreferenceChange();
      }
    } catch {
      // Some embedded browsers reject permission requests.
    }
  }, [enabled, supported]);

  useEffect(() => {
    const current = errorProvider || "";
    const previous = lastErrorRef.current;
    lastErrorRef.current = current;
    if (!enabled || !current || current === previous) return;
    if (!permissionGranted()) return;
    try {
      new Notification("Provider bermasalah", {
        body: `${current} melaporkan error. Buka peta aliran untuk detail.`,
        tag: `pulse-error-${current}`,
        icon: "/nine-router.svg",
      });
    } catch {
      // Notification construction can fail in restricted contexts.
    }
  }, [enabled, errorProvider]);

  return { supported, enabled, toggle };
}
