import { NextRequest, NextResponse, connection } from "next/server";
import { apiError, sessionToken, unauthorized } from "@/lib/api";
import { getDemoRequestDetails } from "@/lib/mock";
import { getRequestDetails, isMockMode } from "@/lib/nine-router";
import { parseRequestQuery } from "@/lib/request-query";
import type { RequestDetail } from "@/lib/types";

const EXPORT_LIMIT = 5000;
const UPSTREAM_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  await connection();

  const searchParams = request.nextUrl.searchParams;
  const parsed = parseRequestQuery(searchParams, { paginate: false });
  const format = searchParams.get("format") === "json" ? "json" : "csv";

  let details: RequestDetail[] = [];

  if (isMockMode()) {
    details = getDemoRequestDetails({
      ...parsed.query,
      page: 1,
      pageSize: EXPORT_LIMIT,
    }).details;
  } else {
    const token = sessionToken(request);
    if (!token) return unauthorized();

    try {
      let page = 1;
      while (details.length < EXPORT_LIMIT) {
        const chunk = await getRequestDetails(token, {
          ...parsed.query,
          page,
          pageSize: UPSTREAM_PAGE_SIZE,
        });
        details.push(...chunk.details);
        if (!chunk.pagination.hasNext || chunk.details.length === 0) break;
        page += 1;
      }
    } catch (error) {
      return apiError(error);
    }
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const disposition = `attachment; filename="pulse-requests-${stamp}.${format}"`;

  if (format === "json") {
    return new NextResponse(
      JSON.stringify({ exportedAt: new Date().toISOString(), count: details.length, details }, null, 2),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": disposition,
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return new NextResponse(toCsv(details), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(details: RequestDetail[]): string {
  const header = [
    "timestamp",
    "status",
    "provider",
    "model",
    "connectionId",
    "endpoint",
    "ttft_ms",
    "total_ms",
    "prompt_tokens",
    "completion_tokens",
    "cached_tokens",
    "total_tokens",
    "id",
  ];

  const lines = details.map((row) =>
    [
      row.timestamp,
      row.status ?? "",
      row.provider ?? "",
      row.model ?? "",
      row.connectionId ?? "",
      typeof row.endpoint === "string" ? row.endpoint : "",
      row.latency?.ttft ?? "",
      row.latency?.total ?? "",
      row.tokens?.prompt_tokens ?? "",
      row.tokens?.completion_tokens ?? "",
      row.tokens?.cached_tokens ?? "",
      row.tokens?.total_tokens ?? "",
      row.id ?? "",
    ]
      .map(csvCell)
      .join(",")
  );

  return `\uFEFF${header.join(",")}\r\n${lines.join("\r\n")}`;
}
