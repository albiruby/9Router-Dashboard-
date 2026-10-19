export async function handleUnauthorized(): Promise<void> {
  try {
    await fetch("/api/session", { method: "DELETE" });
  } catch {
    // The redirect below still clears the app view.
  }
  if (typeof window !== "undefined") {
    window.location.replace("/login");
  }
}

export function errorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message) return value.message;
  return fallback;
}
