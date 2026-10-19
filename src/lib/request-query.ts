export type RequestRange = "1h" | "24h" | "7d" | "30d" | "all";

export interface RequestDetailQuery {
  page?: number;
  pageSize?: number;
  provider?: string;
  model?: string;
  connectionId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export const MAX_REQUEST_PAGE_SIZE = 100;

export const REQUEST_PAGE_SIZES = [25, 50, 100];

export const REQUEST_RANGES: { value: RequestRange; label: string }[] = [
  { value: "1h", label: "1 jam" },
  { value: "24h", label: "24 jam" },
  { value: "7d", label: "7 hari" },
  { value: "30d", label: "30 hari" },
  { value: "all", label: "Semua" },
];

export const REQUEST_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Semua status" },
  { value: "success", label: "Sukses" },
  { value: "error", label: "Gagal" },
];

const RANGE_MINUTES: Record<Exclude<RequestRange, "all">, number> = {
  "1h": 60,
  "24h": 1_440,
  "7d": 10_080,
  "30d": 43_200,
};

export function rangeWindow(
  range: RequestRange,
  now = Date.now()
): { startDate?: string; endDate?: string } {
  if (range === "all") return {};
  const minutes = RANGE_MINUTES[range];
  return {
    startDate: new Date(now - minutes * 60_000).toISOString(),
    endDate: new Date(now).toISOString(),
  };
}

export function toUpstreamParams(query: RequestDetailQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  if (query.provider) params.set("provider", query.provider);
  if (query.model) params.set("model", query.model);
  if (query.connectionId) params.set("connectionId", query.connectionId);
  if (query.status) params.set("status", query.status);
  if (query.startDate) params.set("startDate", query.startDate);
  if (query.endDate) params.set("endDate", query.endDate);
  return params;
}

export function buildRequestParams(input: {
  range?: RequestRange;
  provider?: string;
  model?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): URLSearchParams {
  const window = rangeWindow(input.range ?? "all");
  return toUpstreamParams({
    page: input.page,
    pageSize: input.pageSize,
    provider: input.provider || undefined,
    model: input.model || undefined,
    status: input.status || undefined,
    startDate: window.startDate,
    endDate: window.endDate,
  });
}

export function parseRequestQuery(
  searchParams: URLSearchParams,
  options: { paginate?: boolean } = {}
): { query: RequestDetailQuery; error?: string } {
  const query: RequestDetailQuery = {};

  if (options.paginate !== false) {
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "25", 10);
    if (!Number.isFinite(page) || page < 1) {
      return { query, error: "Halaman tidak valid." };
    }
    if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > MAX_REQUEST_PAGE_SIZE) {
      return { query, error: `Ukuran halaman harus 1-${MAX_REQUEST_PAGE_SIZE}.` };
    }
    query.page = page;
    query.pageSize = pageSize;
  }

  const text = (key: string) => searchParams.get(key)?.trim() || "";
  const provider = text("provider");
  const model = text("model");
  const connectionId = text("connectionId");
  const status = text("status");
  if (provider) query.provider = provider;
  if (model) query.model = model;
  if (connectionId) query.connectionId = connectionId;
  if (status) query.status = status;

  const startDate = text("startDate");
  const endDate = text("endDate");
  if (startDate && !Number.isNaN(Date.parse(startDate))) query.startDate = startDate;
  if (endDate && !Number.isNaN(Date.parse(endDate))) query.endDate = endDate;

  return { query };
}

export function isRequestError(status: string | null | undefined): boolean {
  const value = (status || "").toLowerCase();
  return value !== "" && value !== "success" && value !== "ok";
}
