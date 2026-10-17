import { remcardFetch } from "@/lib/api-client";
import type { RegistrationCapabilities } from "./types";

const FALLBACK: RegistrationCapabilities = {
  contractVersion: "2026-10-17.registration-01",
  welcomeEnabled: false,
  agentRegistrationPathEnabled: false,
  legacyLoginPathEnabled: true,
};

export async function fetchRegistrationCapabilitiesClient(): Promise<RegistrationCapabilities> {
  try {
    const data = await remcardFetch<RegistrationCapabilities>("/api/pro/registration/capabilities");
    return {
      contractVersion: data.contractVersion ?? FALLBACK.contractVersion,
      welcomeEnabled: Boolean(data.welcomeEnabled),
      agentRegistrationPathEnabled: Boolean(data.agentRegistrationPathEnabled),
      legacyLoginPathEnabled: data.legacyLoginPathEnabled !== false,
    };
  } catch {
    return { ...FALLBACK };
  }
}

export function registrationWelcomeActive(caps: RegistrationCapabilities): boolean {
  return caps.welcomeEnabled && caps.agentRegistrationPathEnabled;
}
