import { fetchRemcardUpstream } from "@/lib/remcard-server";
import type { SpecialistR06Status } from "./types";

export async function fetchSpecialistR06GateServer(cookieHeader: string | null) {
  const result = await fetchRemcardUpstream<SpecialistR06Status>("/api/pro/r06/status", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  if (!result.ok) {
    return {
      featureEnabled: false,
      eligible: false,
      ineligibleReason: "status_error" as const,
    };
  }
  return result.data;
}
