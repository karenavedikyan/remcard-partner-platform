import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";

export type WorkplacePartnerType = "STORE" | "COMPANY";

/** Partner type of the workplace the user is working in (owner or employee), for chrome and shell choice. */
export type WorkplaceKind = "STORE" | "COMPANY" | "MASTER" | "AGENT";

export type WorkplaceKindSource = "org-context" | "employer-context" | "personal-profile" | null;

/** Serializable snapshot passed from server shell to client nav chrome. */
export type WorkplacePartnerTypeSource = "org-context" | "personal-profile" | null;

export type CabinetPresentationSnapshot = {
  contextReady: boolean;
  contextHttpStatus: number | null;
  proContext: ProContextSnapshot | null;
  workplacePartnerType: WorkplacePartnerType | null;
  workplacePartnerTypeSource: WorkplacePartnerTypeSource;
  /** Optional for hand-built snapshots; always set by `resolveCabinetPresentation`. */
  workplaceKind?: WorkplaceKind | null;
  workplaceKindSource?: WorkplaceKindSource;
  /** Actor (authenticated user) display name — never the org owner impersonation. */
  actorDisplayName: string;
  /** Organization / employer label for workspace chrome. */
  workspaceOrganizationName: string | null;
  sessionRoleLabel: string;
  navMode: import("@/lib/cabinet-nav/mode").CabinetNavMode;
};
