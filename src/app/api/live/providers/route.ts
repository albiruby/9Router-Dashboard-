import { NextRequest, connection } from "next/server";
import { apiError, noStoreJson, sessionToken, unauthorized } from "@/lib/api";
import { getProviders, isMockMode } from "@/lib/nine-router";
import { getDemoProviders } from "@/lib/mock";

export async function GET(request: NextRequest) {
  await connection();
  if (isMockMode()) {
    return noStoreJson(getDemoProviders());
  }

  const token = sessionToken(request);
  if (!token) return unauthorized();

  try {
    const providers = await getProviders(token);
    return noStoreJson(providers);
  } catch (error) {
    return apiError(error);
  }
}
