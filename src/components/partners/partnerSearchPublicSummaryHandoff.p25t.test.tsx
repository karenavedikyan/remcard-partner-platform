import { describe, expect, it } from "vitest";
import type { PartnerCertProgramState } from "@/lib/partner-certificate-program";
import {
  agentTermsSnapshotForDetailHandoff,
  publicSummaryComparableFields,
  publicSummaryFieldsMatchCardAndDetail,
  publicSummarySnapshotIdentity,
  shouldApplyPublicSummaryHandoffUpdate,
  showAgentTermsForFindDetailHandoff,
} from "./partnerSearchPublicSummaryHandoff";

describe("partnerSearchPublicSummaryHandoff P25t", () => {
  it("maps parent showAgentPublishedTerms to detail showAgentTerms", () => {
    expect(showAgentTermsForFindDetailHandoff(true)).toBe(true);
    expect(showAgentTermsForFindDetailHandoff(false)).toBe(false);
  });

  it("returns snapshot only for matching partner when card summary is resolved", () => {
    const map = new Map<string, PartnerCertProgramState>([
      ["a", { status: "loaded", items: [{ category: "x", categoryLabel: "A", poolPercent: 10 }] }],
      ["b", { status: "loading" }],
      ["c", { status: "error", message: "502" }],
    ]);
    expect(agentTermsSnapshotForDetailHandoff("a", map)?.status).toBe("loaded");
    expect(agentTermsSnapshotForDetailHandoff("b", map)).toBeUndefined();
    expect(agentTermsSnapshotForDetailHandoff("c", map)).toBeUndefined();
  });

  it("distinguishes 0% from null / no-data fingerprints", () => {
    const zero: PartnerCertProgramState = {
      status: "loaded",
      items: [{ category: "z", categoryLabel: "Z", poolPercent: 0 }],
    };
    const nan: PartnerCertProgramState = {
      status: "loaded",
      items: [{ category: "z", categoryLabel: "Z", poolPercent: Number.NaN }],
    };
    expect(publicSummarySnapshotIdentity("p", zero)).not.toBe(publicSummarySnapshotIdentity("p", nan));
    const zeroFields = publicSummaryComparableFields("p", zero);
    const nanFields = publicSummaryComparableFields("p", nan);
    expect(zeroFields.firstRowPercentText).toBe("0%");
    expect(nanFields.firstRowPercentUnavailable).toBe(true);
    expect(nanFields.firstRowPercentText).toBeNull();
  });

  it("matches card and detail comparable fields for same entity", () => {
    const state: PartnerCertProgramState = {
      status: "loaded",
      items: [{ category: "light", categoryLabel: "Освещение", poolPercent: 10 }],
    };
    const card = publicSummaryComparableFields("row-1", state);
    const detail = publicSummaryComparableFields("row-1", state);
    expect(publicSummaryFieldsMatchCardAndDetail(card, detail)).toBe(true);
    expect(publicSummaryFieldsMatchCardAndDetail(card, { ...detail, partnerUserId: "other" })).toBe(false);
  });

  it("rejects stale handoff updates after lifecycle generation bump (A under B)", () => {
    expect(shouldApplyPublicSummaryHandoffUpdate("b", "a", 2, 1)).toBe(false);
    expect(shouldApplyPublicSummaryHandoffUpdate("b", "b", 2, 2)).toBe(true);
    expect(shouldApplyPublicSummaryHandoffUpdate("b", "a", 2, 2)).toBe(false);
  });
});
