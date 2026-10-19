import { NextRequest, connection } from "next/server";
import { apiError, noStoreJson, sessionToken, unauthorized } from "@/lib/api";
import { VALID_PERIODS, getStats, isMockMode } from "@/lib/nine-router";
import { getDemoStats } from "@/lib/mock";
import type { Period } from "@/lib/types";

export async function GET(request: NextRequest) {
  await connection();
  const periodParam = request.nextUrl.searchParams.get("period") || "today";
  if (!VALID_PERIODS.includes(periodParam as Period)) {
    return noStoreJson({ error: "Periode tidak valid." }, { status: 400 });
  }
  const period = periodParam as Period;

  if (isMockMode()) {
    return noStoreJson(getDemoStats());
  }

  const token = sessionToken(request);
  if (!token) return unauthorized();

  try {
    const stats = await getStats(token, period);
    return noStoreJson(stats);
  } catch (error) {
    return apiError(error);
  }
}
