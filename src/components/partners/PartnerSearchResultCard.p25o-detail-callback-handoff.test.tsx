import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PartnerSearchResultCard } from "./PartnerSearchResultCard";
import type { PartnerSearchResult } from "@/lib/types";

vi.mock("@/lib/auth-config", () => ({
  getLegalSiteUrl: () => "https://remcard.ru",
}));

vi.mock("@/components/partners/PartnerSearchResultInlineTerms", () => ({
  PartnerSearchResultInlineTerms: () => null,
}));

const partner = (overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult => ({
  id: "frozen-demo-light-open",
  displayName: "Студия света",
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
  isPublic: true,
  ...overrides,
});

describe("PartnerSearchResultCard P25o onDetail handoff", () => {
  it("invokes onDetail exactly once on click and Enter; no href navigation", async () => {
    const onDetail = vi.fn();
    const onInvite = vi.fn();
    const user = userEvent.setup();

    render(
      <PartnerSearchResultCard
        partner={partner()}
        title="Студия света"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={onInvite}
        onDetail={onDetail}
      />,
    );

    const detail = screen.getByTestId("agent-partner-search-result-detail");
    expect(detail.tagName).toBe("BUTTON");
    expect(detail).not.toHaveAttribute("href");

    await user.click(detail);
    expect(onDetail).toHaveBeenCalledTimes(1);

    detail.focus();
    await user.keyboard("{Enter}");
    expect(onDetail).toHaveBeenCalledTimes(2);

    const invite = screen.getByTestId("agent-partner-search-result-invite");
    await user.click(invite);
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it("shows Подробнее for isPublic:false only when onDetail is provided", () => {
    const onDetail = vi.fn();
    const { rerender } = render(
      <PartnerSearchResultCard
        partner={partner({ isPublic: false })}
        title="Скрытый"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => {}}
      />,
    );
    expect(screen.queryByTestId("agent-partner-search-result-detail")).toBeNull();

    rerender(
      <PartnerSearchResultCard
        partner={partner({ isPublic: false })}
        title="Скрытый"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => {}}
        onDetail={onDetail}
      />,
    );
    expect(screen.getByTestId("agent-partner-search-result-detail")).toBeInTheDocument();
  });

  it("passes selected row identity only via parent closure (partner.id unchanged in DOM)", () => {
    const seen: string[] = [];
    render(
      <PartnerSearchResultCard
        partner={partner({ id: "row-abc" })}
        title="T"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => {}}
        onDetail={() => {
          seen.push("row-abc");
        }}
      />,
    );
    expect(screen.getByTestId("agent-partner-search-result-detail")).toBeInTheDocument();
    screen.getByTestId("agent-partner-search-result-detail").click();
    expect(seen).toEqual(["row-abc"]);
    expect(screen.getByTestId("agent-partner-search-result-card")).toHaveAttribute(
      "data-partner-id",
      "row-abc",
    );
  });
});
