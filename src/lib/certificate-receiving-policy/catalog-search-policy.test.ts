import { describe, expect, it } from "vitest";
import {
  partnerSearchInlineTermsVariant,
  shouldRenderPartnerSearchInlineTermsPanel,
  shouldShowPublicCertificatePolicyInPartnerSearch,
} from "./catalog-search-policy";

describe("shouldShowPublicCertificatePolicyInPartnerSearch", () => {
  it("enables public certificate policy for STORE/COMPANY/MASTER owners", () => {
    expect(
      shouldShowPublicCertificatePolicyInPartnerSearch(
        { role: "PRO", partnerType: "STORE", partnerActivities: ["STORE"] },
        "pro",
      ),
    ).toBe(true);
    expect(
      shouldShowPublicCertificatePolicyInPartnerSearch(
        { role: "PRO", partnerType: "COMPANY", partnerActivities: ["SERVICE"] },
        "store",
      ),
    ).toBe(true);
    expect(
      shouldShowPublicCertificatePolicyInPartnerSearch(
        { role: "PRO", partnerType: "MASTER", partnerActivities: [] },
        "pro",
      ),
    ).toBe(true);
  });

  it("keeps agent inviter eligible without replacing agent financial gate", () => {
    expect(
      shouldShowPublicCertificatePolicyInPartnerSearch(
        { role: "PRO", partnerType: "COMPANY", partnerActivities: ["AGENT"] },
        "store",
      ),
    ).toBe(true);
  });

  it("does not enable for CLIENT or unrelated PRO without business type", () => {
    expect(
      shouldShowPublicCertificatePolicyInPartnerSearch(
        { role: "CLIENT", partnerType: "STORE", partnerActivities: ["STORE"] },
        "pro",
      ),
    ).toBe(false);
  });
});

describe("shouldRenderPartnerSearchInlineTermsPanel", () => {
  it("renders when either agent financial or public policy gate is on", () => {
    expect(
      shouldRenderPartnerSearchInlineTermsPanel({
        showAgentPublishedTerms: false,
        showPublicCertificatePolicy: true,
      }),
    ).toBe(true);
    expect(
      shouldRenderPartnerSearchInlineTermsPanel({
        showAgentPublishedTerms: true,
        showPublicCertificatePolicy: false,
      }),
    ).toBe(true);
    expect(
      shouldRenderPartnerSearchInlineTermsPanel({
        showAgentPublishedTerms: false,
        showPublicCertificatePolicy: false,
      }),
    ).toBe(false);
  });
});

describe("partnerSearchInlineTermsVariant", () => {
  it("uses public-certificate variant for non-agent store owner", () => {
    expect(partnerSearchInlineTermsVariant(false)).toBe("public-certificate");
    expect(partnerSearchInlineTermsVariant(true)).toBe("agent-financial");
  });
});