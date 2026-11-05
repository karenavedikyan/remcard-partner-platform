import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";

export type WorkplacePartnerType = "STORE" | "COMPANY";

/** Serializable snapshot passed from server shell to client nav chrome. */
export type WorkplacePartnerTypeSource = "org-context" | "personal-profile" | null;

export type CabinetPresentationSnapshot = {
  contextReady: boolean;
  contextHttpStatus: number | null;
  proContext: ProContextSnapshot | null;
  workplacePartnerType: WorkplacePartnerType | null;
  workplacePartnerTypeSource: WorkplacePartnerTypeSource;
  /** Actor (authenticated user) display name — never the org owner impersonation. */
  actorDisplayName: string;
  /** Organization / employer label for workspace chrome. */
  workspaceOrganizationName: string | null;
  sessionRoleLabel: string;
  navMode: import("@/lib/cabinet-nav/mode").CabinetNavMode;
};
