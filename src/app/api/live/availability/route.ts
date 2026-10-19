import { connection } from "next/server";
import { apiError, noStoreJson, sessionToken, unauthorized } from "@/lib/api";
import { getAvailability, isMockMode } from "@/lib/nine-router";
import { getDemoAvailability } from "@/lib/mock";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  await connection();

  if (isMockMode()) {
    return noStoreJson(getDemoAvailability());
  }

  const token = sessionToken(request);
  if (!token) return unauthorized();

  try {
    const availability = await getAvailability(token);
    return noStoreJson(availability);
  } catch (error) {
    return apiError(error);
  }
}
