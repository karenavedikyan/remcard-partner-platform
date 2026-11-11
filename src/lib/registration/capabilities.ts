import { remcardFetch } from "@/lib/api-client";
import type { RegistrationCapabilities, RegistrationKind } from "./types";

const JOIN_KIND_KEYS: RegistrationKind[] = [
  "agent",
  "specialist",
  "store",
  "company",
  "employee",
];

const FALLBACK: RegistrationCapabilities = {
  contractVersion: "2026-10-17.registration-01",
  welcomeEnabled: false,
  agentRegistrationPathEnabled: false,
  joinRegistrationPathEnabled: false,
  legacyLoginPathEnabled: true,
};

/** Preserve explicit API false flags; undefined keeps legacy backward-compat defaults. */
export function normalizeRegistrationCapabilities(
  data: Partial<RegistrationCapabilities> | null | undefined,
): RegistrationCapabilities {
  if (!data) {
    return { ...FALLBACK };
  }

  const joinRegistrationPathEnabled =
    data.joinRegistrationPathEnabled !== undefined
      ? data.joinRegistrationPathEnabled === true
      : data.agentRegistrationPathEnabled === true;

  let joinKinds: RegistrationCapabilities["joinKinds"];
  if (data.joinKinds && typeof data.joinKinds === "object") {
    const normalized: Partial<Record<RegistrationKind, boolean>> = {};
    for (const kind of JOIN_KIND_KEYS) {
      const flag = data.joinKinds[kind];
      if (flag === true || flag === false) {
        normalized[kind] = flag;
      }
    }
    joinKinds = Object.keys(normalized).length > 0 ? normalized : undefined;
  }

  return {
    contractVersion: data.contractVersion ?? FALLBACK.contractVersion,
    welcomeEnabled: data.welcomeEnabled === true,
    agentRegistrationPathEnabled: data.agentRegistrationPathEnabled === true,
    joinRegistrationPathEnabled,
    joinKinds,
    legacyLoginPathEnabled: data.legacyLoginPathEnabled !== false,
  };
}

export async function fetchRegistrationCapabilitiesClient(): Promise<RegistrationCapabilities> {
  try {
    const data = await remcardFetch<RegistrationCapabilities>("/api/pro/registration/capabilities");
    return normalizeRegistrationCapabilities(data);
  } catch {
    return { ...FALLBACK };
  }
}

export function registrationWelcomeActive(caps: RegistrationCapabilities): boolean {
  return caps.welcomeEnabled && caps.agentRegistrationPathEnabled;
}
