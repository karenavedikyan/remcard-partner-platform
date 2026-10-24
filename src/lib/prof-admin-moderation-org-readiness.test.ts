import { describe, expect, it } from "vitest";
import {
  moderationOrgServerReadiness,
  validateOrgCatalogForModeration,
} from "@/lib/prof-admin-moderation-org-readiness";
import type { ModerationOrgDetail } from "@/lib/prof-admin-moderation-org-display";

function org(partial: Partial<ModerationOrgDetail>): ModerationOrgDetail {
  return {
    id: "o",
    name: "Org",
    partnerType: "COMPANY",
    catalogStatus: "PENDING",
    catalogPublished: false,
    ownerId: "u",
    ownerPublicId: "p",
    isTestPartner: false,
    profTestPublicCatalogAllowed: null,
    pendingBranchesCount: 1,
    hasSubmittedDiff: false,
    revisionToken: "t",
    submitted: { storeCategories: [], specializations: [], navigatorStageIds: [] },
    live: {},
    publicContacts: [],
    branches: [{ id: "b", catalogStatus: "PENDING", submitted: {}, hasSubmittedDiff: false }],
    ...partial,
  };
}

describe("validateOrgCatalogForModeration parity", () => {
  it("allows service-only company", () => {
    const errors = validateOrgCatalogForModeration({
      name: "Co",
      branchCount: 1,
      storeCategories: [],
      specializations: ["plumbing"],
      navigatorStageIds: ["L1-7"],
    });
    expect(errors).toEqual([]);
  });

  it("allows product-only store", () => {
    const errors = validateOrgCatalogForModeration({
      name: "Shop",
      branchCount: 1,
      storeCategories: ["wallpaper"],
      specializations: [],
      navigatorStageIds: ["L1-9"],
    });
    expect(errors).toEqual([]);
  });

  it("requires valid renovation stage", () => {
    const errors = validateOrgCatalogForModeration({
      name: "Shop",
      branchCount: 1,
      storeCategories: ["wallpaper"],
      specializations: [],
      navigatorStageIds: ["bad"],
    });
    expect(errors.some((e) => e.includes("этап"))).toBe(true);
  });

  it("requires at least one branch", () => {
    const items = moderationOrgServerReadiness(
      org({
        branches: [],
        submitted: { storeCategories: ["a"], specializations: [], navigatorStageIds: ["L1-7"] },
      }),
    );
    expect(items.some((i) => i.level === "required" && i.text.includes("филиал"))).toBe(true);
  });
});
