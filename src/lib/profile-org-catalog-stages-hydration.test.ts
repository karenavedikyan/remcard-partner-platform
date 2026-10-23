import { describe, expect, it } from "vitest";
import { orgCatalogNavigatorStageIdsFromProfile } from "./profile-org-catalog-stages-hydration";
import type { ProProfileResponse } from "@/lib/types";

describe("orgCatalogNavigatorStageIdsFromProfile", () => {
  it("reads publicNavigatorStageIds from organization DTO", () => {
    const profile = {
      organization: {
        publicNavigatorStageIds: ["L1-7", "L1-1"],
      },
    } as ProProfileResponse;
    expect(orgCatalogNavigatorStageIdsFromProfile(profile)).toEqual(["L1-7", "L1-1"]);
  });

  it("falls back to catalogDraft navigatorStageIds", () => {
    const profile = {
      organization: {
        catalogDraft: { navigatorStageIds: ["L1-3"] },
      },
    } as ProProfileResponse;
    expect(orgCatalogNavigatorStageIdsFromProfile(profile)).toEqual(["L1-3"]);
  });
});
