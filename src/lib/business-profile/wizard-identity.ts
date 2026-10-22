import type { ProProfileResponse } from "@/lib/types";

/** True when a different signed-in user or a different existing org replaces the session. */
export function externalBusinessProfileIdentityShift(
  prev: ProProfileResponse,
  next: ProProfileResponse,
): boolean {
  if (prev.user.id !== next.user.id) return true;
  const prevOrgId = prev.organization?.id ?? null;
  const nextOrgId = next.organization?.id ?? null;
  if (prevOrgId && nextOrgId && prevOrgId !== nextOrgId) return true;
  return false;
}
