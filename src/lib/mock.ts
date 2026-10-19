import type {
  AccountUsage,
  ActiveRequest,
  AvailabilityResponse,
  ChartPoint,
  EndpointUsage,
  MinuteBucket,
  ModelUsage,
  Period,
  ProviderConnection,
  QuotaItem,
  QuotaResponse,
  RecentRequest,
  RequestDetail,
  RequestDetailPage,
  Stats,
  UsageBucket,
} from "./types";
import type { ProvidersResponse } from "./types";
import type { RequestDetailQuery } from "./request-query";

const BASE_REQUESTS = 1291;
const BASE_INPUT = 70_252_044;
const BASE_CACHED = 33_493_484;
const BASE_OUTPUT = 334_567;
const BASE_COST = 26.83;

interface Seed {
  model: string;
  provider: string;
  account: string;
  weight: number;
}

const SEEDS: Seed[] = [
  { model: "glm-5", provider: "kiro", account: "Kiro #1", weight: 0.14 },
  { model: "claude-sonnet-4.5", provider: "antigravity", account: "Antigravity #1", weight: 0.12 },
  { model: "nvidia/nemotron-3-ultra", provider: "nvidia", account: "NVIDIA NIM", weight: 0.11 },
  { model: "qwen3-coder-next", provider: "opencode", account: "OpenCode Free", weight: 0.1 },
  { model: "gemini-3.8-flash", provider: "gemini", account: "Gemini API", weight: 0.09 },
  { model: "gemini-3.1-pro", provider: "gemini-cli", account: "Gemini CLI", weight: 0.08 },
  { model: "claude-opus-4-5", provider: "antigravity", account: "Antigravity #1", weight: 0.08 },
  { model: "nemotron-3-super", provider: "nvidia", account: "NVIDIA NIM", weight: 0.07 },
  { model: "grok-code-fast-1", provider: "openrouter", account: "OpenRouter", weight: 0.07 },
  { model: "cline-pass/glm-5", provider: "cline", account: "Cline Pass", weight: 0.05 },
  { model: "agnes-2.0-pro", provider: "agnes", account: "Agnes AI", weight: 0.04 },
  { model: "deepseek-v3.2", provider: "openrouter", account: "OpenRouter", weight: 0.04 },
];

const CONNECTIONS: ProviderConnection[] = [
  { id: "demo-antigravity", provider: "antigravity", name: "Antigravity #1", authType: "oauth", isActive: true, priority: 1 },
  { id: "demo-kiro", provider: "kiro", name: "Kiro #1", authType: "oauth", isActive: true, priority: 2 },
  { id: "demo-gemini-cli", provider: "gemini-cli", name: "Gemini CLI", authType: "oauth", isActive: true, priority: 3 },
  { id: "demo-claude", provider: "claude", name: "Claude Code", authType: "oauth", isActive: true, priority: 4 },
  { id: "demo-gemini", provider: "gemini", name: "Gemini API", authType: "apikey", isActive: true, priority: 5 },
  { id: "demo-openrouter", provider: "openrouter", name: "OpenRouter", authType: "apikey", isActive: true, priority: 6 },
  { id: "demo-nvidia", provider: "nvidia", name: "NVIDIA NIM", authType: "apikey", isActive: true, priority: 7 },
  { id: "demo-opencode", provider: "opencode", name: "OpenCode Free", authType: "none", isActive: true, priority: 8 },
  { id: "demo-cline", provider: "cline", name: "Cline Pass", authType: "oauth", isActive: true, priority: 9 },
  { id: "demo-agnes", provider: "agnes", name: "Agnes AI", authType: "apikey", isActive: true, priority: 10 },
];

const RECENT_OFFSETS_SECONDS = [
  37, 46, 61, 90, 181, 184, 241, 539, 545, 959, 963, 968, 1273, 1589, 1861, 2177, 2543, 2899, 3255, 3611,
];

const MINUTE_REQUESTS = [1, 0, 2, 1, 3, 2, 4, 2, 3, 1];

const DEMO_QUOTAS: Record<string, QuotaItem[]> = {
  antigravity: [
    { name: "Claude 5 jam", used: 26, total: 100, recurring: true, resetAt: Date.now() + 2.4 * 3600_000 },
    { name: "Claude mingguan", used: 128, total: 500, recurring: true, resetAt: Date.now() + 3.2 * 86400_000 },
  ],
  kiro: [
    { name: "Kredit bulanan", used: 21, total: 50, recurring: true, resetAt: Date.now() + 12 * 86400_000 },
  ],
  "gemini-cli": [
    { name: "Permintaan per menit", used: 42, total: 60, recurring: true, resetAt: Date.now() + 32_000 },
    { name: "Permintaan per hari", used: 734, total: 1500, recurring: true, resetAt: Date.now() + 7.1 * 3600_000 },
  ],
  claude: [
    { name: "Claude 5 jam", used: 64, total: 100, recurring: true, resetAt: Date.now() + 1.7 * 3600_000 },
    { name: "Claude mingguan", used: 302, total: 500, recurring: true, resetAt: Date.now() + 2.6 * 86400_000 },
  ],
};

interface DemoStore {
  stats: Stats;
  requestDetails?: RequestDetail[];
  listeners: Set<(stats: Stats) => void>;
  timer: ReturnType<typeof setInterval> | null;
  activeTimer: ReturnType<typeof setTimeout> | null;
  errorTimer: ReturnType<typeof setTimeout> | null;
}

const globalForDemo = globalThis as typeof globalThis & {
  __ninePulseDemo?: DemoStore;
};

function nowMinus(seconds: number): string {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

function emptyBucket(): UsageBucket {
  return { requests: 0, promptTokens: 0, completionTokens: 0, cachedTokens: 0, cost: 0 };
}

function endpointFor(provider: string): string {
  if (provider === "antigravity" || provider === "claude" || provider === "cline") {
    return "/v1/messages";
  }
  if (provider === "gemini" || provider === "gemini-cli") {
    return "/v1beta/models";
  }
  return "/v1/chat/completions";
}

function buildBaseStats(): Stats {
  const byProvider: Record<string, UsageBucket> = {};
  const byModel: Record<string, ModelUsage> = {};
  const byAccount: Record<string, AccountUsage> = {};
  const byEndpoint: Record<string, EndpointUsage> = {};

  SEEDS.forEach((seed, index) => {
    const requests = Math.round(BASE_REQUESTS * seed.weight);
    const promptTokens = Math.round(BASE_INPUT * seed.weight);
    const cachedTokens = Math.round(BASE_CACHED * seed.weight);
    const completionTokens = Math.round(BASE_OUTPUT * seed.weight);
    const cost = Number((BASE_COST * seed.weight).toFixed(2));
    const lastUsed = nowMinus(37 + index * 233);

    const bucket = byProvider[seed.provider] ?? emptyBucket();
    bucket.requests += requests;
    bucket.promptTokens += promptTokens;
    bucket.completionTokens += completionTokens;
    bucket.cachedTokens += cachedTokens;
    bucket.cost += cost;
    byProvider[seed.provider] = bucket;

    const modelKey = `${seed.model} (${seed.provider})`;
    byModel[modelKey] = {
      requests,
      promptTokens,
      completionTokens,
      cachedTokens,
      cost,
      rawModel: seed.model,
      provider: seed.provider,
      lastUsed,
    };

    const accountKey = `${seed.model} (${seed.provider} - ${seed.account})`;
    byAccount[accountKey] = {
      requests,
      promptTokens,
      completionTokens,
      cachedTokens,
      cost,
      rawModel: seed.model,
      provider: seed.provider,
      connectionId: CONNECTIONS.find((connection) => connection.provider === seed.provider)?.id || "",
      accountName: seed.account,
      lastUsed,
    };

    const endpoint = endpointFor(seed.provider);
    const endpointKey = `${endpoint}|${seed.model}|${seed.provider}`;
    byEndpoint[endpointKey] = {
      requests,
      promptTokens,
      completionTokens,
      cachedTokens,
      cost,
      endpoint,
      rawModel: seed.model,
      provider: seed.provider,
      lastUsed,
    };
  });

  const recentRequests: RecentRequest[] = RECENT_OFFSETS_SECONDS.map((seconds, index) => {
    const seed = SEEDS[index % SEEDS.length];
    const averageInput = BASE_INPUT / BASE_REQUESTS;
    const promptTokens = Math.round(averageInput * (0.55 + ((index * 7) % 10) / 10));
    const completionTokens = Math.round((BASE_OUTPUT / BASE_REQUESTS) * (0.5 + ((index * 3) % 10) / 10));
    const cachedTokens = Math.round(promptTokens * (((index * 5) % 8) / 10));
    return {
      timestamp: nowMinus(seconds),
      model: seed.model,
      provider: seed.provider,
      promptTokens,
      completionTokens,
      cachedTokens,
      status: "ok",
    };
  });

  const last10Minutes: MinuteBucket[] = MINUTE_REQUESTS.map((requests) => ({
    requests,
    promptTokens: requests * 42_000,
    completionTokens: requests * 260,
    cost: Number((requests * 0.12).toFixed(2)),
  }));

  const activeRequests: ActiveRequest[] = [
    {
      model: "claude-sonnet-4.5",
      provider: "antigravity",
      account: "Antigravity #1",
      count: 1,
    },
  ];

  return {
    totalRequests: BASE_REQUESTS,
    totalPromptTokens: BASE_INPUT,
    totalCompletionTokens: BASE_OUTPUT,
    totalCachedTokens: BASE_CACHED,
    totalCost: BASE_COST,
    byProvider,
    byModel,
    byAccount,
    byEndpoint,
    last10Minutes,
    pending: { byModel: {}, byAccount: {} },
    activeRequests,
    recentRequests,
    errorProvider: "",
  };
}

function createStore(): DemoStore {
  const store: DemoStore = {
    stats: buildBaseStats(),
    listeners: new Set(),
    timer: null,
    activeTimer: null,
    errorTimer: null,
  };

  store.activeTimer = setTimeout(() => {
    store.stats.activeRequests = [];
    emit(store);
  }, 2600);

  return store;
}

function getStore(): DemoStore {
  if (!globalForDemo.__ninePulseDemo) {
    globalForDemo.__ninePulseDemo = createStore();
  }
  return globalForDemo.__ninePulseDemo;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function emit(store: DemoStore): void {
  if (store.listeners.size === 0) return;
  const payload = clone(store.stats);
  for (const listener of store.listeners) {
    try {
      listener(payload);
    } catch {
      // A broken SSE client must not stop the demo stream.
    }
  }
}

function pickSeed(): Seed {
  const total = SEEDS.reduce((sum, seed) => sum + seed.weight, 0);
  let cursor = Math.random() * total;
  for (const seed of SEEDS) {
    cursor -= seed.weight;
    if (cursor <= 0) return seed;
  }
  return SEEDS[0];
}

function tick(): void {
  const store = getStore();
  const seed = pickSeed();
  const stats = store.stats;
  const timestamp = new Date().toISOString();
  const promptTokens = 9_000 + Math.floor(Math.random() * 150_000);
  const completionTokens = 60 + Math.floor(Math.random() * 900);
  const cachedTokens = Math.floor(promptTokens * Math.random() * 0.45);
  const cost = Number(
    ((promptTokens / 1_000_000) * 0.65 + (completionTokens / 1_000_000) * 1.8).toFixed(4)
  );
  const failed = Math.random() < 0.06;

  stats.totalRequests += 1;
  stats.totalPromptTokens += promptTokens;
  stats.totalCompletionTokens += completionTokens;
  stats.totalCachedTokens += cachedTokens;
  stats.totalCost = Number((stats.totalCost + cost).toFixed(2));

  const providerBucket = stats.byProvider[seed.provider] ?? emptyBucket();
  providerBucket.requests += 1;
  providerBucket.promptTokens += promptTokens;
  providerBucket.completionTokens += completionTokens;
  providerBucket.cachedTokens += cachedTokens;
  providerBucket.cost = Number((providerBucket.cost + cost).toFixed(2));
  stats.byProvider[seed.provider] = providerBucket;

  const modelKey = `${seed.model} (${seed.provider})`;
  const modelEntry = stats.byModel[modelKey] ?? {
    ...emptyBucket(),
    rawModel: seed.model,
    provider: seed.provider,
    lastUsed: timestamp,
  };
  modelEntry.requests += 1;
  modelEntry.promptTokens += promptTokens;
  modelEntry.completionTokens += completionTokens;
  modelEntry.cachedTokens += cachedTokens;
  modelEntry.cost = Number((modelEntry.cost + cost).toFixed(2));
  modelEntry.lastUsed = timestamp;
  stats.byModel[modelKey] = modelEntry;

  const accountKey = `${seed.model} (${seed.provider} - ${seed.account})`;
  const accountEntry = stats.byAccount[accountKey] ?? {
    ...emptyBucket(),
    rawModel: seed.model,
    provider: seed.provider,
    connectionId: CONNECTIONS.find((connection) => connection.provider === seed.provider)?.id || "",
    accountName: seed.account,
    lastUsed: timestamp,
  };
  accountEntry.requests += 1;
  accountEntry.promptTokens += promptTokens;
  accountEntry.completionTokens += completionTokens;
  accountEntry.cachedTokens += cachedTokens;
  accountEntry.cost = Number((accountEntry.cost + cost).toFixed(2));
  accountEntry.lastUsed = timestamp;
  stats.byAccount[accountKey] = accountEntry;

  const endpoint = endpointFor(seed.provider);
  stats.byEndpoint ||= {};
  const endpointKey = `${endpoint}|${seed.model}|${seed.provider}`;
  const endpointEntry = stats.byEndpoint[endpointKey] ?? {
    ...emptyBucket(),
    endpoint,
    rawModel: seed.model,
    provider: seed.provider,
    lastUsed: timestamp,
  };
  endpointEntry.requests += 1;
  endpointEntry.promptTokens += promptTokens;
  endpointEntry.completionTokens += completionTokens;
  endpointEntry.cachedTokens += cachedTokens;
  endpointEntry.cost = Number((endpointEntry.cost + cost).toFixed(2));
  endpointEntry.lastUsed = timestamp;
  stats.byEndpoint[endpointKey] = endpointEntry;

  const request: RecentRequest = {
    timestamp,
    model: seed.model,
    provider: seed.provider,
    promptTokens,
    completionTokens,
    cachedTokens,
    status: failed ? "error" : "ok",
  };
  stats.recentRequests = [request, ...stats.recentRequests].slice(0, 20);

  const minute = stats.last10Minutes[stats.last10Minutes.length - 1];
  minute.requests += 1;
  minute.promptTokens += promptTokens;
  minute.completionTokens += completionTokens;
  minute.cost = Number((minute.cost + cost).toFixed(2));

  stats.activeRequests = [
    {
      model: seed.model,
      provider: seed.provider,
      account: seed.account,
      count: 1,
    },
  ];

  if (failed) {
    stats.errorProvider = seed.provider;
    if (store.errorTimer) clearTimeout(store.errorTimer);
    store.errorTimer = setTimeout(() => {
      if (store.stats.errorProvider === seed.provider) {
        store.stats.errorProvider = "";
        emit(store);
      }
    }, 7000);
  }

  emit(store);

  if (store.activeTimer) clearTimeout(store.activeTimer);
  store.activeTimer = setTimeout(() => {
    store.stats.activeRequests = [];
    emit(store);
  }, 1700);
}

function ensureTimer(store: DemoStore): void {
  if (store.timer) return;
  const timer = setInterval(tick, 2400) as ReturnType<typeof setInterval> & {
    unref?: () => void;
  };
  timer.unref?.();
  store.timer = timer;
}

export function getDemoStats(): Stats {
  return clone(getStore().stats);
}

export function subscribeDemo(listener: (stats: Stats) => void): () => void {
  const store = getStore();
  store.listeners.add(listener);
  ensureTimer(store);
  return () => {
    store.listeners.delete(listener);
  };
}

export function getDemoProviders(): ProvidersResponse {
  return { connections: clone(CONNECTIONS), nodes: [] };
}

export function getDemoQuota(connectionId: string): QuotaResponse {
  const connection = CONNECTIONS.find((item) => item.id === connectionId);
  if (!connection) {
    return { message: "Koneksi demo tidak ditemukan." };
  }
  const quotas = DEMO_QUOTAS[connection.provider];
  if (!quotas) {
    return { message: "Provider ini memakai API key dan tidak memiliki kuota langganan." };
  }
  return { quotas: clone(quotas) };
}

function distribute(total: number, weights: number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0) || 1;
  return weights.map((weight) => (total * weight) / sum);
}

function hourLabel(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getDemoChart(period: Period): ChartPoint[] {
  const stats = getStore().stats;
  const now = new Date();
  const hourly = period === "today" || period === "24h";

  let count: number;
  if (hourly) count = 24;
  else if (period === "7d") count = 7;
  else if (period === "30d") count = 30;
  else if (period === "60d") count = 60;
  else count = 30;

  const labels: string[] = [];
  let activeCount = count;
  if (period === "today") {
    activeCount = Math.max(1, now.getHours() + 1);
    for (let i = 0; i < count; i += 1) {
      labels.push(`${String(i).padStart(2, "0")}:00`);
    }
  } else if (period === "24h") {
    for (let i = count - 1; i >= 0; i -= 1) {
      labels.push(hourLabel(new Date(now.getTime() - i * 3_600_000)));
    }
  } else {
    for (let i = count - 1; i >= 0; i -= 1) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      labels.push(day.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    }
  }

  const weights = Array.from({ length: count }, (_, index) => {
    if (index >= activeCount) return 0;
    const progress = activeCount <= 1 ? 1 : index / (activeCount - 1);
    const shape = 0.2 + Math.pow(progress, 1.35) * 1.6;
    const ripple = 0.25 * Math.sin(index * 1.9) + 0.12 * Math.cos(index * 0.7);
    return Math.max(0.03, shape + ripple);
  });

  const requests = distribute(stats.totalRequests, weights);
  const tokens = distribute(stats.totalPromptTokens + stats.totalCompletionTokens, weights);
  const costs = distribute(stats.totalCost, weights);

  return labels.map((label, index) => ({
    label,
    requests: Math.round(requests[index]),
    tokens: Math.round(tokens[index]),
    cost: Number(costs[index].toFixed(4)),
  }));
}

export function getDemoAvailability(): AvailabilityResponse {
  const now = Date.now();
  return {
    models: [
      {
        provider: "nvidia",
        model: "nemotron-3-ultra",
        status: "cooldown",
        until: new Date(now + 4.5 * 60_000).toISOString(),
        connectionId: "demo-nvidia",
        connectionName: "NVIDIA NIM",
        lastError: "429 Too Many Requests",
      },
      {
        provider: "agnes",
        model: "__all",
        status: "unavailable",
        connectionId: "demo-agnes",
        connectionName: "Agnes AI",
        lastError: "Connection timed out",
      },
    ],
    unavailableCount: 2,
  };
}

function buildRequestDetails(): RequestDetail[] {
  const rows: RequestDetail[] = [];
  const total = 240;
  const step = (36 * 3600_000) / total;
  let cursor = Date.now() - 25_000;

  for (let index = 0; index < total; index += 1) {
    const seed = SEEDS[Math.floor(Math.abs(Math.sin(index * 12.9898)) * SEEDS.length) % SEEDS.length];
    const connection = CONNECTIONS.find((item) => item.provider === seed.provider);
    const failed = Math.sin(index * 4.7) > 0.88;
    const promptTokens = 900 + Math.round(Math.abs(Math.sin(index * 1.37)) * 12_000);
    const cachedTokens = Math.round(promptTokens * (0.18 + 0.32 * Math.abs(Math.sin(index * 3.11))));
    const completionTokens = failed ? 0 : 90 + Math.round(Math.abs(Math.cos(index * 2.03)) * 1_100);
    const ttft = failed
      ? 3_200 + Math.round(Math.abs(Math.sin(index * 5.3)) * 4_800)
      : 210 + Math.round(Math.abs(Math.sin(index * 1.7)) * 2_400);
    const totalMs = ttft + (failed
      ? 11_000 + Math.round(Math.abs(Math.cos(index * 3.7)) * 9_000)
      : 600 + Math.round(Math.abs(Math.cos(index * 2.9)) * 6_800));

    rows.push({
      id: `demo-req-${String(total - index).padStart(4, "0")}`,
      timestamp: new Date(cursor).toISOString(),
      provider: seed.provider,
      model: seed.model,
      connectionId: connection?.id ?? "demo-connection",
      status: failed ? "error" : "success",
      endpoint: endpointFor(seed.provider),
      account: seed.account,
      apiKey: `sk-demo-${(Math.abs(Math.sin(index * 8.1)) * 36 ** 6).toString(36).slice(0, 6).padEnd(6, "x")}`,
      latency: { ttft, total: totalMs },
      tokens: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cached_tokens: cachedTokens,
        total_tokens: promptTokens + completionTokens,
      },
      request: { method: "POST", path: endpointFor(seed.provider), stream: true },
      providerResponse: { redacted: true },
      response: { redacted: true },
    });

    cursor -= step * (0.45 + Math.abs(Math.sin(index * 0.91)));
  }

  return rows;
}

export function getDemoRequestDetails(query: RequestDetailQuery): RequestDetailPage {
  const store = getStore();
  if (!store.requestDetails) {
    store.requestDetails = buildRequestDetails();
  }

  const startMs = query.startDate ? Date.parse(query.startDate) : Number.NEGATIVE_INFINITY;
  const endMs = query.endDate ? Date.parse(query.endDate) : Number.POSITIVE_INFINITY;

  const filtered = store.requestDetails.filter((row) => {
    if (query.provider && row.provider !== query.provider) return false;
    if (query.model && row.model !== query.model) return false;
    if (query.connectionId && row.connectionId !== query.connectionId) return false;
    if (query.status && row.status !== query.status) return false;
    const at = Date.parse(row.timestamp);
    if (Number.isFinite(startMs) && at < startMs) return false;
    if (Number.isFinite(endMs) && at > endMs) return false;
    return true;
  });

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 25);
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const start = (page - 1) * pageSize;
  const details = filtered.slice(start, start + pageSize).map((row) => clone(row));

  return {
    details,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNext: start + pageSize < totalItems,
      hasPrev: page > 1,
    },
  };
}
