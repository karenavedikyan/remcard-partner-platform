import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PartnerSearchResultCard } from "./PartnerSearchResultCard";
import type { PartnerSearchResult } from "@/lib/types";

const base = (overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult => ({
  id: "p-1",
  displayName: "Студия",
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
  workingProductLabels: ["Свет"],
  workingServiceLabels: [],
  workingStageLabels: [],
  ...overrides,
});

describe("PartnerSearchResultCard P25h status in footer (frozen pr-card-foot pill slot)", () => {
  it("keeps partnership status out of the cover band", () => {
    render(
      <PartnerSearchResultCard
        partner={base({ partnershipStatus: "ACTIVE" })}
        title="Студия"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => undefined}
      />,
    );
    const card = screen.getByTestId("agent-partner-search-result-card");
    const cover = screen.getByTestId("agent-partner-search-result-type").parentElement;
    expect(cover).toBeTruthy();
    expect(within(cover!).queryByTestId("agent-partner-search-result-status")).toBeNull();
    expect(screen.getByTestId("agent-partner-search-result-status")).toBeInTheDocument();
  });

  it("renders ACTIVE and PENDING as footer status badge without duplicate foot note", () => {
    const { rerender } = render(
      <PartnerSearchResultCard
        partner={base({ partnershipStatus: "ACTIVE", partnerType: "COMPANY", partnerTypeLabel: "Компания" })}
        title="Юг"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => undefined}
      />,
    );
    const foot = screen.getByTestId("agent-partner-search-result-foot");
    expect(screen.getByTestId("agent-partner-search-result-status")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-partner-search-result-invite")).toBeNull();
    expect(screen.queryByTestId("agent-partner-search-result-invite-blocked")).toBeNull();
    expect(within(foot).getByText("Активно")).toBeInTheDocument();

    rerender(
      <PartnerSearchResultCard
        partner={base({ partnershipStatus: "PENDING", partnerType: "MASTER", partnerTypeLabel: "Специалист" })}
        title="Электро"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => undefined}
      />,
    );
    expect(screen.getByTestId("agent-partner-search-result-status")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-partner-search-result-invite")).toBeNull();
    expect(within(foot).getByText("Согласование")).toBeInTheDocument();
  });

  it("keeps open invite control at ≥44px when no blocking status", () => {
    render(
      <PartnerSearchResultCard
        partner={base()}
        title="Студия"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => undefined}
      />,
    );
    expect(screen.queryByTestId("agent-partner-search-result-status")).toBeNull();
    expect(screen.getByTestId("agent-partner-search-result-invite")).toBeEnabled();
  });
});
