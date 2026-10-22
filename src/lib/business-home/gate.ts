import { resolveCabinetNavMode } from "@/lib/cabinet-nav/mode";
import type { AuthUser } from "@/lib/types";

/** Store/company owner prototype home (not staff, not pure agent, not MASTER specialist). */
export function shouldRenderBusinessOwnerHome(
  user: Pick<AuthUser, "partnerType" | "role" | "partnerActivities">,
): boolean {
  const mode = resolveCabinetNavMode(user);
  return mode === "business-store" || mode === "business-company";
}

export function businessOwnerHomePartnerType(
  user: Pick<AuthUser, "partnerType">,
): "STORE" | "COMPANY" | null {
  if (user.partnerType === "STORE") return "STORE";
  if (user.partnerType === "COMPANY") return "COMPANY";
  return null;
}
