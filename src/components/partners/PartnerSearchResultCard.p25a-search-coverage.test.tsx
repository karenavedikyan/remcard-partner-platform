import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PartnerSearchResult } from "@/lib/types";
import {
  PartnerSearchResultCard,
  searchResultCoverTone,
  searchResultInviteFoot,
  searchResultShowOpenHint,
  searchResultTypeLabel,
} from "./PartnerSearchResultCard";

vi.mock("@/components/partners/PartnerGeneralTermsDetails", () => ({
  PartnerGeneralTermsDetails: () => <div data-testid="agent-published-terms" />,
}));

const base = (overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult => ({
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
  ...overrides,
});

describe("PartnerSearchResultCard P25a search coverage (DTO enums)", () => {
  it.each([
    ["STORE", "Магазин", "store"],
    ["COMPANY", "Компания", "company"],
    ["MASTER", "Специалист", "specialist"],
    ["AGENT", "Агент", "agent"],
  ] as const)("maps %s to label and cover tone without renaming filter slugs", (partnerType, label, tone) => {
    const partner = base({ partnerType, partnerTypeLabel: label });
    expect(searchResultTypeLabel(partner)).toBe(label);
    expect(searchResultCoverTone(partner)).toBe(tone);
  });

  it("blocks invite when partnership status is active but keeps P19 cover/body shell", () => {
    render(
      <PartnerSearchResultCard
        partner={base({ partnershipStatus: "ACTIVE", partnerType: "AGENT", partnerTypeLabel: "Агент" })}
        title="Агент длинное имя для переноса на узком экране"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => undefined}
      />,
    );
    expect(screen.getByTestId("agent-partner-search-result-type")).toHaveTextContent("Агент");
    expect(screen.getByTestId("agent-partner-search-result-card")).toHaveAttribute("data-cover-tone", "agent");
    expect(screen.getByTestId("agent-partner-search-result-invite")).toBeDisabled();
    expect(screen.getByTestId("agent-partner-search-result-invite-blocked")).toHaveTextContent("Активно");
    expect(screen.queryByTestId("agent-partner-search-result-open-hint")).not.toBeInTheDocument();
  });

  it("shows open hint and enables invite for open profiles", async () => {
    const onInvite = vi.fn();
    render(
      <PartnerSearchResultCard
        partner={base()}
        title="Магазин"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={onInvite}
      />,
    );
    expect(screen.getByTestId("agent-partner-search-result-open-hint")).toHaveTextContent(
      "Открыт к партнёрству",
    );
    await userEvent.click(screen.getByTestId("agent-partner-search-result-invite"));
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it("respects external disabled and busy without sending invite", () => {
    expect(searchResultInviteFoot(base(), { inviteDisabled: true }).disabled).toBe(true);
    expect(searchResultInviteFoot(base(), { inviteBusy: true }).label).toBe("Отправка…");
    expect(searchResultShowOpenHint(base({ partnershipStatus: "PENDING" }))).toBe(false);
  });
});
