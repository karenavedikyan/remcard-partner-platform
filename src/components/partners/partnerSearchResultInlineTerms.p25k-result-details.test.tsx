import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PartnerSearchResultInlineTerms } from "./PartnerSearchResultInlineTerms";
import {
  PARTNER_SEARCH_INLINE_ZERO_PERCENT_NOTE,
  formatPartnerSearchInlineTermLine,
  partnerSearchInlinePercentHeadline,
  resetPartnerSearchInlineTermsCache,
} from "./partnerSearchResultInlineTerms";
import { searchResultInviteFoot } from "./PartnerSearchResultCard";
import type { PartnerSearchResult } from "@/lib/types";

vi.mock("./partnerSearchResultInlineTerms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./partnerSearchResultInlineTerms")>();
  return {
    ...actual,
    readPartnerCertificateProgramForSearchCard: vi.fn(),
  };
});

import { readPartnerCertificateProgramForSearchCard } from "./partnerSearchResultInlineTerms";

describe("P25k result inline terms presentation", () => {
  beforeEach(() => {
    resetPartnerSearchInlineTermsCache();
    vi.mocked(readPartnerCertificateProgramForSearchCard).mockReset();
  });

  it("shows zero-percent note aligned with PartnerGeneralTermsDetails", () => {
    const line = formatPartnerSearchInlineTermLine({
      category: "doors",
      categoryLabel: "Двери",
      poolPercent: 0,
    });
    expect(line.percentText).toBe(`0%${PARTNER_SEARCH_INLINE_ZERO_PERCENT_NOTE}`);
    expect(partnerSearchInlinePercentHeadline([{ category: "d", categoryLabel: "D", poolPercent: 0 }])).toBe(
      "0%",
    );
  });

  it("marks missing pool percent unavailable instead of inventing zero", () => {
    const line = formatPartnerSearchInlineTermLine({
      category: "x",
      categoryLabel: "Без процента",
      poolPercent: Number.NaN,
    });
    expect(line.percentText).toBeNull();
    expect(line.percentUnavailable).toBe(true);
    expect(partnerSearchInlinePercentHeadline([{ category: "x", categoryLabel: "X", poolPercent: Number.NaN }])).toBeNull();
  });

  it("renders unavailable copy in the inline list", async () => {
    vi.mocked(readPartnerCertificateProgramForSearchCard).mockResolvedValue({
      status: "loaded",
      items: [
        { category: "a", categoryLabel: "Категория с длинным названием для переноса на узком экране", poolPercent: 0 },
        { category: "b", categoryLabel: "Без процента", poolPercent: Number.NaN },
      ],
    });
    render(<PartnerSearchResultInlineTerms partnerUserId="p25k-zero-missing" />);
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-search-result-terms-summary")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("agent-partner-search-result-terms-percent-headline")).toHaveTextContent("0%");
    expect(screen.getByText(`0%${PARTNER_SEARCH_INLINE_ZERO_PERCENT_NOTE}`)).toBeInTheDocument();
    expect(screen.getByTestId("agent-partner-search-result-terms-percent-unavailable")).toHaveTextContent(
      "Нет данных",
    );
  });

  it("uses frozen find-card CTA label for open eligible profiles", () => {
    const open: PartnerSearchResult = {
      id: "p1",
      displayName: "Demo",
      city: "Краснодар",
      photoUrl: null,
      description: null,
      specializations: [],
      badges: [],
      storeCategories: [],
      branches: [],
      rating: null,
      ratingCount: 0,
      partnershipStatus: null,
      partnerType: "STORE",
      partnerTypeLabel: "Магазин",
    };
    expect(searchResultInviteFoot(open).label).toBe("Сотрудничать");
    expect(searchResultInviteFoot(open, { inviteDisabled: true }).label).toBe("Сотрудничать");
    expect(searchResultInviteFoot(open, { inviteBusy: true }).label).toBe("Отправка…");
  });
});
