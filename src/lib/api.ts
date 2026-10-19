import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, UpstreamError } from "./nine-router";

export function sessionToken(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value || null;
}

export function noStoreJson(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers || {}),
    },
  });
}

export function unauthorized(): NextResponse {
  return noStoreJson(
    { error: "Sesi tidak ditemukan. Silakan masuk ulang." },
    { status: 401 }
  );
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof UpstreamError) {
    return noStoreJson(
      { error: error.message, retryAfter: error.retryAfter },
      { status: error.status }
    );
  }
  console.error("[api]", error instanceof Error ? error.message : error);
  return noStoreJson({ error: "Terjadi kesalahan pada server." }, { status: 500 });
}
