import { describe, expect, it, vi } from "vitest";
import {
  catalogSubmitPublicationAllowed,
  processCatalogSubmitResult,
  profileWithOptimisticPendingCatalog,
} from "./catalog-submit-publication";
import type { ProProfileResponse } from "@/lib/types";

const orgProfile: ProProfileResponse = {
  organization: {
    id: "o1",
    name: "Shop",
    catalogStatus: "DRAFT",
    partnerType: "STORE",
    branchCount: 0,
  },
  programs: [],
  user: {
    id: "u1",
    publicId: "RC1",
    displayName: "Rep",
    city: "Краснодар",
    specializations: [],
    role: "PRO",
    partnerType: "STORE",
    catalogStatus: "DRAFT",
  },
} as ProProfileResponse;

describe("catalog-submit-publication", () => {
  it("blocks repeat submit while pending sync flag is set", () => {
    expect(catalogSubmitPublicationAllowed(orgProfile, false)).toBe(true);
    expect(catalogSubmitPublicationAllowed(orgProfile, true)).toBe(false);
  });

  it("applies optimistic PENDING on accepted submit with failed refresh", async () => {
    const refreshProfile = vi.fn().mockRejectedValue(new Error("network"));
    const outcome = await processCatalogSubmitResult({
      result: { submitAccepted: true, profile: null, refreshFailed: true },
      profileBeforeSubmit: orgProfile,
      successMessage: "ok",
      refreshProfile,
    });
    expect(outcome.submitAcceptedPendingSync).toBe(true);
    expect(outcome.profile?.organization?.catalogStatus).toBe("PENDING");
    expect(refreshProfile).toHaveBeenCalledTimes(1);
  });

  it("clears pending sync when refresh returns PENDING", async () => {
    const pendingProfile = profileWithOptimisticPendingCatalog(orgProfile);
    const refreshProfile = vi.fn().mockResolvedValue(pendingProfile);
    const outcome = await processCatalogSubmitResult({
      result: { submitAccepted: true, profile: null, refreshFailed: true },
      profileBeforeSubmit: orgProfile,
      successMessage: "ok",
      refreshProfile,
    });
    expect(outcome.submitAcceptedPendingSync).toBe(false);
    expect(outcome.errorMessage).toBeNull();
  });
});
