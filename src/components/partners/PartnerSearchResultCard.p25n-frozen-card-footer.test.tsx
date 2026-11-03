import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  PartnerSearchResultCard,
  searchResultPublicPartnerDetailUrl,
  searchResultShowPublicDetailLink,
} from "./PartnerSearchResultCard";
import type { PartnerSearchResult } from "@/lib/types";

vi.mock("@/lib/auth-config", () => ({
  getLegalSiteUrl: () => "https://remcard.ru",
}));

vi.mock("@/components/partners/PartnerSearchResultInlineTerms", () => ({
  PartnerSearchResultInlineTerms: () => <div data-testid="agent-inline-terms" />,
}));

const css = readFileSync(path.join(__dirname, "PartnerSearchResultCard.module.css"), "utf8");

const openPartner = (overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult => ({
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

describe("PartnerSearchResultCard P25n frozen card footer", () => {
  it("builds canonical public detail URL from search id (not in-hub modal)", () => {
    expect(searchResultPublicPartnerDetailUrl(openPartner())).toBe(
      "https://remcard.ru/partner/frozen-demo-light-open",
    );
    expect(searchResultPublicPartnerDetailUrl(openPartner({ isPublic: false }))).toBeNull();
    expect(searchResultShowPublicDetailLink(openPartner({ isPublic: false }))).toBe(false);
  });

  it("scopes foot layout: space-between, ghost detail link, ≥44px targets", () => {
    expect(css).toMatch(/\.modalResultFoot\s*\{[^}]*justify-content:\s*space-between/s);
    expect(css).toContain(".modalResultFootDetailLink");
    expect(css).toMatch(
      /\.modalResultFootDetailLink\s*\{[^}]*min-height:\s*44px/s,
    );
    expect(css).toMatch(
      /\.modalResultFoot\s*:global\(button\)\s*\{[^}]*min-height:\s*44px/s,
    );
  });

  it("renders Подробнее + Сотрудничать for open partnership foot", async () => {
    const onInvite = vi.fn();
    render(
      <PartnerSearchResultCard
        partner={openPartner()}
        title="Студия света"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={onInvite}
      />,
    );
    const detail = screen.getByTestId("agent-partner-search-result-detail");
    expect(detail).toHaveTextContent("Подробнее");
    expect(detail).toHaveAttribute("href", "https://remcard.ru/partner/frozen-demo-light-open");
    expect(detail).toHaveAttribute("target", "_blank");

    const invite = screen.getByTestId("agent-partner-search-result-invite");
    expect(invite).toHaveTextContent("Сотрудничать");
    await userEvent.click(invite);
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it("hides Подробнее when catalog row is not public but keeps invite", () => {
    render(
      <PartnerSearchResultCard
        partner={openPartner({ isPublic: false })}
        title="Скрытый"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => {}}
      />,
    );
    expect(screen.queryByTestId("agent-partner-search-result-detail")).toBeNull();
    expect(screen.getByTestId("agent-partner-search-result-invite")).toBeInTheDocument();
  });

  it("uses legacy public anchor when onDetail is omitted", () => {
    render(
      <PartnerSearchResultCard
        partner={openPartner()}
        title="Студия света"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => {}}
      />,
    );
    const detail = screen.getByTestId("agent-partner-search-result-detail");
    expect(detail.tagName).toBe("A");
    expect(detail).toHaveAttribute("href", "https://remcard.ru/partner/frozen-demo-light-open");
  });

  it("does not show enabled invite when partnership status occupies foot", () => {
    render(
      <PartnerSearchResultCard
        partner={openPartner({ partnershipStatus: "ACTIVE", isPublic: true })}
        title="Студия света"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => {}}
      />,
    );
    expect(screen.queryByTestId("agent-partner-search-result-invite")).toBeNull();
    expect(screen.getByTestId("agent-partner-search-result-status")).toBeInTheDocument();
  });

  it("keeps Подробнее with ACTIVE/PENDING status for in-hub callback (audit: detail access without duplicate invite)", async () => {
    const onDetail = vi.fn();
    const { rerender } = render(
      <PartnerSearchResultCard
        partner={openPartner({ partnershipStatus: "ACTIVE" })}
        title="Студия"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => {}}
        onDetail={onDetail}
      />,
    );
    expect(screen.getByTestId("agent-partner-search-result-detail")).toHaveTextContent("Подробнее");
    expect(screen.queryByTestId("agent-partner-search-result-invite")).toBeNull();
    await userEvent.click(screen.getByTestId("agent-partner-search-result-detail"));
    expect(onDetail).toHaveBeenCalledTimes(1);

    rerender(
      <PartnerSearchResultCard
        partner={openPartner({ partnershipStatus: "PENDING" })}
        title="Студия"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => {}}
        onDetail={onDetail}
      />,
    );
    expect(screen.getByTestId("agent-partner-search-result-detail")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-partner-search-result-invite")).toBeNull();
  });

  it("keeps legacy public Подробнее anchor with ACTIVE when onDetail omitted", () => {
    render(
      <PartnerSearchResultCard
        partner={openPartner({ partnershipStatus: "ACTIVE" })}
        title="Студия"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => {}}
      />,
    );
    const detail = screen.getByTestId("agent-partner-search-result-detail");
    expect(detail.tagName).toBe("A");
    expect(detail).toHaveAttribute("href", "https://remcard.ru/partner/frozen-demo-light-open");
    expect(screen.queryByTestId("agent-partner-search-result-invite")).toBeNull();
  });
});
