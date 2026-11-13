import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { normalizeRegistrationCapabilities } from "./capabilities";
import type { RegistrationCapabilities } from "./types";

const FALLBACK: RegistrationCapabilities = {
  contractVersion: "2026-10-17.registration-01",
  welcomeEnabled: false,
  agentRegistrationPathEnabled: false,
  legacyLoginPathEnabled: true,
};

export async function fetchRegistrationCapabilitiesServer(
  cookieHeader?: string | null,
): Promise<RegistrationCapabilities> {
  const result = await fetchRemcardUpstream<RegistrationCapabilities>(
    "/api/pro/registration/capabilities",
    {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    },
  );
  if (!result.ok) {
    return { ...FALLBACK };
  }
  return normalizeRegistrationCapabilities(result.data ?? FALLBACK);
}
