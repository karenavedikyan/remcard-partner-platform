import { describe, expect, it } from "vitest";
import {
  isOverviewCurrentEmpty,
  parsePartnershipListPayload,
  resolvePartnersEmptyPresentation,
  shouldPinOverviewLegacyChrome,
  shouldShowApprovedPartnersGreeting,
} from "./partners-overview-greeting";

describe("partners-overview-greeting", () => {
  it("parsePartnershipListPayload rejects missing or non-array partnerships", () => {
    expect(parsePartnershipListPayload(null).ok).toBe(false);
    expect(parsePartnershipListPayload({}).ok).toBe(false);
    expect(parsePartnershipListPayload({ partnerships: null }).ok).toBe(false);
    expect(parsePartnershipListPayload({ partnerships: [] }).ok).toBe(true);
  });

  it("shows greeting only when list is ready and all overview groups are zero", () => {
    expect(
      shouldShowApprovedPartnersGreeting({
        loading: false,
        error: "",
        listReady: true,
        counts: { active: 0, decisions: 0, outgoing: 0 },
      }),
    ).toBe(true);
    expect(
      shouldShowApprovedPartnersGreeting({
        loading: false,
        error: "",
        listReady: true,
        counts: { active: 1, decisions: 0, outgoing: 0 },
      }),
    ).toBe(false);
    expect(
      shouldShowApprovedPartnersGreeting({
        loading: true,
        error: "",
        listReady: true,
        counts: { active: 0, decisions: 0, outgoing: 0 },
      }),
    ).toBe(false);
  });

  it("isOverviewCurrentEmpty mirrors tile zero state", () => {
    expect(isOverviewCurrentEmpty({ active: 0, decisions: 0, outgoing: 0 })).toBe(true);
    expect(isOverviewCurrentEmpty({ active: 0, decisions: 1, outgoing: 0 })).toBe(false);
  });

  it("resolvePartnersEmptyPresentation separates true empty from history", () => {
    expect(
      resolvePartnersEmptyPresentation({
        partnerships: [],
        isActiveSegment: () => true,
      }).greetingVariant,
    ).toBe("true-empty");
    expect(
      resolvePartnersEmptyPresentation({
        partnerships: [{ status: "ENDED" }],
        isActiveSegment: (s) => s === "ACTIVE" || s === "PAUSED",
      }),
    ).toMatchObject({
      greetingVariant: "history",
      hasArchivedOrHiddenActive: false,
    });
    expect(
      resolvePartnersEmptyPresentation({
        partnerships: [
          {
            status: "ACTIVE",
            listPreference: { archivedAt: "2026-01-01T00:00:00Z", hiddenAt: null },
          },
        ],
        isActiveSegment: (s) => s === "ACTIVE" || s === "PAUSED",
      }).hasArchivedOrHiddenActive,
    ).toBe(true);
  });

  it("shouldPinOverviewLegacyChrome covers bulk outcome and archive view", () => {
    expect(
      shouldPinOverviewLegacyChrome({
        bulkOutcomePresent: true,
        selectedPartnerCount: 0,
        listArchiveView: "active",
        listFiltersEngaged: false,
        termsDeepLinkId: null,
        termsDeepLinkResolving: false,
        lifecycleConfirmOpen: false,
        termEditingActive: false,
      }),
    ).toBe(true);
    expect(
      shouldPinOverviewLegacyChrome({
        bulkOutcomePresent: false,
        selectedPartnerCount: 0,
        listArchiveView: "archive",
        listFiltersEngaged: false,
        termsDeepLinkId: null,
        termsDeepLinkResolving: false,
        lifecycleConfirmOpen: false,
        termEditingActive: false,
      }),
    ).toBe(true);
    expect(
      shouldPinOverviewLegacyChrome({
        bulkOutcomePresent: false,
        selectedPartnerCount: 0,
        listArchiveView: "active",
        listFiltersEngaged: false,
        termsDeepLinkId: null,
        termsDeepLinkResolving: false,
        lifecycleConfirmOpen: false,
        termEditingActive: false,
      }),
    ).toBe(false);
  });
});
