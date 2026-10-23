import { describe, expect, it } from "vitest";
import { orgCatalogNavigatorStageIdsFromProfile } from "./profile-org-catalog-stages-hydration";
import type { ProProfileResponse } from "@/lib/types";

describe("orgCatalogNavigatorStageIdsFromProfile", () => {
  it("draft key overrides publicNavigatorStageIds live overlay", () => {
    const profile = {
      organization: {
        publicNavigatorStageIds: ["L1-1"],
        catalogDraft: { navigatorStageIds: ["L1-7"] },
      },
    } as ProProfileResponse;
    expect(orgCatalogNavigatorStageIdsFromProfile(profile)).toEqual(["L1-7"]);
  });

  it("explicit draft [] overrides live", () => {
    const profile = {
      organization: {
        publicNavigatorStageIds: ["L1-1"],
        catalogDraft: { navigatorStageIds: [] },
      },
    } as ProProfileResponse;
    expect(orgCatalogNavigatorStageIdsFromProfile(profile)).toEqual([]);
  });

  it("falls back to publicNavigatorStageIds when draft key absent", () => {
    const profile = {
      organization: {
        publicNavigatorStageIds: ["L1-3"],
        catalogDraft: { catalogTouched: { navigatorStageIds: true } },
      },
    } as ProProfileResponse;
    expect(orgCatalogNavigatorStageIdsFromProfile(profile)).toEqual(["L1-3"]);
  });
});
