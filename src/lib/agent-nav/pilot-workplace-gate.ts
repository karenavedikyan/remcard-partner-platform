import { shouldPreferBusinessWorkplaceDispatch } from "@/lib/cabinet-presentation/resolve";
import type { CabinetPresentationSnapshot } from "@/lib/cabinet-presentation/types";

export type AgentPilotPresentationScope = Pick<
  CabinetPresentationSnapshot,
  "proContext" | "workplacePartnerType" | "workplacePartnerTypeSource"
>;

/** Org employee workplace from trusted context wins over stale personal agent pilot prefs. */
export function shouldDeferPersonalAgentPilotForOrgWorkplace(
  presentation: AgentPilotPresentationScope,
): boolean {
  return shouldPreferBusinessWorkplaceDispatch({
    proContextRole: presentation.proContext?.role ?? null,
    workplacePartnerType: presentation.workplacePartnerType,
    workplacePartnerTypeSource: presentation.workplacePartnerTypeSource,
  });
}
