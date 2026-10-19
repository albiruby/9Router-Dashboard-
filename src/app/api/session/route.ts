import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  UpstreamError,
  getSessionInfo,
  isMockMode,
  loginToNineRouter,
} from "@/lib/nine-router";
import { noStoreJson } from "@/lib/api";

const COOKIE_MAX_AGE = 60 * 60 * 24;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NINE_ROUTER_COOKIE_SECURE === "true",
  };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const mock = isMockMode();

  if (!token) {
    return noStoreJson({ authenticated: false, mock });
  }

  if (mock) {
    return noStoreJson({
      authenticated: true,
      mock: true,
      displayName: "Mode demo",
      loginMethod: "Demo",
    });
  }

  try {
    const info = await getSessionInfo(token);
    if (!info.authenticated) {
      const response = noStoreJson({ authenticated: false, mock: false });
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    return noStoreJson(info);
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 401) {
      const response = noStoreJson({ authenticated: false, mock: false });
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    return noStoreJson({
      authenticated: true,
      mock: false,
      warning:
        error instanceof UpstreamError
          ? error.message
          : "Status sesi 9Router tidak bisa diperiksa.",
    });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    password?: unknown;
    demo?: unknown;
  };
  const password = typeof body.password === "string" ? body.password : "";
  const mock = isMockMode();

  if (mock) {
    if (!password && body.demo !== true) {
      return noStoreJson({ error: "Masukkan password atau pilih mode demo." }, { status: 400 });
    }
    const response = noStoreJson({ ok: true, mock: true });
    response.cookies.set(SESSION_COOKIE, "demo-session", cookieOptions());
    return response;
  }

  if (!password) {
    return noStoreJson({ error: "Password dashboard 9Router wajib diisi." }, { status: 400 });
  }

  try {
    const token = await loginToNineRouter(password);
    const response = NextResponse.json({ ok: true, mock: false });
    response.cookies.set(SESSION_COOKIE, token, cookieOptions());
    return response;
  } catch (error) {
    if (error instanceof UpstreamError) {
      return noStoreJson(
        { error: error.message, retryAfter: error.retryAfter },
        { status: error.status }
      );
    }
    console.error("[session] login failed", error instanceof Error ? error.message : error);
    return noStoreJson({ error: "Login gagal karena kesalahan server." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = noStoreJson({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
