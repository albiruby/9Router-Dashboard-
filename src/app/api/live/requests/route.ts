import { NextRequest, connection } from "next/server";
import { apiError, noStoreJson, sessionToken, unauthorized } from "@/lib/api";
import { getDemoRequestDetails } from "@/lib/mock";
import { getRequestDetails, isMockMode } from "@/lib/nine-router";
import { parseRequestQuery } from "@/lib/request-query";

export async function GET(request: NextRequest) {
  await connection();

  const parsed = parseRequestQuery(request.nextUrl.searchParams);
  if (parsed.error) {
    return noStoreJson({ error: parsed.error }, { status: 400 });
  }

  if (isMockMode()) {
    return noStoreJson(getDemoRequestDetails(parsed.query));
  }

  const token = sessionToken(request);
  if (!token) return unauthorized();

  try {
    const page = await getRequestDetails(token, parsed.query);
    return noStoreJson(page);
  } catch (error) {
    return apiError(error);
  }
}
