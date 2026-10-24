import { describe, expect, it } from "vitest";
import {
  moderationPartnerPublicVisibility,
  type ModerationPartnerDetail,
} from "./prof-admin-moderation-partner-display";

function basePartner(overrides: Partial<ModerationPartnerDetail> = {}): ModerationPartnerDetail {
  return {
    id: "u1",
    publicId: "RC-1",
    partnerType: "MASTER",
    catalogStatus: "APPROVED",
    isPublic: true,
    isTestPartner: false,
    profTestPublicCatalogAllowed: null,
    rejectionReason: null,
    hasSubmittedDiff: false,
    revisionToken: "rev",
    submitted: {},
    live: { isPublic: true, displayName: "Live", city: "City", description: "d" },
    portfolioItems: [],
    services: [],
    moderationNotes: [],
    ...overrides,
  };
}

describe("moderationPartnerPublicVisibility", () => {
  it("non-test approved live is visible in catalog", () => {
    const v = moderationPartnerPublicVisibility(basePartner());
    expect(v.liveSnapshotPublished).toBe(true);
    expect(v.catalogPubliclyVisible).toBe(true);
    expect(v.catalogVisibilityHeadline).toBe("Видна");
  });

  it("test partner with live snapshot but opt-in false: saved live, hidden in catalog", () => {
    const v = moderationPartnerPublicVisibility(
      basePartner({
        isTestPartner: true,
        profTestPublicCatalogAllowed: false,
        live: { isPublic: true, displayName: "T", city: "K", description: null },
      }),
    );
    expect(v.liveSnapshotPublished).toBe(true);
    expect(v.catalogPubliclyVisible).toBe(false);
    expect(v.testOptIn).toBe(false);
    expect(v.catalogVisibilityHeadline).toBe("Скрыта");
  });

  it("test partner after opt-in is visible when live published", () => {
    const v = moderationPartnerPublicVisibility(
      basePartner({
        isTestPartner: true,
        profTestPublicCatalogAllowed: true,
      }),
    );
    expect(v.catalogPubliclyVisible).toBe(true);
    expect(v.testOptIn).toBe(true);
  });

  it("rejected catalog status: no live snapshot in catalog rules", () => {
    const v = moderationPartnerPublicVisibility(
      basePartner({
        catalogStatus: "REJECTED",
        live: { isPublic: true, displayName: "X", city: null, description: null },
      }),
    );
    expect(v.liveSnapshotPublished).toBe(false);
    expect(v.catalogPubliclyVisible).toBe(false);
  });
});
