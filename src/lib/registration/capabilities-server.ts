import { fetchRemcardUpstream } from "@/lib/remcard-server";
import type { RegistrationCapabilities } from "./types";

const FALLBACK: RegistrationCapabilities = {
  contractVersion: "2026-10-17.registration-01",
  welcomeEnabled: false,
  agentRegistrationPathEnabled: false,
  legacyLoginPathEnabled: true,
};

/** Local visual capture only: `REGISTRATION_SSR_WELCOME=1` + `NODE_ENV=development`. Fail-closed elsewhere. */
function registrationWelcomeSsrDevOverride(): RegistrationCapabilities | null {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }
  if (process.env.REGISTRATION_SSR_WELCOME !== "1") {
    return null;
  }
  return {
    contractVersion: FALLBACK.contractVersion,
    welcomeEnabled: true,
    agentRegistrationPathEnabled: true,
    legacyLoginPathEnabled: true,
  };
}

function mergeRegistrationCaps(
  base: RegistrationCapabilities,
): RegistrationCapabilities {
  const devOverride = registrationWelcomeSsrDevOverride();
  if (!devOverride) {
    return base;
  }
  return {
    ...base,
    welcomeEnabled: devOverride.welcomeEnabled,
    agentRegistrationPathEnabled: devOverride.agentRegistrationPathEnabled,
  };
}

export async function fetchRegistrationCapabilitiesServer(
  cookieHeader?: string | null,
): Promise<RegistrationCapabilities> {
  const devOnly = registrationWelcomeSsrDevOverride();
  const result = await fetchRemcardUpstream<RegistrationCapabilities>(
    "/api/pro/registration/capabilities",
    {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    },
  );
  if (!result.ok) {
    return devOnly ?? { ...FALLBACK };
  }
  const data = result.data;
  return mergeRegistrationCaps({
    contractVersion: data.contractVersion ?? FALLBACK.contractVersion,
    welcomeEnabled: Boolean(data.welcomeEnabled),
    agentRegistrationPathEnabled: Boolean(data.agentRegistrationPathEnabled),
    legacyLoginPathEnabled: data.legacyLoginPathEnabled !== false,
  });
}
