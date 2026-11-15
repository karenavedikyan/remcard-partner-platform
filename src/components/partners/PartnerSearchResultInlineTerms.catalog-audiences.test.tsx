import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PartnerSearchResultInlineTerms } from "./PartnerSearchResultInlineTerms";
import * as inlineTerms from "./partnerSearchResultInlineTerms";

describe("PartnerSearchResultInlineTerms catalog audiences", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("STORE owner public variant shows policy chips without agent pool list", async () => {
    vi.spyOn(inlineTerms, "readPartnerCertificateProgramForSearchCard").mockResolvedValue({
      status: "loaded",
      items: [{ category: "doors", categoryLabel: "Двери", poolPercent: 15 }],
      truncated: false,
      policy: {
        validityDays: 30,
        purchaseLimit: 2,
        minimumPurchaseAmount: null,
        promotionsCompatible: false,
        exclusionsText: null,
        items: [],
      },
    });

    render(<PartnerSearchResultInlineTerms partnerUserId="store-target" variant="public-certificate" />);

    expect(await screen.findByTestId("partner-search-public-certificate-policy-panel")).toBeInTheDocument();
    expect(screen.getByText("Условия приёма сертификата")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-partner-search-result-terms-percent-headline")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-partner-search-result-terms-percent")).not.toBeInTheDocument();
    expect(screen.getByTestId("cp-directory-store-target")).toBeInTheDocument();
  });

  it("agent financial variant keeps pool headline and category rows", async () => {
    vi.spyOn(inlineTerms, "readPartnerCertificateProgramForSearchCard").mockResolvedValue({
      status: "loaded",
      items: [{ category: "doors", categoryLabel: "Двери", poolPercent: 15 }],
      truncated: false,
      policy: {
        validityDays: 30,
        purchaseLimit: 1,
        minimumPurchaseAmount: null,
        promotionsCompatible: false,
        exclusionsText: null,
        items: [],
      },
    });

    render(<PartnerSearchResultInlineTerms partnerUserId="agent-target" variant="agent-financial" />);

    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-search-result-terms-percent-headline")).toHaveTextContent("15%"),
    );
    expect(screen.getByTestId("agent-partner-search-result-terms-percent")).toBeInTheDocument();
  });

  it("public variant empty categories without policy uses empty copy", async () => {
    vi.spyOn(inlineTerms, "readPartnerCertificateProgramForSearchCard").mockResolvedValue({
      status: "empty",
    });

    render(<PartnerSearchResultInlineTerms partnerUserId="empty-store" variant="public-certificate" />);

    expect(await screen.findByTestId("partner-search-public-certificate-policy-empty")).toHaveTextContent(
      /не опубликовал условия приёма/,
    );
  });
});