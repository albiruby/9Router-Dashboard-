import { NextRequest } from "next/server";
import { apiError, noStoreJson, sessionToken, unauthorized } from "@/lib/api";
import { getQuota, isMockMode } from "@/lib/nine-router";
import { getDemoQuota } from "@/lib/mock";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  const { connectionId } = await params;
  if (!connectionId) {
    return noStoreJson({ error: "ID koneksi tidak valid." }, { status: 400 });
  }

  if (isMockMode()) {
    return noStoreJson(getDemoQuota(connectionId));
  }

  const token = sessionToken(request);
  if (!token) return unauthorized();

  try {
    const quota = await getQuota(token, connectionId);
    return noStoreJson(quota);
  } catch (error) {
    return apiError(error);
  }
}
