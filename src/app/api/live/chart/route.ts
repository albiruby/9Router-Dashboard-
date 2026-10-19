import { NextRequest, connection } from "next/server";
import { apiError, noStoreJson, sessionToken, unauthorized } from "@/lib/api";
import { VALID_PERIODS, getChart, isMockMode } from "@/lib/nine-router";
import { getDemoChart } from "@/lib/mock";
import type { Period } from "@/lib/types";

export async function GET(request: NextRequest) {
  await connection();
  const periodParam = request.nextUrl.searchParams.get("period") || "today";
  if (!VALID_PERIODS.includes(periodParam as Period)) {
    return noStoreJson({ error: "Periode tidak valid." }, { status: 400 });
  }
  const period = periodParam as Period;

  if (isMockMode()) {
    return noStoreJson(getDemoChart(period));
  }

  const token = sessionToken(request);
  if (!token) return unauthorized();

  try {
    const chart = await getChart(token, period);
    return noStoreJson(chart);
  } catch (error) {
    return apiError(error);
  }
}
