export type Period = "today" | "24h" | "7d" | "30d" | "60d" | "all";

export interface UsageBucket {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  cost: number;
}

export interface ModelUsage extends UsageBucket {
  rawModel: string;
  provider: string;
  lastUsed: string;
}

export interface AccountUsage extends UsageBucket {
  rawModel: string;
  provider: string;
  connectionId: string;
  accountName: string;
  lastUsed: string;
}

export interface RecentRequest {
  timestamp: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens?: number;
  status?: string;
}

export interface ActiveRequest {
  model: string;
  provider: string;
  account?: string;
  count: number;
}

export interface PendingState {
  byModel?: Record<string, number>;
  byAccount?: Record<string, Record<string, number>>;
}

export interface MinuteBucket {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

export interface ChartPoint {
  label: string;
  tokens: number;
  cost: number;
  requests: number;
}

export interface EndpointUsage extends UsageBucket {
  endpoint: string;
  rawModel: string;
  provider: string;
  lastUsed: string;
}

export interface ModelAvailability {
  provider: string;
  model: string;
  status: "cooldown" | "unavailable";
  until?: string | number;
  connectionId: string;
  connectionName: string;
  lastError?: string | null;
}

export interface AvailabilityResponse {
  models: ModelAvailability[];
  unavailableCount: number;
}

export interface Stats {
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCachedTokens: number;
  totalCost: number;
  byProvider: Record<string, UsageBucket>;
  byModel: Record<string, ModelUsage>;
  byAccount: Record<string, AccountUsage>;
  byApiKey?: Record<string, unknown>;
  byEndpoint?: Record<string, EndpointUsage>;
  last10Minutes: MinuteBucket[];
  pending: PendingState;
  activeRequests: ActiveRequest[];
  recentRequests: RecentRequest[];
  errorProvider: string;
}

export interface LiveStatsPayload {
  activeRequests?: ActiveRequest[];
  recentRequests?: RecentRequest[];
  errorProvider?: string;
  pending?: PendingState;
  last10Minutes?: MinuteBucket[];
}

export interface ProviderConnection {
  id: string;
  provider: string;
  name?: string;
  email?: string;
  authType?: string;
  isActive?: boolean;
  priority?: number | string;
  createdAt?: string;
}

export interface ProviderNode {
  id: string;
  name?: string;
  provider?: string;
}

export interface ProvidersResponse {
  connections: ProviderConnection[];
  nodes: ProviderNode[];
}

export interface UiProvider {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  connections: ProviderConnection[];
  requests: number;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  cost: number;
  lastUsed: string | null;
  activeCount: number;
  error: boolean;
}

export interface QuotaItem {
  name?: string;
  label?: string;
  used?: number;
  total?: number;
  remainingPercentage?: number;
  resetAt?: string | number | null;
  recurring?: boolean;
}

export interface QuotaResponse {
  quotas?: QuotaItem[];
  windows?: QuotaItem[];
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface SessionInfo {
  authenticated: boolean;
  mock: boolean;
  displayName?: string;
  loginMethod?: string;
}

export interface ApiErrorBody {
  error?: string;
  retryAfter?: number;
}

export interface RequestDetailLatency {
  ttft?: number;
  total?: number;
}

export interface RequestDetailTokens {
  prompt_tokens?: number;
  completion_tokens?: number;
  cached_tokens?: number;
  total_tokens?: number;
}

export interface RequestDetail {
  id?: string;
  timestamp: string;
  provider?: string | null;
  model?: string | null;
  connectionId?: string | null;
  status?: string | null;
  latency?: RequestDetailLatency;
  tokens?: RequestDetailTokens;
  [key: string]: unknown;
}

export interface RequestDetailPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface RequestDetailPage {
  details: RequestDetail[];
  pagination: RequestDetailPagination;
}
