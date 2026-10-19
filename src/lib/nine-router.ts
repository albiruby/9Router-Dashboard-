import type {
  AvailabilityResponse,
  ChartPoint,
  ModelAvailability,
  Period,
  ProvidersResponse,
  QuotaResponse,
  RequestDetail,
  RequestDetailPage,
  SessionInfo,
  Stats,
} from "./types";
import { toUpstreamParams, type RequestDetailQuery } from "./request-query";

export const SESSION_COOKIE = "nr_session";
export const VALID_PERIODS: Period[] = ["today", "24h", "7d", "30d", "60d", "all"];

const BASE_URL = (process.env.NINE_ROUTER_URL || "").replace(/\/+$/, "");

export function isMockMode(): boolean {
  return process.env.NINE_ROUTER_MOCK === "1";
}

export function assertConfigured(): void {
  if (!BASE_URL) {
    throw new UpstreamError(
      "NINE_ROUTER_URL belum diatur di .env.local.",
      500
    );
  }
}

export class UpstreamError extends Error {
  status: number;
  retryAfter?: number;

  constructor(message: string, status = 502, retryAfter?: number) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

async function readJsonSafe(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function errorMessage(data: Record<string, unknown> | null, fallback: string): string {
  const value = data?.error;
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

function authHeaders(token: string): HeadersInit {
  return {
    cookie: `auth_token=${token}`,
    accept: "application/json",
  };
}

async function upstreamFetch(
  path: string,
  token: string,
  init: RequestInit = {},
  timeoutMs = 15000
): Promise<Response> {
  assertConfigured();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        ...authHeaders(token),
        ...(init.headers || {}),
      },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new UpstreamError("9Router tidak merespons. Periksa koneksi Tailscale.", 504);
    }
    throw new UpstreamError("Tidak bisa terhubung ke 9Router. Periksa URL dan Tailscale.", 502);
  }
  if (response.status >= 300 && response.status < 400) {
    throw new UpstreamError("Sesi 9Router sudah berakhir. Silakan masuk ulang.", 401);
  }
  if (response.status === 401 || response.status === 403) {
    throw new UpstreamError("Sesi 9Router sudah berakhir. Silakan masuk ulang.", 401);
  }
  return response;
}

export async function loginToNineRouter(password: string): Promise<string> {
  assertConfigured();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ password }),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new UpstreamError("Tidak bisa terhubung ke 9Router. Periksa URL dan Tailscale.", 502);
  }

  const data = await readJsonSafe(response);
  if (!response.ok) {
    const retryAfter = typeof data?.retryAfter === "number" ? data.retryAfter : undefined;
    throw new UpstreamError(
      errorMessage(data, "Login ke 9Router gagal."),
      response.status,
      retryAfter
    );
  }

  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  const rawCookie = setCookies.find((value) => value.startsWith("auth_token=")) ||
    response.headers.get("set-cookie") ||
    "";
  const match = rawCookie.match(/auth_token=([^;]+)/);
  if (!match?.[1]) {
    throw new UpstreamError("9Router tidak mengirim sesi login. Periksa konfigurasi autentikasi.", 502);
  }
  return match[1];
}

export async function getSessionInfo(token: string): Promise<SessionInfo> {
  const response = await upstreamFetch("/api/auth/status", token);
  const data = await readJsonSafe(response);
  if (!response.ok) {
    throw new UpstreamError(errorMessage(data, "Gagal memeriksa sesi 9Router."), response.status);
  }
  return {
    authenticated: Boolean(data?.authenticated),
    mock: false,
    displayName: typeof data?.displayName === "string" ? data.displayName : undefined,
    loginMethod: typeof data?.loginMethod === "string" ? data.loginMethod : undefined,
  };
}

export async function getStats(token: string, period: Period): Promise<Stats> {
  const response = await upstreamFetch(`/api/usage/stats?period=${encodeURIComponent(period)}`, token);
  const data = await readJsonSafe(response);
  if (!response.ok || !data) {
    throw new UpstreamError(errorMessage(data, "Gagal memuat statistik 9Router."), response.status);
  }
  return data as unknown as Stats;
}

export async function getChart(token: string, period: Period): Promise<ChartPoint[]> {
  const response = await upstreamFetch(
    `/api/usage/chart?period=${encodeURIComponent(period)}`,
    token
  );
  const data = await readJsonSafe(response);
  if (!response.ok) {
    throw new UpstreamError(errorMessage(data, "Gagal memuat grafik penggunaan."), response.status);
  }
  if (!Array.isArray(data)) return [];
  return (data as unknown as ChartPoint[]).map((point) => ({
    label: String(point?.label ?? ""),
    tokens: Number(point?.tokens ?? 0),
    cost: Number(point?.cost ?? 0),
    requests: Number(point?.requests ?? 0),
  }));
}

function normalizeAvailability(entry: Record<string, unknown>): ModelAvailability | null {
  const provider = typeof entry.provider === "string" ? entry.provider : "";
  const model = typeof entry.model === "string" ? entry.model : "";
  if (!provider || !model) return null;
  const status = entry.status === "unavailable" ? "unavailable" : "cooldown";
  return {
    provider,
    model,
    status,
    until:
      typeof entry.until === "string" || typeof entry.until === "number" ? entry.until : undefined,
    connectionId: typeof entry.connectionId === "string" ? entry.connectionId : "",
    connectionName:
      typeof entry.connectionName === "string" ? entry.connectionName : provider,
    lastError: typeof entry.lastError === "string" ? entry.lastError : null,
  };
}

export async function getAvailability(token: string): Promise<AvailabilityResponse> {
  const response = await upstreamFetch("/api/models/availability", token);
  const data = await readJsonSafe(response);
  if (!response.ok || !data) {
    throw new UpstreamError(
      errorMessage(data, "Gagal memuat ketersediaan model."),
      response.status
    );
  }
  const rawModels = Array.isArray(data.models)
    ? (data.models as Record<string, unknown>[])
    : [];
  const models = rawModels
    .map(normalizeAvailability)
    .filter((entry): entry is ModelAvailability => entry !== null);
  return {
    models,
    unavailableCount:
      typeof data.unavailableCount === "number" ? data.unavailableCount : models.length,
  };
}

export async function getProviders(token: string): Promise<ProvidersResponse> {
  const [providersResponse, nodesResponse] = await Promise.all([
    upstreamFetch("/api/providers", token),
    upstreamFetch("/api/provider-nodes", token).catch(() => null),
  ]);

  const providersData = await readJsonSafe(providersResponse);
  if (!providersResponse.ok || !providersData) {
    throw new UpstreamError(
      errorMessage(providersData, "Gagal memuat daftar provider."),
      providersResponse.status
    );
  }

  const nodesData = nodesResponse ? await readJsonSafe(nodesResponse) : null;
  const rawConnections = Array.isArray(providersData.connections)
    ? (providersData.connections as Record<string, unknown>[])
    : [];
  const rawNodes = Array.isArray(nodesData?.nodes)
    ? (nodesData.nodes as Record<string, unknown>[])
    : [];

  const connections = rawConnections
    .filter((connection) => connection.isActive !== false)
    .map((connection) => ({
      id: String(connection.id ?? ""),
      provider: String(connection.provider ?? ""),
      name: typeof connection.name === "string" ? connection.name : undefined,
      email: typeof connection.email === "string" ? connection.email : undefined,
      authType: typeof connection.authType === "string" ? connection.authType : undefined,
      isActive: connection.isActive !== false,
      priority:
        typeof connection.priority === "number" || typeof connection.priority === "string"
          ? connection.priority
          : undefined,
      createdAt: typeof connection.createdAt === "string" ? connection.createdAt : undefined,
    }))
    .filter((connection) => connection.id && connection.provider);

  const nodes = rawNodes
    .map((node) => ({
      id: String(node.id ?? ""),
      name: typeof node.name === "string" ? node.name : undefined,
      provider: typeof node.provider === "string" ? node.provider : undefined,
    }))
    .filter((node) => node.id);

  return { connections, nodes };
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getRequestDetails(
  token: string,
  query: RequestDetailQuery
): Promise<RequestDetailPage> {
  const params = toUpstreamParams(query);
  const response = await upstreamFetch(
    `/api/usage/request-details?${params.toString()}`,
    token
  );
  const data = await readJsonSafe(response);
  if (!response.ok) {
    throw new UpstreamError(errorMessage(data, "Gagal memuat detail request."), response.status);
  }

  const rawList =
    data && Array.isArray(data.details) ? (data.details as Record<string, unknown>[]) : [];
  const details: RequestDetail[] = rawList.map((entry) => ({
    ...entry,
    timestamp: typeof entry.timestamp === "string" ? entry.timestamp : "",
    provider: typeof entry.provider === "string" ? entry.provider : null,
    model: typeof entry.model === "string" ? entry.model : null,
    connectionId: typeof entry.connectionId === "string" ? entry.connectionId : null,
    status: typeof entry.status === "string" ? entry.status : null,
  }));

  const pagination = (data?.pagination ?? {}) as Record<string, unknown>;
  const page = asNumber(pagination.page, query.page ?? 1);
  const pageSize = asNumber(pagination.pageSize, query.pageSize ?? 25);
  const totalItems = asNumber(pagination.totalItems, details.length);
  const totalPages = asNumber(
    pagination.totalPages,
    pageSize > 0 ? Math.ceil(totalItems / pageSize) : 0
  );

  return {
    details,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNext: pagination.hasNext === true,
      hasPrev: pagination.hasPrev === true,
    },
  };
}

export async function getQuota(token: string, connectionId: string): Promise<QuotaResponse> {
  const response = await upstreamFetch(
    `/api/usage/${encodeURIComponent(connectionId)}?force=1`,
    token,
    {},
    45000
  );
  const data = await readJsonSafe(response);
  if (!response.ok) {
    throw new UpstreamError(errorMessage(data, "Gagal memuat kuota."), response.status);
  }
  return (data ?? {}) as QuotaResponse;
}

export async function openUsageStream(token: string, signal: AbortSignal): Promise<Response> {
  assertConfigured();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/usage/stream`, {
      headers: {
        cookie: `auth_token=${token}`,
        accept: "text/event-stream",
      },
      cache: "no-store",
      signal,
    });
  } catch {
    throw new UpstreamError("Tidak bisa membuka stream 9Router.", 502);
  }
  if (response.status === 401 || response.status === 403) {
    throw new UpstreamError("Sesi 9Router sudah berakhir. Silakan masuk ulang.", 401);
  }
  const contentType = response.headers.get("content-type") || "";
  if (response.redirected || !contentType.includes("text/event-stream")) {
    throw new UpstreamError("Sesi 9Router sudah berakhir. Silakan masuk ulang.", 401);
  }
  if (!response.ok || !response.body) {
    throw new UpstreamError("9Router menolak stream usage.", response.status);
  }
  return response;
}
