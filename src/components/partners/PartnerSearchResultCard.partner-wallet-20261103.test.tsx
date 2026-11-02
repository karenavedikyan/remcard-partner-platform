import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PartnerSearchResult } from "@/lib/types";
import {
  PartnerSearchResultCard,
  findDirectoryDetailInviteLabel,
  searchResultCardStagesLine,
  searchResultDetailCatalogLine,
  searchResultDirectionGroups,
} from "./PartnerSearchResultCard";
import { PartnerFindDirectoryDetailShell } from "./PartnerFindDirectoryDetailShell";

vi.mock("@/components/partners/PartnerSearchResultInlineTerms", () => ({
  PartnerSearchResultInlineTerms: () => <div data-testid="agent-inline-terms" />,
}));

const css = readFileSync(path.join(__dirname, "PartnerSearchResultCard.module.css"), "utf8");

const base = (overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult => ({
  id: "p-card",
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
  workingProductLabels: ["Плитка"],
  workingServiceLabels: ["Ремонт"],
  workingStageLabels: ["S1", "S2", "S3", "S4"],
  ...overrides,
});

describe("partner-wallet-20261103 card parity", () => {
  it("orders services before products in card directions", () => {
    const { primary } = searchResultDirectionGroups(
      base({ workingProductLabels: ["Плитка"], workingServiceLabels: ["Ремонт"] }),
    );
    expect(primary[0]).toBe("Ремонт");
    expect(primary[1]).toBe("Плитка");
  });

  it("always renders stage line with fallback and overflow count", () => {
    expect(searchResultCardStagesLine(base({ workingStageLabels: [] }))).toBe(
      "Этапы ремонта не указаны",
    );
    expect(searchResultCardStagesLine(base())).toBe("S1 · S2 · S3 и ещё 1");
    render(
      <PartnerSearchResultCard
        partner={base({ workingStageLabels: [] })}
        title="Demo"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => undefined}
      />,
    );
    expect(screen.getByTestId("agent-partner-search-result-stages")).toHaveTextContent(
      "Этапы ремонта не указаны",
    );
  });

  it("uses stacked left-aligned pr-terms heading tokens and tabular percent cells", () => {
    expect(css).toMatch(/\.modalResultInlineTermsHead\s*\{[^}]*display:\s*grid;/s);
    expect(css).toMatch(/\.modalResultInlineTermsRange\s*\{[^}]*text-align:\s*left;/s);
    expect(css).toMatch(/\.modalResultInlineTermsRange strong\s*\{[^}]*font-size:\s*27px;/s);
    expect(css).toMatch(/\.modalResultInlineTermsList li b\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s);
  });
});

describe("partner-wallet-20261103 detail shell parity", () => {
  it("uses Предложить сотрудничество for open invite while card helper stays Сотрудничать", () => {
    const partner = base();
    expect(findDirectoryDetailInviteLabel(partner)).toBe("Предложить сотрудничество");
    render(
      <PartnerFindDirectoryDetailShell partner={partner} onBack={() => {}} onInvite={() => {}} />,
    );
    expect(screen.getByTestId("partner-find-directory-detail-invite")).toHaveTextContent(
      "Предложить сотрудничество",
    );
  });

  it("renders specialization section with catalog line order products then services", () => {
    expect(
      searchResultDetailCatalogLine(
        base({ workingProductLabels: ["Плитка"], workingServiceLabels: ["Ремонт"] }),
      ),
    ).toBe("Товары: Плитка · Работы и услуги: Ремонт");
    render(
      <PartnerFindDirectoryDetailShell partner={base()} onBack={() => {}} onInvite={() => {}} />,
    );
    expect(screen.getByTestId("partner-find-directory-detail-profile-directions")).toBeInTheDocument();
    expect(screen.getByTestId("partner-find-directory-detail-catalog")).toHaveTextContent("Товары: Плитка");
    expect(screen.getByTestId("partner-find-directory-detail-stages")).toHaveTextContent("Этапы:");
  });
});
